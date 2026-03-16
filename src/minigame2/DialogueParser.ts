import { DialogueMessage, ImageSegment, Segment, TextSegment } from "./Types";

export class DialogueParser {
  
  public static parsePayload(payload: unknown): DialogueMessage[] {
    if (typeof payload !== "object" || payload === null) {
      return [];
    }

    const root = payload as Record<string, unknown>;
    const emojiMap = this.parseEmojiMap(root);
    const entries = this.findMessagesArray(payload);

    if (entries.length === 0) {
      return [];
    }

    return entries
      .map((entry, index) => this.parseMessage(entry, index, emojiMap))
      .filter((item): item is DialogueMessage => item !== null);
  }

  private static findMessagesArray(payload: unknown): unknown[] {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (typeof payload !== "object" || payload === null) {
      return [];
    }

    const root = payload as Record<string, unknown>;
    const keys = ["dialog", "dialogue", "messages", "items", "data"];

    for (const key of keys) {
      const value = root[key];
      if (Array.isArray(value)) {
        return value;
      }

      if (typeof value === "object" && value !== null) {
        const nested = value as Record<string, unknown>;
        if (Array.isArray(nested.messages)) {
          return nested.messages;
        }
        if (Array.isArray(nested.dialogue)) {
          return nested.dialogue;
        }
      }
    }

    return [];
  }

  private static parseEmojiMap(root: Record<string, unknown>): Map<string, string> {
    const map = new Map<string, string>();
    const candidates = [root.emojis, root.emoji, root.customEmojis, root.images, root.icons];

    for (const candidate of candidates) {
      if (!candidate) {
        continue;
      }

      if (Array.isArray(candidate)) {
        candidate.forEach((item) => {
          if (typeof item !== "object" || item === null) {
            return;
          }

          const row = item as Record<string, unknown>;
          const key = [row.id, row.key, row.name, row.code].find((value) => typeof value === "string") as
            | string
            | undefined;
          const url = [row.url, row.src, row.image, row.path].find((value) => typeof value === "string") as
            | string
            | undefined;

          if (key && url) {
            map.set(key, url);
          }
        });
        continue;
      }

      if (typeof candidate === "object" && candidate !== null) {
        Object.entries(candidate as Record<string, unknown>).forEach(([key, value]) => {
          if (typeof value === "string") {
            map.set(key, value);
          }
        });
      }
    }

    return map;
  }

  private static parseMessage(entry: unknown, index: number, emojiMap: Map<string, string>): DialogueMessage | null {
    if (typeof entry === "string") {
      return new DialogueMessage(`Character ${index % 2 === 0 ? "A" : "B"}`, this.parseTextSegments(entry, emojiMap));
    }

    if (typeof entry !== "object" || entry === null) {
      return null;
    }

    const row = entry as Record<string, unknown>;
    const speaker =
      (row.speaker as string) ||
      (row.character as string) ||
      (row.author as string) ||
      (row.name as string) ||
      `Character ${index % 2 === 0 ? "A" : "B"}`;

    if (Array.isArray(row.parts)) {
      const segments = this.parsePartsSegments(row.parts, emojiMap);
      if (segments.length > 0) {
        return new DialogueMessage(speaker, segments);
      }
    }

    const text = (row.text as string) || (row.message as string) || (row.content as string) || (row.value as string);
    if (typeof text === "string" && text.trim().length > 0) {
      return new DialogueMessage(speaker, this.parseTextSegments(text, emojiMap));
    }

    const url = (row.url as string) || (row.image as string) || (row.src as string);
    if (typeof url === "string") {
      return new DialogueMessage(speaker, [new ImageSegment(url, "emoji")]);
    }

    return null;
  }

  private static parsePartsSegments(parts: unknown[], emojiMap: Map<string, string>): Segment[] {
    const segments: Segment[] = [];

    parts.forEach((part) => {
      if (typeof part === "string") {
        segments.push(...this.parseTextSegments(part, emojiMap));
        return;
      }

      if (typeof part !== "object" || part === null) {
        return;
      }

      const row = part as Record<string, unknown>;
      const type = (row.type as string) || "text";

      if (type === "image" || type === "emoji") {
        const url = (row.url as string) || (row.src as string) || (row.image as string);
        if (typeof url === "string") {
          segments.push(new ImageSegment(url, (row.alt as string) || "emoji"));
        }
        return;
      }

      const text = (row.text as string) || (row.value as string);
      if (typeof text === "string") {
        segments.push(...this.parseTextSegments(text, emojiMap));
      }
    });

    return segments;
  }

  private static parseTextSegments(text: string, emojiMap: Map<string, string>): Segment[] {
    if (emojiMap.size === 0) {
      return [new TextSegment(text)];
    }

    const segments: Segment[] = [];
    const pattern = /:([a-zA-Z0-9_-]+):/g;
    let lastIndex = 0;

    for (let match = pattern.exec(text); match !== null; match = pattern.exec(text)) {
      const [rawToken, tokenId] = match;
      const start = match.index;

      if (start > lastIndex) {
        segments.push(new TextSegment(text.slice(lastIndex, start)));
      }

      const url = emojiMap.get(tokenId);
      if (url) {
        segments.push(new ImageSegment(url, tokenId));
      } else {
        segments.push(new TextSegment(rawToken));
      }

      lastIndex = start + rawToken.length;
    }

    if (lastIndex < text.length) {
      segments.push(new TextSegment(text.slice(lastIndex)));
    }

    return segments.length > 0 ? segments : [new TextSegment(text)];
  }
}


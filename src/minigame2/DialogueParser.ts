import { DialogueMessage, ImageSegment, type DialogueSide, Segment, TextSegment } from "./Types";

type SpeakerMeta = {
  avatarUrl?: string;
  side?: DialogueSide;
};

export class DialogueParser {
  public static parsePayload(payload: unknown): DialogueMessage[] {
    if (typeof payload !== "object" || payload === null) {
      return [];
    }

    const root = payload as Record<string, unknown>;
    const emojiMap = this.parseEmojiMap(root);
    const speakerMetaMap = this.parseSpeakerMetaMap(root);
    const entries = this.findMessagesArray(payload);

    if (entries.length === 0) {
      return [];
    }

    return entries
      .map((entry, index) => this.parseMessage(entry, index, emojiMap, speakerMetaMap))
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
    const candidates = [root.emojis, root.emojies, root.emoji, root.customEmojis, root.images, root.icons];

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
            map.set(key, this.normalizeImageUrl(url));
          }
        });
        continue;
      }

      if (typeof candidate === "object" && candidate !== null) {
        Object.entries(candidate as Record<string, unknown>).forEach(([key, value]) => {
          if (typeof value === "string") {
            map.set(key, this.normalizeImageUrl(value));
          }
        });
      }
    }

    return map;
  }

  private static parseSpeakerMetaMap(root: Record<string, unknown>): Map<string, SpeakerMeta> {
    const map = new Map<string, SpeakerMeta>();

    const objectMapCandidates = [root.characterAvatars, root.avatarsBySpeaker, root.speakerAvatars];
    for (const candidate of objectMapCandidates) {
      if (typeof candidate !== "object" || candidate === null || Array.isArray(candidate)) {
        continue;
      }

      Object.entries(candidate as Record<string, unknown>).forEach(([speaker, value]) => {
        const key = this.normalizeSpeakerKey(speaker);
        if (!key) {
          return;
        }

        const existing = map.get(key) ?? {};
        const url = this.readImageLike(value);
        const side = this.readSideLike(value);

        map.set(key, {
          avatarUrl: url ? this.normalizeImageUrl(url) : existing.avatarUrl,
          side: side ?? existing.side,
        });
      });
    }

    const listCandidates = [
      root.characters,
      root.participants,
      root.speakers,
      root.members,
      root.users,
      root.authors,
      root.avatars,
    ];

    for (const candidate of listCandidates) {
      if (!Array.isArray(candidate)) {
        continue;
      }

      candidate.forEach((item) => {
        if (typeof item !== "object" || item === null) {
          return;
        }

        const row = item as Record<string, unknown>;
        const rawSpeaker =
          (row.speaker as string) ||
          (row.name as string) ||
          (row.character as string) ||
          (row.author as string) ||
          (row.id as string);
        const key = this.normalizeSpeakerKey(rawSpeaker);
        if (!key) {
          return;
        }

        const url =
          this.readImageLike(row.avatarUrl) ||
          this.readImageLike(row.avatar) ||
          this.readImageLike(row.url) ||
          this.readImageLike(row.src) ||
          this.readImageLike(row.image) ||
          this.readImageLike(row.path) ||
          this.readImageLike(row.portrait) ||
          this.readImageLike(row.icon) ||
          this.readImageLike(row.profileImage) ||
          this.readImageLike(row.photo) ||
          this.readImageLike(row.picture);

        const side = this.readSideLike(row);
        const existing = map.get(key) ?? {};

        map.set(key, {
          avatarUrl: url ? this.normalizeImageUrl(url) : existing.avatarUrl,
          side: side ?? existing.side,
        });
      });
    }

    return map;
  }

  private static parseMessage(
    entry: unknown,
    index: number,
    emojiMap: Map<string, string>,
    speakerMetaMap: Map<string, SpeakerMeta>,
  ): DialogueMessage | null {
    if (typeof entry === "string") {
      const speaker = `Character ${index % 2 === 0 ? "A" : "B"}`;
      const meta = this.pickSpeakerMeta({}, speaker, speakerMetaMap, index);
      return new DialogueMessage(speaker, this.parseTextSegments(entry, emojiMap), meta.avatarUrl, meta.side);
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
    const meta = this.pickSpeakerMeta(row, speaker, speakerMetaMap, index);

    if (Array.isArray(row.parts)) {
      const segments = this.parsePartsSegments(row.parts, emojiMap);
      if (segments.length > 0) {
        return new DialogueMessage(speaker, segments, meta.avatarUrl, meta.side);
      }
    }

    const text = (row.text as string) || (row.message as string) || (row.content as string) || (row.value as string);
    if (typeof text === "string" && text.trim().length > 0) {
      return new DialogueMessage(speaker, this.parseTextSegments(text, emojiMap), meta.avatarUrl, meta.side);
    }

    const url = (row.url as string) || (row.image as string) || (row.src as string);
    if (typeof url === "string") {
      return new DialogueMessage(
        speaker,
        [new ImageSegment(this.normalizeImageUrl(url), "emoji")],
        meta.avatarUrl,
        meta.side,
      );
    }

    return null;
  }

  private static pickSpeakerMeta(
    row: Record<string, unknown>,
    speaker: string,
    speakerMetaMap: Map<string, SpeakerMeta>,
    index: number,
  ): SpeakerMeta {
    const directUrl =
      this.readImageLike(row.avatarUrl) ||
      this.readImageLike(row.avatar) ||
      this.readImageLike(row.urlAvatar) ||
      this.readImageLike(row.portrait) ||
      this.readImageLike(row.icon) ||
      this.readImageLike(row.profileImage) ||
      this.readImageLike(row.photo) ||
      this.readImageLike(row.picture);

    const directSide = this.readSideLike(row);

    const key = this.normalizeSpeakerKey(speaker);
    const mapped = key ? speakerMetaMap.get(key) : undefined;

    const avatarUrl = directUrl
      ? this.normalizeImageUrl(directUrl)
      : mapped?.avatarUrl;

    const side = directSide ?? mapped?.side ?? "right";

    return { avatarUrl, side };
  }

  private static readImageLike(value: unknown): string | undefined {
    if (typeof value === "string") {
      return value;
    }

    if (typeof value === "object" && value !== null) {
      const row = value as Record<string, unknown>;
      const nested = [row.url, row.src, row.image, row.path].find((item) => typeof item === "string") as
        | string
        | undefined;
      return nested;
    }

    return undefined;
  }

  private static readSideLike(value: unknown): DialogueSide | undefined {
    if (typeof value !== "object" || value === null) {
      return undefined;
    }

    const row = value as Record<string, unknown>;
    const raw = [row.position, row.side, row.align, row.alignment].find((item) => typeof item === "string") as
      | string
      | undefined;

    if (!raw) {
      return undefined;
    }

    const normalized = raw.trim().toLowerCase();
    if (normalized === "left" || normalized === "right") {
      return normalized;
    }

    return undefined;
  }

  private static normalizeSpeakerKey(value: string | undefined): string | null {
    if (typeof value !== "string") {
      return null;
    }

    const normalized = value.trim().toLowerCase();
    return normalized.length > 0 ? normalized : null;
  }

  private static normalizeImageUrl(rawUrl: string): string {
    try {
      const url = new URL(rawUrl);
      if (url.port === "82") {
        url.port = "";
      }
      return url.toString();
    } catch {
      return rawUrl.replace(":82/", "/");
    }
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
          segments.push(new ImageSegment(this.normalizeImageUrl(url), (row.alt as string) || "emoji"));
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


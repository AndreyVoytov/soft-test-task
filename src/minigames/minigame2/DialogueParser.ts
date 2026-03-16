import { z } from "zod";
import { DialogueMessage, ImageSegment, TextSegment, type DialogueSide } from "./Types";

const ApiSchema = z.object({
  dialogue: z.array(
    z.object({
      name: z.string(),
      text: z.string(),
    }),
  ),
  emojies: z
    .array(
      z.object({
        name: z.string(),
        url: z.string(),
      }),
    )
    .default([]),
  avatars: z
    .array(
      z.object({
        name: z.string(),
        url: z.string(),
        position: z.enum(["left", "right"]).optional(),
      }),
    )
    .default([]),
});

type ParsedApi = z.infer<typeof ApiSchema>;

export class DialogueParser {
  public static parsePayload(payload: unknown): DialogueMessage[] {
    const parsed = ApiSchema.safeParse(payload);
    if (!parsed.success) {
      return [];
    }

    return this.toMessages(parsed.data);
  }

  private static toMessages(data: ParsedApi): DialogueMessage[] {
    const emojiMap = new Map(
      data.emojies.map((item) => [this.normalizeKey(item.name), this.normalizeImageUrl(item.url)] as const),
    );

    const avatarMap = new Map(
      data.avatars.map((item) => [
        this.normalizeKey(item.name),
        {
          avatarUrl: this.normalizeImageUrl(item.url),
          side: item.position ?? "right",
        },
      ] as const),
    );

    return data.dialogue.map((item) => {
      const meta = avatarMap.get(this.normalizeKey(item.name));
      return new DialogueMessage(
        item.name,
        this.parseTextSegments(item.text, emojiMap),
        meta?.avatarUrl,
        (meta?.side ?? "right") as DialogueSide,
      );
    });
  }

  private static parseTextSegments(text: string, emojiMap: Map<string, string>): (TextSegment | ImageSegment)[] {
    const segments: (TextSegment | ImageSegment)[] = [];
    const pattern = /\{([a-zA-Z0-9_-]+)\}/g;
    let lastIndex = 0;

    for (let match = pattern.exec(text); match !== null; match = pattern.exec(text)) {
      const start = match.index;
      const token = this.normalizeKey(match[1] ?? "");

      if (start > lastIndex) {
        segments.push(new TextSegment(text.slice(lastIndex, start)));
      }

      const emojiUrl = emojiMap.get(token);
      if (emojiUrl) {
        segments.push(new ImageSegment(emojiUrl, token));
      }

      lastIndex = start + match[0].length;
    }

    if (lastIndex < text.length) {
      segments.push(new TextSegment(text.slice(lastIndex)));
    }

    return segments.length > 0 ? segments : [new TextSegment(text)];
  }

  private static normalizeKey(value: string): string {
    return value.trim().toLowerCase();
  }

  private static normalizeImageUrl(rawUrl: string): string {
    const url = new URL(rawUrl);
    if (url.port === "82") {
      url.port = "";
    }
    return url.toString();
  }
}

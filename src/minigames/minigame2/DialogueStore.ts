import { Assets } from "pixi.js";
import { Config } from "./Config";
import { DialogueParser } from "./DialogueParser";
import type { DialogueMessage } from "./Types";

export class DialogueStore {
  private static cachedMessages: DialogueMessage[] | null = null;

  static hasCache(): boolean {
    return this.cachedMessages !== null;
  }

  static async getMessages(): Promise<DialogueMessage[]> {
    if (this.cachedMessages) {
      return this.cachedMessages;
    }

    this.cachedMessages = await this.loadMessages();
    return this.cachedMessages;
  }

  private static async loadMessages(): Promise<DialogueMessage[]> {
    try {
      const response = await fetch(Config.endpoint);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload: unknown = await response.json();
      const parsed = DialogueParser.parsePayload(payload);
      const messages = parsed.length > 0 ? parsed : Config.fallbackMessages;

      await this.preloadImages(messages);
      return messages;
    } catch {
      return Config.fallbackMessages;
    }
  }

  private static async preloadImages(messages: DialogueMessage[]): Promise<void> {
    const urls = new Set<string>();

    for (const message of messages) {
      if (message.avatarUrl) {
        urls.add(message.avatarUrl);
      }

      for (const segment of message.segments) {
        if (segment.type === "image") {
          urls.add(segment.url);
        }
      }
    }

    await Promise.all(
      [...urls].map(async (url) => {
        try {
          await Assets.load({ src: url, loadParser: "loadTextures" });
        } catch (error) {
          console.warn("[minigame2] Failed to preload image", { url, error });
        }
      }),
    );
  }
}

import { Assets } from "pixi.js";
import { Config } from "./Config";
import { DialogueParser } from "./DialogueParser";
import type { DialogueMessage } from "./Types";

export class DialogueStore {
  private static cachedMessages: DialogueMessage[] | null = null;
  private static inFlight: Promise<DialogueMessage[]> | null = null;

  static hasCache(): boolean {
    return this.cachedMessages !== null;
  }

  static async getMessages(): Promise<DialogueMessage[]> {
    if (this.cachedMessages) {
      const hasAnyAvatar = this.cachedMessages.some(
        (message) => typeof message.avatarUrl === "string" && message.avatarUrl.length > 0,
      );
      const hasAnySide = this.cachedMessages.some(
        (message) => message.side === "left" || message.side === "right",
      );
      if (hasAnyAvatar && hasAnySide) {
        return this.cachedMessages;
      }
      this.cachedMessages = null;
    }

    if (this.inFlight) {
      return this.inFlight;
    }

    this.inFlight = this.loadMessages();

    try {
      const messages = await this.inFlight;
      this.cachedMessages = messages;
      return messages;
    } finally {
      this.inFlight = null;
    }
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
    const segmentUrls = messages
      .flatMap((message) => message.segments)
      .filter((segment) => segment.type === "image")
      .map((segment) => segment.url);

    const avatarUrls = messages
      .map((message) => message.avatarUrl)
      .filter((url): url is string => typeof url === "string" && url.length > 0);

    const allUrls = Array.from(new Set([...segmentUrls, ...avatarUrls]));

    await Promise.all(
      allUrls.map(async (url) => {
        try {
          await Assets.load({
            src: url,
            loadParser: "loadTextures",
          });
        } catch (error) {
          console.warn("[minigame2] Failed to preload image", { url, error });
          // Best effort preload. Sprite.from(url) will retry on render if needed.
        }
      }),
    );
  }
}


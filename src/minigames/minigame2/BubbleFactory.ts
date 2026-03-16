import { Container, Graphics, Sprite, Text, TextMetrics, TextStyle } from "pixi.js";
import { Config } from "./Config";
import type { DialogueMessage, Segment } from "./Types";

type BubbleLayout = {
  maxContentWidth: number;
  bubbleWidth: number;
  bubblePadding: number;
  bubbleRadius: number;
  speakerFontSize: number;
  textFontSize: number;
  emojiSize: number;
};

const COLORS = {
  speaker: 0x2c3e50,
  text: 0x1f2933,
  bubbleFill: 0xffffff,
  bubbleStroke: 0xced4da,
} as const;

export class BubbleFactory {
  static createDialogueBubble(message: DialogueMessage, layout: BubbleLayout): Container {
    const root = new Container();
    const bg = new Graphics();
    const content = new Container();

    const speaker = new Text(message.speaker, {
      fill: COLORS.speaker,
      fontFamily: "Arial",
      fontSize: layout.speakerFontSize,
      fontWeight: "700",
    });
    speaker.position.set(layout.bubblePadding, layout.bubblePadding);

    const textStyle = new TextStyle({
      fill: COLORS.text,
      fontFamily: "Arial",
      fontSize: layout.textFontSize,
      fontWeight: "500",
    });

    const contentTop = speaker.y + speaker.height + Math.max(6, Math.round(layout.bubblePadding * 0.6));
    const contentHeight = this.drawSegments(content, message.segments, layout.maxContentWidth, layout.emojiSize, textStyle);

    content.position.set(layout.bubblePadding, contentTop);

    const bubbleHeight = contentTop + contentHeight + layout.bubblePadding;
    bg.beginFill(COLORS.bubbleFill, 0.98);
    bg.lineStyle(2, COLORS.bubbleStroke, 1);
    bg.drawRoundedRect(0, 0, layout.bubbleWidth, bubbleHeight, layout.bubbleRadius);
    bg.endFill();

    root.addChild(bg, speaker, content);
    return root;
  }

  private static drawSegments(
    target: Container,
    segments: Segment[],
    maxWidth: number,
    emojiSize: number,
    textStyle: TextStyle,
  ): number {
    const lineHeight = Math.max(emojiSize, Math.round((textStyle.fontSize as number) * Config.lineHeightRatio));

    let x = 0;
    let y = 0;

    const newLine = (): void => {
      x = 0;
      y += lineHeight;
    };

    const pushText = (value: string): void => {
      if (!value) {
        return;
      }

      const tokens = value.split(/(\s+)/).filter(Boolean);
      for (const token of tokens) {
        const isSpace = /^\s+$/.test(token);
        const tokenWidth = TextMetrics.measureText(token, textStyle).width;

        if (!isSpace && x > 0 && x + tokenWidth > maxWidth) {
          newLine();
        }

        if (isSpace && x === 0) {
          continue;
        }

        const text = new Text(token, textStyle);
        text.position.set(x, y + (lineHeight - text.height) * 0.5);
        target.addChild(text);
        x += tokenWidth;
      }
    };

    for (const segment of segments) {
      if (segment.type === "text") {
        pushText(segment.text);
        continue;
      }

      if (x > 0 && x + emojiSize > maxWidth) {
        newLine();
      }

      const sprite = Sprite.from(segment.url);
      sprite.width = emojiSize;
      sprite.height = emojiSize;
      sprite.position.set(x, y + (lineHeight - emojiSize) * 0.5);
      target.addChild(sprite);
      x += emojiSize;
    }

    return y + lineHeight;
  }
}

import { Container, Graphics, Sprite, Text, TextMetrics, TextStyle } from "pixi.js";
import { Config } from "./Config";
import type { DialogueMessage, Segment } from "./Types";

export class BubbleFactory {
  private static readonly labelStyle = new TextStyle({
    fill: 0x2c3e50,
    fontFamily: "Arial",
    fontSize: 16,
    fontWeight: "700",
  });

  static createDialogueBubble(
    message: DialogueMessage,
    params: {
      maxContentWidth: number;
      bubbleWidth: number;
      bubblePadding: number;
      bubbleRadius: number;
      speakerFontSize: number;
      textFontSize: number;
      emojiSize: number;
    },
  ): Container {
    const root = new Container();
    const bg = new Graphics();
    const content = new Container();

    const speaker = new Text(message.speaker, {
      ...this.labelStyle,
      fontSize: params.speakerFontSize,
    });
    speaker.position.set(params.bubblePadding, params.bubblePadding);

    const textStyle = new TextStyle({
      fill: 0x1f2933,
      fontFamily: "Arial",
      fontSize: params.textFontSize,
      fontWeight: "500",
    });

    const speakerGap = Math.max(6, Math.round(params.bubblePadding * 0.6));
    const contentTop = speaker.y + speaker.height + speakerGap;

    const contentHeight = this.drawSegments(content, message.segments, {
      maxWidth: params.maxContentWidth,
      textStyle,
      emojiSize: params.emojiSize,
    });

    content.position.set(params.bubblePadding, contentTop);

    const bubbleHeight = contentTop + contentHeight + params.bubblePadding;
    bg.beginFill(0xffffff, 0.95);
    bg.lineStyle(2, 0xced4da, 1);
    bg.drawRoundedRect(0, 0, params.bubbleWidth, bubbleHeight, params.bubbleRadius);
    bg.endFill();

    root.addChild(bg, speaker, content);
    return root;
  }

  private static drawSegments(
    target: Container,
    segments: Segment[],
    params: {
      maxWidth: number;
      textStyle: TextStyle;
      emojiSize: number;
    },
  ): number {
    const lineHeight = Math.max(
      params.emojiSize,
      Math.round((params.textStyle.fontSize as number) * Config.lineHeightRatio),
    );

    let x = 0;
    let y = 0;

    const newLine = (): void => {
      x = 0;
      y += lineHeight;
    };

    const pushText = (textPart: string): void => {
      if (textPart.length === 0) {
        return;
      }

      const tokens = textPart.split(/(\s+)/).filter((token) => token.length > 0);
      for (const token of tokens) {
        const tokenWidth = TextMetrics.measureText(token, params.textStyle).width;
        const isSpace = /^\s+$/.test(token);

        if (!isSpace && x > 0 && x + tokenWidth > params.maxWidth) {
          newLine();
        }

        if (isSpace && x === 0) {
          continue;
        }

        const text = new Text(token, params.textStyle);
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

      const size = params.emojiSize;
      if (x > 0 && x + size > params.maxWidth) {
        newLine();
      }

      const sprite = Sprite.from(segment.url);
      sprite.width = size;
      sprite.height = size;
      sprite.position.set(x, y + (lineHeight - size) * 0.5);
      target.addChild(sprite);
      x += size;
    }

    return y + lineHeight;
  }
}


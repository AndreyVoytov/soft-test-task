import {
  Container,
  Graphics,
  Rectangle,
  Text,
  type FederatedPointerEvent,
  type FederatedWheelEvent,
} from "pixi.js";
import { BubbleFactory } from "../minigame2/BubbleFactory";
import { Config } from "../minigame2/Config";
import { DialogueParser } from "../minigame2/DialogueParser";
import type { DialogueMessage } from "../minigame2/Types";
import { AdaptiveScreen } from "./AdaptiveScreen";

export class Minigame2Screen extends AdaptiveScreen {
  private readonly title: Text;
  private readonly progress: Text;
  private readonly status: Text;
  private readonly viewport: Container;
  private readonly viewportMask: Graphics;
  private readonly bubblesRoot: Container;
  private readonly scrollTrack: Graphics;
  private readonly scrollThumb: Graphics;

  private messages: DialogueMessage[] = [];
  private visibleCount = 0;
  private scrollTop = 0;
  private scrollMax = 0;
  private contentHeight = 0;

  private viewportWidth = 0;
  private viewportHeight = 0;

  private viewportX = 0;
  private viewportY = 0;
  private viewportContentWidth = 0;
  private viewportContentHeight = 0;

  private bubbleWidth = 0;
  private bubblePadding = 0;
  private bubbleRadius = 0;
  private bubbleGap = 0;
  private speakerFontSize = 0;
  private textFontSize = 0;
  private emojiSize = 0;

  private scrollBarWidth = 0;
  private scrollBarGap = 0;
  private scrollThumbY = 0;
  private scrollThumbHeight = 0;

  private dragMode: "none" | "thumb" | "viewport" = "none";
  private dragPointerId: number | null = null;
  private dragStartY = 0;
  private dragStartScrollTop = 0;
  private dragThumbOffsetY = 0;
  private dragMoved = false;
  private ignoreNextTap = false;

  constructor() {
    super();

    this.title = new Text("Magic Words", {
      fill: 0x8f8f8f,
      fontFamily: "Arial",
      fontSize: 36,
      fontWeight: "700",
    });
    this.title.anchor.set(0.5, 0);

    this.progress = new Text("", {
      fill: 0x8f8f8f,
      fontFamily: "Arial",
      fontSize: 16,
      fontWeight: "600",
      align: "center",
    });
    this.progress.anchor.set(0.5, 0);

    this.status = new Text("Loading dialogue...", {
      fill: 0x8f8f8f,
      fontFamily: "Arial",
      fontSize: 22,
      fontWeight: "600",
      align: "center",
    });
    this.status.anchor.set(0.5);

    this.viewport = new Container();
    this.viewportMask = new Graphics();
    this.bubblesRoot = new Container();
    this.scrollTrack = new Graphics();
    this.scrollThumb = new Graphics();

    this.viewport.addChild(this.bubblesRoot, this.viewportMask);
    this.viewport.mask = this.viewportMask;

    this.eventMode = "static";
    this.on("pointertap", this.handleTap);
    this.on("wheel", this.handleWheel);
    this.on("pointerdown", this.handlePointerDown);
    this.on("pointermove", this.handlePointerMove);
    this.on("pointerup", this.handlePointerUp);
    this.on("pointerupoutside", this.handlePointerUp);
    this.on("pointercancel", this.handlePointerUp);

    this.addChild(this.title, this.progress, this.viewport, this.scrollTrack, this.scrollThumb, this.status);

    void this.loadDialogue();
  }

  resize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;

    const minSide = Math.min(width, height);
    const sidePadding = Math.round(minSide * Config.sidePaddingRatio);
    const topPadding = Math.round(minSide * Config.topPaddingRatio);

    this.title.style.fontSize = Math.max(20, Math.round(minSide * 0.06));
    this.title.position.set(width * 0.5, topPadding);

    this.progress.style.fontSize = Math.max(14, Math.round(minSide * 0.03));
    this.progress.position.set(
      width * 0.5,
      this.title.y + this.title.height + Math.max(4, Math.round(minSide * 0.008)),
    );

    const viewportTop = this.progress.y + this.progress.height + topPadding;
    const viewportHeight = Math.max(40, height - viewportTop - topPadding);

    this.bubbleGap = Math.max(Config.minGap, Math.round(minSide * Config.bubbleGapRatio));
    this.bubblePadding = Math.max(Config.minPadding, Math.round(minSide * Config.bubblePaddingRatio));
    this.bubbleRadius = Math.round(minSide * Config.bubbleRadiusRatio);
    this.speakerFontSize = Math.max(Config.minSpeakerSize, Math.round(minSide * Config.speakerSizeRatio));
    this.textFontSize = Math.max(Config.minTextSize, Math.round(minSide * Config.textSizeRatio));
    this.emojiSize = Math.max(Config.minEmojiSize, Math.round(minSide * Config.emojiSizeRatio));

    this.scrollBarWidth = Math.max(6, Math.round(minSide * 0.012));
    this.scrollBarGap = Math.max(6, Math.round(minSide * 0.008));

    this.viewportX = sidePadding;
    this.viewportY = viewportTop;
    this.viewportContentHeight = viewportHeight;
    this.viewportContentWidth = Math.max(
      120,
      width - sidePadding * 2 - this.scrollBarWidth - this.scrollBarGap,
    );
    this.bubbleWidth = Math.min(Math.round(minSide * Config.bubbleWidthRatio), this.viewportContentWidth);

    this.viewport.position.set(this.viewportX, this.viewportY);
    this.viewportMask
      .clear()
      .beginFill(0xffffff, 1)
      .drawRect(0, 0, this.viewportContentWidth, this.viewportContentHeight)
      .endFill();

    this.status.style.fontSize = Math.max(16, Math.round(minSide * 0.04));
    this.status.position.set(width * 0.5, viewportTop + viewportHeight * 0.5);
    this.hitArea = new Rectangle(0, 0, width, height);

    if (this.messages.length === 0) {
      this.viewport.visible = false;
      this.progress.visible = false;
      this.scrollTrack.visible = false;
      this.scrollThumb.visible = false;
      this.status.visible = true;
      return;
    }

    this.viewport.visible = true;
    this.progress.visible = true;
    this.rebuildVisibleBubbles(false);
    this.refreshStatus();
  }

  private rebuildVisibleBubbles(stickToBottom: boolean): void {
    const leftX = 0;
    const rightX = this.viewportContentWidth - this.bubbleWidth;
    let currentY = 0;

    this.bubblesRoot.removeChildren().forEach((child) => child.destroy({ children: true }));

    const visibleMessages = this.messages.slice(0, this.visibleCount);
    visibleMessages.forEach((message, index) => {
      const bubble = BubbleFactory.createDialogueBubble(message, {
        maxContentWidth: this.bubbleWidth - this.bubblePadding * 2,
        bubbleWidth: this.bubbleWidth,
        bubblePadding: this.bubblePadding,
        bubbleRadius: this.bubbleRadius,
        speakerFontSize: this.speakerFontSize,
        textFontSize: this.textFontSize,
        emojiSize: this.emojiSize,
      });

      bubble.position.set(index % 2 === 0 ? leftX : rightX, currentY);
      this.bubblesRoot.addChild(bubble);
      currentY += bubble.height + this.bubbleGap;
    });

    this.contentHeight = Math.max(0, currentY - this.bubbleGap);
    this.scrollMax = Math.max(0, this.contentHeight - this.viewportContentHeight);
    if (stickToBottom) {
      this.scrollTop = this.scrollMax;
    } else {
      this.scrollTop = Math.min(this.scrollTop, this.scrollMax);
    }

    this.applyScrollPosition();
    this.drawScrollbar();
  }

  private applyScrollPosition(): void {
    if (this.scrollMax <= 0) {
      this.bubblesRoot.y = this.viewportContentHeight - this.contentHeight;
      return;
    }

    this.bubblesRoot.y = -this.scrollTop;
  }

  private drawScrollbar(): void {
    const hasOverflow = this.scrollMax > 0;
    this.scrollTrack.visible = hasOverflow;
    this.scrollThumb.visible = hasOverflow;
    if (!hasOverflow) {
      return;
    }

    const x = this.viewportX + this.viewportContentWidth + this.scrollBarGap;
    const y = this.viewportY;
    const h = this.viewportContentHeight;
    const w = this.scrollBarWidth;

    this.scrollTrack.clear();
    this.scrollTrack.beginFill(0x111111, 0.18);
    this.scrollTrack.drawRoundedRect(x, y, w, h, w * 0.5);
    this.scrollTrack.endFill();

    const thumbHeight = Math.max(26, (h * h) / this.contentHeight);
    const thumbTravel = h - thumbHeight;
    const thumbY = y + (this.scrollTop / this.scrollMax) * thumbTravel;
    this.scrollThumbY = thumbY;
    this.scrollThumbHeight = thumbHeight;

    this.scrollThumb.clear();
    this.scrollThumb.beginFill(0xffffff, 0.75);
    this.scrollThumb.drawRoundedRect(x, thumbY, w, thumbHeight, w * 0.5);
    this.scrollThumb.endFill();
  }

  private refreshStatus(): void {
    if (this.messages.length === 0) {
      this.progress.visible = false;
      this.status.visible = true;
      this.status.text = "No dialogue available";
      return;
    }

    this.progress.visible = true;
    this.progress.text = `${Math.min(this.visibleCount, this.messages.length)}/${this.messages.length}`;

    if (this.visibleCount === 0) {
      this.status.visible = true;
      this.status.text = "Click to start dialogue";
      return;
    }

    this.status.visible = false;
    this.status.text = "";
  }

  private handleTap = (): void => {
    if (this.ignoreNextTap) {
      this.ignoreNextTap = false;
      return;
    }

    if (this.messages.length === 0 || this.visibleCount >= this.messages.length) {
      return;
    }

    this.visibleCount += 1;
    this.rebuildVisibleBubbles(true);
    this.refreshStatus();
  };

  private handleWheel = (event: FederatedWheelEvent): void => {
    if (this.scrollMax <= 0) {
      return;
    }

    const gx = event.global.x;
    const gy = event.global.y;
    const isOverViewport =
      gx >= this.viewportX &&
      gx <= this.viewportX + this.viewportContentWidth &&
      gy >= this.viewportY &&
      gy <= this.viewportY + this.viewportContentHeight;

    if (!isOverViewport) {
      return;
    }

    const next = this.scrollTop + event.deltaY;
    this.scrollTop = Math.max(0, Math.min(this.scrollMax, next));
    this.applyScrollPosition();
    this.drawScrollbar();
    event.stopPropagation();
  };

  private handlePointerDown = (event: FederatedPointerEvent): void => {
    if (this.scrollMax <= 0) {
      return;
    }

    const gx = event.global.x;
    const gy = event.global.y;
    if (this.isPointInThumb(gx, gy)) {
      this.dragMode = "thumb";
      this.dragPointerId = event.pointerId;
      this.dragThumbOffsetY = gy - this.scrollThumbY;
      this.dragMoved = false;
      return;
    }

    if (this.isPointInViewport(gx, gy)) {
      this.dragMode = "viewport";
      this.dragPointerId = event.pointerId;
      this.dragStartY = gy;
      this.dragStartScrollTop = this.scrollTop;
      this.dragMoved = false;
    }
  };

  private handlePointerMove = (event: FederatedPointerEvent): void => {
    if (this.dragMode === "none" || this.dragPointerId !== event.pointerId) {
      return;
    }

    if (this.dragMode === "thumb") {
      const trackTop = this.viewportY;
      const trackHeight = this.viewportContentHeight;
      const thumbTravel = trackHeight - this.scrollThumbHeight;
      if (thumbTravel <= 0) {
        return;
      }

      const rawThumbTop = event.global.y - this.dragThumbOffsetY;
      const clampedThumbTop = Math.max(trackTop, Math.min(trackTop + thumbTravel, rawThumbTop));
      const ratio = (clampedThumbTop - trackTop) / thumbTravel;
      this.scrollTop = ratio * this.scrollMax;
      this.applyScrollPosition();
      this.drawScrollbar();
      this.dragMoved = true;
      return;
    }

    const delta = event.global.y - this.dragStartY;
    if (Math.abs(delta) > 2) {
      this.dragMoved = true;
    }
    const next = this.dragStartScrollTop - delta;
    this.scrollTop = Math.max(0, Math.min(this.scrollMax, next));
    this.applyScrollPosition();
    this.drawScrollbar();
  };

  private handlePointerUp = (event: FederatedPointerEvent): void => {
    if (this.dragMode === "none" || this.dragPointerId !== event.pointerId) {
      return;
    }

    if (this.dragMoved) {
      this.ignoreNextTap = true;
    }

    this.dragMode = "none";
    this.dragPointerId = null;
    this.dragMoved = false;
  };

  private isPointInViewport(x: number, y: number): boolean {
    return (
      x >= this.viewportX &&
      x <= this.viewportX + this.viewportContentWidth &&
      y >= this.viewportY &&
      y <= this.viewportY + this.viewportContentHeight
    );
  }

  private isPointInThumb(x: number, y: number): boolean {
    const thumbX = this.viewportX + this.viewportContentWidth + this.scrollBarGap;
    return (
      x >= thumbX &&
      x <= thumbX + this.scrollBarWidth &&
      y >= this.scrollThumbY &&
      y <= this.scrollThumbY + this.scrollThumbHeight
    );
  }

  private async loadDialogue(): Promise<void> {
    try {
      const response = await fetch(Config.endpoint);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload: unknown = await response.json();
      const parsed = DialogueParser.parsePayload(payload);
      this.messages = parsed.length > 0 ? parsed : Config.fallbackMessages;
      this.visibleCount = 0;
      this.scrollTop = 0;
    } catch {
      this.messages = Config.fallbackMessages;
      this.visibleCount = 0;
      this.scrollTop = 0;
    }

    if (!this.destroyed) {
      this.resize(this.viewportWidth, this.viewportHeight);
    }
  }

  override destroy(options?: Parameters<Container["destroy"]>[0]): void {
    this.off("pointertap", this.handleTap);
    this.off("wheel", this.handleWheel);
    this.off("pointerdown", this.handlePointerDown);
    this.off("pointermove", this.handlePointerMove);
    this.off("pointerup", this.handlePointerUp);
    this.off("pointerupoutside", this.handlePointerUp);
    this.off("pointercancel", this.handlePointerUp);
    super.destroy(options);
  }
}




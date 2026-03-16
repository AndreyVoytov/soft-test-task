import {
  Container,
  Graphics,
  Rectangle,
  Sprite,
  type FederatedPointerEvent,
  type FederatedWheelEvent,
} from "pixi.js";
import { BubbleFactory } from "./BubbleFactory";
import type { DialogueMessage } from "./Types";

type Layout = {
  screenWidth: number;
  viewportX: number;
  viewportY: number;
  viewportWidth: number;
  viewportHeight: number;
  viewportInnerInsetY: number;
  bubbleWidth: number;
  bubblePadding: number;
  bubbleRadius: number;
  bubbleGap: number;
  speakerFontSize: number;
  textFontSize: number;
  emojiSize: number;
  avatarSize: number;
  avatarGap: number;
  scrollBarWidth: number;
};

const INITIAL_LAYOUT: Layout = {
  screenWidth: 0,
  viewportX: 0,
  viewportY: 0,
  viewportWidth: 0,
  viewportHeight: 0,
  viewportInnerInsetY: 0,
  bubbleWidth: 0,
  bubblePadding: 0,
  bubbleRadius: 0,
  bubbleGap: 0,
  speakerFontSize: 0,
  textFontSize: 0,
  emojiSize: 0,
  avatarSize: 128,
  avatarGap: 0,
  scrollBarWidth: 6,
};

export class DialogueViewport extends Container {
  private readonly viewport: Container;
  private readonly viewportMask: Graphics;
  private readonly bubblesRoot: Container;
  private readonly scrollTrack: Graphics;
  private readonly scrollThumb: Graphics;

  private layout: Layout = { ...INITIAL_LAYOUT };
  private messages: DialogueMessage[] = [];
  private visibleCount = 0;

  private scrollTop = 0;
  private scrollMax = 0;
  private contentHeight = 0;
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

    this.viewport = new Container();
    this.viewportMask = new Graphics();
    this.bubblesRoot = new Container();
    this.scrollTrack = new Graphics();
    this.scrollThumb = new Graphics();

    this.viewport.addChild(this.bubblesRoot, this.viewportMask);
    this.viewport.mask = this.viewportMask;

    this.addChild(this.viewport, this.scrollTrack, this.scrollThumb);
  }

  resize(layout: Layout): void {
    this.layout = layout;

    this.viewport.position.set(layout.viewportX, layout.viewportY);
    this.viewport.hitArea = new Rectangle(0, 0, layout.viewportWidth, layout.viewportHeight);

    this.viewportMask.clear();
    this.viewportMask.beginFill(0xffffff, 1);
    this.viewportMask.drawRect(0, 0, layout.viewportWidth, layout.viewportHeight);
    this.viewportMask.endFill();

    this.rebuild(false);
  }

  setData(messages: DialogueMessage[], visibleCount: number, stickToBottom: boolean): void {
    this.messages = messages;
    this.visibleCount = visibleCount;
    this.rebuild(stickToBottom);
  }

  setViewportVisible(visible: boolean): void {
    this.viewport.visible = visible;
    const hasOverflow = visible && this.scrollMax > 0;
    this.scrollTrack.visible = hasOverflow;
    this.scrollThumb.visible = hasOverflow;
  }

  consumeTapSuppression(): boolean {
    if (!this.ignoreNextTap) {
      return false;
    }

    this.ignoreNextTap = false;
    return true;
  }

  handleWheel(event: FederatedWheelEvent): boolean {
    if (this.scrollMax <= 0 || !this.isPointInViewport(event.global.x, event.global.y)) {
      return false;
    }

    this.scrollTop = this.clampScrollTop(this.scrollTop + event.deltaY);
    this.applyScrollPosition();
    this.drawScrollbar();
    event.stopPropagation();
    return true;
  }

  handlePointerDown(event: FederatedPointerEvent): void {
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
  }

  handlePointerMove(event: FederatedPointerEvent): void {
    if (this.dragMode === "none" || this.dragPointerId !== event.pointerId) {
      return;
    }

    if (this.dragMode === "thumb") {
      const thumbTravel = this.layout.viewportHeight - this.scrollThumbHeight;
      if (thumbTravel <= 0) {
        return;
      }

      const trackTop = this.layout.viewportY;
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

    this.scrollTop = this.clampScrollTop(this.dragStartScrollTop - delta);
    this.applyScrollPosition();
    this.drawScrollbar();
  }

  handlePointerUp(event: FederatedPointerEvent): void {
    if (this.dragMode === "none" || this.dragPointerId !== event.pointerId) {
      return;
    }

    if (this.dragMoved) {
      this.ignoreNextTap = true;
    }

    this.dragMode = "none";
    this.dragPointerId = null;
    this.dragMoved = false;
  }

  private rebuild(stickToBottom: boolean): void {
    const {
      bubbleWidth,
      bubblePadding,
      bubbleRadius,
      bubbleGap,
      speakerFontSize,
      textFontSize,
      emojiSize,
      avatarSize,
      avatarGap,
      viewportInnerInsetY,
      viewportWidth,
      viewportHeight,
    } = this.layout;

    let currentY = viewportInnerInsetY;
    this.bubblesRoot.removeChildren().forEach((child) => child.destroy({ children: true }));

    for (const message of this.messages.slice(0, this.visibleCount)) {
      const isLeft = message.side === "left";
      const bubble = BubbleFactory.createDialogueBubble(message, {
        maxContentWidth: bubbleWidth - bubblePadding * 2,
        bubbleWidth,
        bubblePadding,
        bubbleRadius,
        speakerFontSize,
        textFontSize,
        emojiSize,
      });

      const avatar = this.createAvatarNode(message.avatarUrl, avatarSize);
      const avatarOffset = avatarSize + avatarGap;
      const rowHeight = Math.max(bubble.height, avatarSize);

      bubble.position.set(
        isLeft ? avatarOffset : viewportWidth - avatarOffset - bubbleWidth,
        currentY + (rowHeight - bubble.height) * 0.5,
      );

      if (avatar) {
        avatar.position.set(
          isLeft ? 0 : viewportWidth - avatarSize,
          currentY + (rowHeight - avatarSize) * 0.5,
        );
        this.bubblesRoot.addChild(avatar);
      }

      this.bubblesRoot.addChild(bubble);
      currentY += rowHeight + bubbleGap;
    }

    this.contentHeight = Math.max(viewportInnerInsetY * 2, currentY - bubbleGap + viewportInnerInsetY);
    this.scrollMax = Math.max(0, this.contentHeight - viewportHeight);
    this.scrollTop = stickToBottom ? this.scrollMax : Math.min(this.scrollTop, this.scrollMax);

    this.applyScrollPosition();
    this.drawScrollbar();
  }

  private createAvatarNode(avatarUrl: string | undefined, avatarSize: number): Container | null {
    if (!avatarUrl) {
      return null;
    }

    const root = new Container();
    const radius = avatarSize * 0.5;

    const sprite = Sprite.from(avatarUrl);
    sprite.width = avatarSize;
    sprite.height = avatarSize;

    const mask = new Graphics();
    mask.beginFill(0xffffff, 1);
    mask.drawCircle(radius, radius, radius);
    mask.endFill();

    const border = new Graphics();
    border.lineStyle(2, 0xffffff, 0.95);
    border.drawCircle(radius, radius, radius - 1);

    sprite.mask = mask;
    root.addChild(sprite, mask, border);
    return root;
  }

  private applyScrollPosition(): void {
    if (this.scrollMax <= 0) {
      this.bubblesRoot.y = this.layout.viewportHeight - this.contentHeight;
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

    const rightInset = Math.max(4, Math.round(this.layout.screenWidth * 0.006));
    const x = this.layout.screenWidth - this.layout.scrollBarWidth - rightInset;
    const y = this.layout.viewportY;
    const h = this.layout.viewportHeight;
    const w = this.layout.scrollBarWidth;

    this.scrollTrack.clear();
    this.scrollTrack.beginFill(0xffffff, 0.75);
    this.scrollTrack.drawRoundedRect(x, y, w, h, w * 0.5);
    this.scrollTrack.endFill();

    const thumbHeight = Math.max(26, (h * h) / this.contentHeight);
    const thumbTravel = h - thumbHeight;
    const thumbY = y + (this.scrollTop / this.scrollMax) * thumbTravel;

    this.scrollThumbY = thumbY;
    this.scrollThumbHeight = thumbHeight;

    this.scrollThumb.clear();
    this.scrollThumb.beginFill(0x111111, 0.15);
    this.scrollThumb.drawRoundedRect(x, thumbY, w, thumbHeight, w * 0.5);
    this.scrollThumb.endFill();
  }

  private clampScrollTop(value: number): number {
    return Math.max(0, Math.min(this.scrollMax, value));
  }

  private isPointInViewport(x: number, y: number): boolean {
    return (
      x >= this.layout.viewportX &&
      x <= this.layout.viewportX + this.layout.viewportWidth &&
      y >= this.layout.viewportY &&
      y <= this.layout.viewportY + this.layout.viewportHeight
    );
  }

  private isPointInThumb(x: number, y: number): boolean {
    const rightInset = Math.max(4, Math.round(this.layout.screenWidth * 0.006));
    const thumbX = this.layout.screenWidth - this.layout.scrollBarWidth - rightInset;

    return (
      x >= thumbX &&
      x <= thumbX + this.layout.scrollBarWidth &&
      y >= this.scrollThumbY &&
      y <= this.scrollThumbY + this.scrollThumbHeight
    );
  }
}

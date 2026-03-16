import {
  Container,
  Graphics,
  Rectangle,
  Text,
  type FederatedPointerEvent,
  type FederatedWheelEvent,
} from "pixi.js";
import { Spinner } from "../components/Spinner";
import { Config } from "../minigames/minigame2/Config";
import { DialogueStore } from "../minigames/minigame2/DialogueStore";
import { Header } from "../minigames/minigame2/Header";
import { DialogueViewport } from "../minigames/minigame2/DialogueViewport";
import type { DialogueMessage } from "../minigames/minigame2/Types";
import { AdaptiveScreen } from "./AdaptiveScreen";

export class Minigame2Screen extends AdaptiveScreen {
  private readonly onBack: () => void;
  private readonly spinner: Spinner;
  private readonly status: Text;
  private readonly header: Header;
  private readonly dialogueBg: Graphics;
  private readonly dialogueViewport: DialogueViewport;

  private messages: DialogueMessage[] = [];
  private visibleCount = 0;
  private isLoading = false;
  private viewportWidth = 0;
  private viewportHeight = 0;

  constructor(params?: { onBack?: () => void }) {
    super();

    this.onBack = params?.onBack ?? (() => {});
    this.spinner = new Spinner();

    this.status = new Text("Loading dialogue...", {
      fill: 0x8f8f8f,
      fontFamily: "Arial",
      fontSize: 22,
      fontWeight: "600",
      align: "center",
    });
    this.status.anchor.set(0.5);

    this.header = new Header({ onBack: this.onBack });
    this.dialogueBg = new Graphics();
    this.dialogueViewport = new DialogueViewport();

    this.eventMode = "static";
    this.on("pointertap", this.handleTap);
    this.on("wheel", this.handleWheel);
    this.on("pointerdown", this.handlePointerDown);
    this.on("pointermove", this.handlePointerMove);
    this.on("pointerup", this.handlePointerUp);
    this.on("pointerupoutside", this.handlePointerUp);
    this.on("pointercancel", this.handlePointerUp);

    this.addChild(this.header, this.dialogueBg, this.dialogueViewport, this.status, this.spinner);

    void this.loadDialogue();
  }

  resize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;

    const minSide = Math.min(width, height);
    const sidePadding = Math.round(width * 0.03);
    const scrollAreaInset = Math.round(width * 0.029);

    this.header.resize(width, height);

    const viewportTop = this.header.contentTop;
    const viewportHeight = Math.max(40, height - viewportTop);

    this.dialogueBg.clear();
    this.dialogueBg.beginFill(0xe3eff4, 1);
    this.dialogueBg.drawRect(0, viewportTop, width, Math.max(0, height - viewportTop));
    this.dialogueBg.endFill();

    this.spinner.resize(width, height, 0);

    const bubbleGap = Math.max(Config.minGap, Math.round(minSide * Config.bubbleGapRatio));
    const bubblePadding = Math.max(Config.minPadding, Math.round(minSide * Config.bubblePaddingRatio));
    const avatarSize = 128;
    const avatarGap = Math.max(8, Math.round(minSide * 0.015));
    const viewportWidth = Math.max(120, width - sidePadding * 2);
    const maxBubbleWidth = Math.max(80, viewportWidth - avatarSize - avatarGap);

    this.dialogueViewport.resize({
      screenWidth: width,
      viewportX: sidePadding,
      viewportY: viewportTop,
      viewportWidth,
      viewportHeight,
      viewportInnerInsetY: scrollAreaInset,
      bubbleWidth: Math.min(Math.round(minSide * Config.bubbleWidthRatio), maxBubbleWidth),
      bubblePadding,
      bubbleRadius: Math.round(minSide * Config.bubbleRadiusRatio),
      bubbleGap,
      speakerFontSize: Math.max(Config.minSpeakerSize, Math.round(minSide * Config.speakerSizeRatio)),
      textFontSize: Math.max(Config.minTextSize, Math.round(minSide * Config.textSizeRatio)),
      emojiSize: Math.max(Config.minEmojiSize, Math.round(minSide * Config.emojiSizeRatio)),
      avatarSize,
      avatarGap,
      scrollBarWidth: Math.max(6, Math.round(minSide * 0.012)),
    });

    this.status.style.fontSize = Math.max(16, Math.round(minSide * 0.04));
    this.status.position.set(width * 0.5, viewportTop + viewportHeight * 0.5);
    this.hitArea = new Rectangle(0, 0, width, height);

    this.applyState();
  }

  private applyState(): void {
    if (this.isLoading) {
      this.dialogueViewport.setViewportVisible(false);
      this.header.setProgressVisible(false);
      this.status.visible = true;
      this.status.text = "Loading dialogue...";
      this.spinner.visible = true;
      return;
    }

    this.spinner.visible = false;

    if (this.messages.length === 0) {
      this.dialogueViewport.setViewportVisible(false);
      this.header.setProgressVisible(false);
      this.status.visible = true;
      this.status.text = "No dialogue available";
      return;
    }

    this.dialogueViewport.setViewportVisible(true);
    this.header.setProgressVisible(true);
    this.dialogueViewport.setData(this.messages, this.visibleCount, false);
    this.refreshStatus();
  }

  private refreshStatus(): void {
    this.header.setProgress(this.visibleCount, this.messages.length);

    if (this.visibleCount === 0) {
      this.status.visible = true;
      this.status.text = "Click to start dialogue";
      return;
    }

    this.status.visible = false;
    this.status.text = "";
  }

  private handleTap = (): void => {
    if (this.dialogueViewport.consumeTapSuppression()) {
      return;
    }

    if (this.isLoading || this.messages.length === 0 || this.visibleCount >= this.messages.length) {
      return;
    }

    this.visibleCount += 1;
    this.dialogueViewport.setData(this.messages, this.visibleCount, true);
    this.refreshStatus();
  };

  private handleWheel = (event: FederatedWheelEvent): void => {
    if (!this.isLoading) {
      this.dialogueViewport.handleWheel(event);
    }
  };

  private handlePointerDown = (event: FederatedPointerEvent): void => {
    if (!this.isLoading) {
      this.dialogueViewport.handlePointerDown(event);
    }
  };

  private handlePointerMove = (event: FederatedPointerEvent): void => {
    if (!this.isLoading) {
      this.dialogueViewport.handlePointerMove(event);
    }
  };

  private handlePointerUp = (event: FederatedPointerEvent): void => {
    this.dialogueViewport.handlePointerUp(event);
  };

  private async loadDialogue(): Promise<void> {
    const shouldShowSpinner = !DialogueStore.hasCache();
    this.isLoading = shouldShowSpinner;

    if (!this.destroyed) {
      this.resize(this.viewportWidth, this.viewportHeight);
    }

    const loadTask = DialogueStore.getMessages();
    if (shouldShowSpinner) {
      await this.spinner.spinUntil(loadTask);
    }

    this.messages = await loadTask;
    this.visibleCount = 0;
    this.isLoading = false;

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

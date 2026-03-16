import {
  Container,
  Graphics,
  Rectangle,
  Text,
  type FederatedPointerEvent,
  type FederatedWheelEvent,
} from "pixi.js";
import { Spinner } from "../components/Spinner";
import { DialogueStore } from "../minigames/minigame2/DialogueStore";
import { Header } from "../minigames/minigame2/Header";
import { DialogueViewport } from "../minigames/minigame2/DialogueViewport";
import type { DialogueMessage } from "../minigames/minigame2/Types";
import { AdaptiveScreen } from "./AdaptiveScreen";

// all values in config are ratios to the smaller screen side (width or height)
const layoutConfig = {
  statusSize: 0.04,
  dialogueBgColor: 0xe3eff4,
} as const;

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

    this.header.resize(width, height);
    this.dialogueViewport.resize({
      screenWidth: width,
      screenHeight: height,
      contentTop: this.header.contentTop,
    });

    this.dialogueBg.clear();
    this.dialogueBg.beginFill(layoutConfig.dialogueBgColor, 1);
    this.dialogueBg.drawRect(0, this.header.contentTop, width, Math.max(0, height - this.header.contentTop));
    this.dialogueBg.endFill();

    this.spinner.resize(width, height, 0);

    this.status.style.fontSize = Math.max(16, Math.round(minSide * layoutConfig.statusSize));
    this.status.position.set(width * 0.5, this.dialogueViewport.viewportY + this.dialogueViewport.viewportHeight * 0.5);
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
    this.isLoading = !DialogueStore.hasCache();

    if (!this.destroyed) {
      this.resize(this.viewportWidth, this.viewportHeight);
    }

    const loadTask = DialogueStore.getMessages();
    if (this.isLoading) {
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

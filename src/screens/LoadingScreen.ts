import { Graphics, Text, TextStyle } from "pixi.js";
import { AdaptiveScreen } from "./AdaptiveScreen";
import { Utils } from "../utils/Utils";

//all values in config are ratios to the smaller screen side (width or height)
const spinnerConfig = {
  radius: 0.05,
  thickness: 0.25,
  base: {
    color: 0xf2f2f2,
    alpha: 0.45,
  },
  head: {
    color: 0xff8c3a,
    alpha: 1,
    startAngle: 0,
    sweepAngle: Math.PI * 1.5,
  },
} as const;

const badgeConfig = {
  width: 0.56,
  height: 0.15,
  textWidth: 0.52,
  gap: 0.05,
  color: 0xff8c3a,
} as const;

export class LoadingScreen extends AdaptiveScreen {
  private readonly title: Text;
  private readonly titleBadge: Graphics;

  private readonly spinnerBase: Graphics;
  private readonly spinnerHead: Graphics;
  private spinnerAngle = 0;

  private readonly MIN_LOADING_SCREEN_MS = 1000;
  private readonly SPINNER_RAD_PER_SEC = 7;

  constructor() {
    super();

    this.title = new Text(
      "TEST TASK",
      new TextStyle({
        fill: 0xffffff,
        fontFamily: "Arial",
        fontSize: 80,
        fontWeight: "700",
        letterSpacing: 2,
      }),
    );
    this.title.anchor.set(0.5);

    this.titleBadge = new Graphics();
    this.spinnerBase = new Graphics();
    this.spinnerHead = new Graphics();

    this.addChild(this.titleBadge, this.spinnerBase, this.spinnerHead, this.title);
  }

  async spinUntil(task: Promise<unknown>): Promise<void> {
    const startedAt = performance.now();
    let prevFrameAt = startedAt;
    let taskDone = false;

    const trackedTask = task.finally(() => {
      taskDone = true;
    });

    await new Promise<void>((resolve) => {
      const tick = () => {
        const now = performance.now();
        const deltaSec = (now - prevFrameAt) / 1000;
        prevFrameAt = now;

        this.spinnerAngle += this.SPINNER_RAD_PER_SEC * deltaSec;
        this.spinnerHead.rotation = this.spinnerAngle;

        if (taskDone && now - startedAt >= this.MIN_LOADING_SCREEN_MS) {
          resolve();
          return;
        }

        requestAnimationFrame(tick);
      };

      tick();
    });

    await trackedTask;
  }

  resize(width: number, height: number): void {
    const minSide = Math.min(width, height);
    const gap = Math.round(minSide * badgeConfig.gap);

    const spinnerRadius = minSide * spinnerConfig.radius;
    const spinnerY = height * 0.5 - gap * 0.5 - spinnerRadius;
    this.spinnerBase.position.set(width * 0.5, spinnerY);
    this.spinnerHead.position.set(width * 0.5, spinnerY);
    this.drawSpinner(spinnerRadius);
    
    const badgeWidth = Math.round(minSide * badgeConfig.width);
    const badgeHeight = Math.round(minSide * badgeConfig.height);
    const badgeY = height * 0.5 + gap * 0.5 + badgeHeight * 0.5;
    this.drawBadge(width * 0.5, badgeY, badgeWidth, badgeHeight);

    const titleWidth = Math.round(minSide * badgeConfig.textWidth);
    this.title.position.set(width * 0.5, badgeY);
    Utils.rescaleTextToFitWidth(this.title, titleWidth);
  }

  private drawSpinner(radius: number): void {
    const thickness = Math.round(radius * spinnerConfig.thickness);

    const headStart = spinnerConfig.head.startAngle;
    const headEnd = headStart + spinnerConfig.head.sweepAngle;
    const startX = Math.cos(headStart) * radius;
    const startY = Math.sin(headStart) * radius;

    this.spinnerBase.clear();
    this.spinnerBase.lineStyle(thickness, spinnerConfig.base.color, spinnerConfig.base.alpha);
    this.spinnerBase.drawCircle(0, 0, radius);

    this.spinnerHead.clear();
    this.spinnerHead.lineStyle(thickness, spinnerConfig.head.color, spinnerConfig.head.alpha);
    this.spinnerHead.moveTo(startX, startY);
    this.spinnerHead.arc(0, 0, radius, headStart, headEnd);
  }

  private drawBadge(centerX: number, centerY: number, width: number, height: number): void {
    this.titleBadge.clear();
    this.titleBadge.beginFill(badgeConfig.color);
    this.titleBadge.drawRect(centerX - width * 0.5, centerY - height * 0.5, width, height);
    this.titleBadge.endFill();
  }

}

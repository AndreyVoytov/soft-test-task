/** Reusable circular spinner component with resize-aware drawing and minimum spin duration. */
import { Container, Graphics } from "pixi.js";

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

export class Spinner extends Container {
  private readonly base: Graphics;
  private readonly head: Graphics;
  private spinAngle = 0;
  private readonly minDurationMs = 1000;
  private readonly speedRadPerSec = 7;

  constructor() {
    super();

    this.base = new Graphics();
    this.head = new Graphics();
    this.addChild(this.base, this.head);
  }

  resize(width: number, height: number, offsetY: number): void {
    const minSide = Math.min(width, height);
    const radius = minSide * spinnerConfig.radius;
    const thickness = Math.round(radius * spinnerConfig.thickness);

    const headStart = spinnerConfig.head.startAngle;
    const headEnd = headStart + spinnerConfig.head.sweepAngle;
    const startX = Math.cos(headStart) * radius;
    const startY = Math.sin(headStart) * radius;

    this.position.set(width * 0.5, height * 0.5 + offsetY);

    this.base.clear();
    this.base.lineStyle(thickness, spinnerConfig.base.color, spinnerConfig.base.alpha);
    this.base.drawCircle(0, 0, radius);

    this.head.clear();
    this.head.lineStyle(thickness, spinnerConfig.head.color, spinnerConfig.head.alpha);
    this.head.moveTo(startX, startY);
    this.head.arc(0, 0, radius, headStart, headEnd);
  }

  update(deltaSec: number, speedRadPerSec: number): void {
    this.spinAngle += speedRadPerSec * deltaSec;
    this.head.rotation = this.spinAngle;
  }

  async spinUntil(
    task: Promise<unknown>,
  ): Promise<void> {

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

        this.update(deltaSec, this.speedRadPerSec);

        if (taskDone && now - startedAt >= this.minDurationMs) {
          resolve();
          return;
        }

        requestAnimationFrame(tick);
      };

      tick();
    });

    await trackedTask;
  }
}


/** Initial loading screen with brand badge and shared spinner while core assets are loading. */
import { Graphics, Text, TextStyle } from "pixi.js";
import { Spinner } from "../components/Spinner";
import { AdaptiveScreen } from "./AdaptiveScreen";
import { Utils } from "../utils/Utils";

//all values in config are ratios to the smaller screen side (width or height)
const badgeConfig = {
  width: 0.56,
  height: 0.15,
  textWidth: 0.52,
  gap: 0.12,
  color: 0xff8c3a,
} as const;

export class LoadingScreen extends AdaptiveScreen {
  private readonly title: Text;
  private readonly titleBadge: Graphics;
  private readonly spinner: Spinner;

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
    this.spinner = new Spinner();

    this.addChild(this.titleBadge, this.spinner, this.title);
  }

  async spinUntil(task: Promise<unknown>): Promise<void> {
    await this.spinner.spinUntil(task);
  }

  resize(width: number, height: number): void {
    const minSide = Math.min(width, height);
    const gap = Math.round(minSide * badgeConfig.gap);

    this.spinner.resize(width, height, - gap * 0.5);

    const badgeWidth = Math.round(minSide * badgeConfig.width);
    const badgeHeight = Math.round(minSide * badgeConfig.height);
    const badgeY = height * 0.5 + gap * 0.5 + badgeHeight * 0.5;
    this.drawBadge(width * 0.5, badgeY, badgeWidth, badgeHeight);

    const titleWidth = Math.round(minSide * badgeConfig.textWidth);
    this.title.position.set(width * 0.5, badgeY);
    Utils.rescaleTextToFitWidth(this.title, titleWidth);
  }

  private drawBadge(centerX: number, centerY: number, width: number, height: number): void {
    this.titleBadge.clear();
    this.titleBadge.beginFill(badgeConfig.color);
    this.titleBadge.drawRect(centerX - width * 0.5, centerY - height * 0.5, width, height);
    this.titleBadge.endFill();
  }
}



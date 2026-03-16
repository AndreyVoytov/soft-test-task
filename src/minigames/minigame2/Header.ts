import { Container, Graphics, Text } from "pixi.js";
import { Images } from "../../assets";
import { CustomSprite } from "../../components/CustomSprite";
import { Config } from "./Config";

type HeaderParams = {
  onBack: () => void;
};

// all values in config are ratios to the smaller screen side (width or height)
const headerConfig = {
  titleSize: 0.06,
  progressSize: 0.03,
  progressGap: 0.008,
  backSize: 0.11,
  backMargin: 0.02,
  headerGap: 0.012,
  bgColor: 0xffdeb8,
} as const;

export class Header extends Container {
  private readonly bg: Graphics;
  private readonly title: Text;
  private readonly progress: Text;
  private readonly backButton: CustomSprite;

  private viewportTop = 0;

  constructor(params: HeaderParams) {
    super();

    this.bg = new Graphics();

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

    this.backButton = new CustomSprite(Images.back_button);
    this.backButton.anchor.set(0, 0);
    this.backButton.eventMode = "static";
    this.backButton.cursor = "pointer";
    this.backButton.on("pointertap", (event) => {
      event.stopPropagation();
      params.onBack();
    });

    this.addChild(this.bg, this.title, this.progress, this.backButton);
  }

  resize(width: number, height: number): void {
    const minSide = Math.min(width, height);
    const topPadding = Math.round(minSide * Config.topPaddingRatio);

    this.title.style.fontSize = Math.max(20, Math.round(minSide * headerConfig.titleSize));
    this.title.position.set(width * 0.5, topPadding);

    const backSize = Math.max(30, Math.round(minSide * headerConfig.backSize));
    const backMargin = Math.max(8, Math.round(minSide * headerConfig.backMargin));
    this.backButton.position.set(backMargin, backMargin * 2.5);
    this.backButton.width = backSize;
    this.backButton.height = backSize;

    this.progress.style.fontSize = Math.max(14, Math.round(minSide * headerConfig.progressSize));
    this.progress.position.set(
      width * 0.5,
      this.title.y + this.title.height + Math.max(4, Math.round(minSide * headerConfig.progressGap)),
    );

    const gap = Math.max(6, Math.round(width * headerConfig.headerGap));
    this.viewportTop = this.progress.y + this.progress.height + gap;

    this.bg.clear();
    this.bg.beginFill(headerConfig.bgColor, 1);
    this.bg.drawRect(0, 0, width, this.viewportTop);
    this.bg.endFill();
  }

  get contentTop(): number {
    return this.viewportTop;
  }

  setProgress(current: number, total: number): void {
    this.progress.text = `${Math.min(current, total)}/${total}`;
  }

  setProgressVisible(visible: boolean): void {
    this.progress.visible = visible;
  }
}

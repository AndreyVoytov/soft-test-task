/** Main menu screen with four minigame buttons and adaptive layout. */
import { Container, Graphics, Sprite, Text, type DisplayObject } from "pixi.js";
import { Images } from "../assets";
import { AdaptiveScreen } from "./AdaptiveScreen";
import { CustomSprite } from "../components/CustomSprite";
import { Utils } from "../utils/Utils";

//all values in config are ratios to the smaller screen side (width or height)
const buttonConfig = {
  width: 0.7,
  buttonX: 0.1,
  gap: 0.18,
  iconX: -0.32,
  labelX: 0.02,
  labelWidth: 0.35,
} as const;

export type MinigameId = "minigame1" | "minigame2" | "minigame3" | "minigame4";

const minigameTitles: Record<MinigameId, string> = {
  minigame1: "Ace of Shadows",
  minigame2: "Magic Words",
  minigame3: "Phoenix Flame",
  minigame4: "Prism Merge",
};

type MenuButton = {
  id: MinigameId;
  cont: Container;
  buttonSprite: Sprite;
  icon: DisplayObject;
  label: Text;
};

export class MenuScreen extends AdaptiveScreen {
  private readonly buttons: MenuButton[] = [];
  private readonly onSelect: (id: MinigameId) => void;

  constructor(params: { onSelect: (id: MinigameId) => void }) {
    super();

    this.onSelect = params.onSelect;
    const ids: MinigameId[] = ["minigame1", "minigame2", "minigame3", "minigame4"];

    for (const id of ids) {
      const button = this.createMenuButton(id);
      this.buttons.push(button);
      this.addChild(button.cont);
    }
  }

  resize(width: number, height: number): void {
    const minSide = Math.min(width, height);
    const baseTexture = this.buttons[0].buttonSprite.texture;

    const buttonScale = (minSide * buttonConfig.width) / baseTexture.width;
    const stepY = Math.round(minSide * buttonConfig.gap);
    const centerIndex = (this.buttons.length - 1) * 0.5;

    this.buttons.forEach((button, index) => {
      const y = height * 0.5 + (index - centerIndex) * stepY;
      button.cont.position.set(width * 0.5 + buttonConfig.buttonX * minSide, y);

      button.buttonSprite.scale.set(buttonScale);

      button.icon.position.set(minSide * buttonConfig.iconX, 0);
      button.icon.scale.set(buttonScale);

      button.label.position.set(minSide * buttonConfig.labelX, 0);
      Utils.rescaleTextToFitWidth(button.label, minSide * buttonConfig.labelWidth);
    });
  }

  private createMenuButton(id: MinigameId): MenuButton {
    const cont = new Container();
    cont.eventMode = "static";
    cont.cursor = "pointer";

    const buttonSprite = new CustomSprite(Images.button);
    buttonSprite.anchor.set(0.5);

    const icon = this.createMenuIcon(id);

    const label = new Text(minigameTitles[id], {
      fill: 0xffffff,
      fontFamily: "Arial",
      fontSize: 80,
      fontWeight: "700",
    });
    label.anchor.set(0.5);

    cont.addChild(buttonSprite, icon, label);
    cont.on("pointertap", () => this.onSelect(id));
    cont.on("pointerover", () => {
      cont.scale.set(1.03);
    });
    cont.on("pointerout", () => {
      cont.scale.set(1);
    });

    return { id, cont, buttonSprite, icon, label };
  }

  private createMenuIcon(id: MinigameId): DisplayObject {
    if (id !== "minigame4") {
      const icon = new CustomSprite(Images[`${id}-icon`]);
      icon.anchor.set(0.5);
      return icon;
    }

    const icon = new Graphics();
    icon.beginFill(0x1e293b, 1);
    icon.lineStyle(6, 0x60a5fa, 1);
    icon.drawRoundedRect(-70, -70, 140, 140, 28);
    icon.endFill();

    icon.beginFill(0xfb7185, 1);
    icon.drawStar(-18, -12, 5, 30, 14, -Math.PI / 2);
    icon.endFill();

    icon.beginFill(0x22c55e, 1);
    icon.drawPolygon([18, -30, 42, -6, 18, 18, -6, -6]);
    icon.endFill();

    icon.beginFill(0xc084fc, 1);
    icon.drawCircle(-26, 30, 16);
    icon.endFill();

    icon.beginFill(0x38bdf8, 1);
    icon.drawRect(12, 18, 30, 24);
    icon.endFill();

    return icon;
  }
}

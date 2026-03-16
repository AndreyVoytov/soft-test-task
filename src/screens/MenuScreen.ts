/** Main menu screen with three minigame buttons and adaptive layout. */
import { Container, Sprite, Text } from "pixi.js";
import { Images } from "../assets";
import { AdaptiveScreen } from "./AdaptiveScreen";
import { CustomSprite } from "../components/CustomSprite";
import { Utils } from "../utils/Utils";

//all values in config are ratios to the smaller screen side (width or height)
const buttonConfig = {
  width: 0.7,
  buttonX: 0.1,
  gap: 0.23,
  iconX: -0.32,
  labelX: 0.02,
  labelWidth: 0.35,
} as const;

export type MinigameId = "minigame1" | "minigame2" | "minigame3";

const minigameTitles: Record<MinigameId, string> = {
  minigame1: "Ace of Shadows",
  minigame2: "Magic Words",
  minigame3: "Phoenix Flame",
};

type MenuButton = {
  id: MinigameId;
  cont: Container;
  buttonSprite: Sprite;
  icon: Sprite;
  label: Text;
};

export class MenuScreen extends AdaptiveScreen {
  private readonly buttons: MenuButton[] = [];
  private readonly onSelect: (id: MinigameId) => void;

  constructor(params: { onSelect: (id: MinigameId) => void }) {
    super();

    this.onSelect = params.onSelect;
    const ids: MinigameId[] = ["minigame1", "minigame2", "minigame3"];

    for (const id of ids) {
      const button = this.createMenuButton(id);
      this.buttons.push(button);
      this.addChild(button.cont);
    }
  }

  resize(width: number, height: number): void {
    const minSide = Math.min(width, height);
    const baseTexture = this.buttons[0].buttonSprite.texture;

    let buttonScale = (minSide * buttonConfig.width) / baseTexture.width;
    let stepY = Math.round(minSide * buttonConfig.gap);
    const centerIndex = 1;

    this.buttons.forEach((button, index) => {
      const y = height * 0.5 + (index - centerIndex) * stepY;
      button.cont.position.set(width * 0.5 + buttonConfig.buttonX * minSide, y);

      button.buttonSprite.scale.set(buttonScale);

      button.icon.scale.set(buttonScale);
      button.icon.position.set(minSide * buttonConfig.iconX, 0);

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

    const icon = new CustomSprite(Images[`${id}-icon`]);
    icon.anchor.set(0.5);

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
}


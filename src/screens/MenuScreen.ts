import { Container, Sprite, Text, Texture } from "pixi.js";
import { MENU_ASSETS } from "../assets";
import { AdaptiveScreen } from "./AdaptiveScreen";

export type MinigameId = "minigame1" | "minigame2" | "minigame3";

type MenuButton = {
  id: MinigameId;
  root: Container;
  buttonSprite: Sprite;
  icon: Sprite;
  label: Text;
};

export class MenuScreen extends AdaptiveScreen {
  private readonly buttons: MenuButton[] = [];
  private readonly onSelect: (id: MinigameId) => void;
  private readonly buttonAspect: number;

  constructor(params: { onSelect: (id: MinigameId) => void }) {
    super();
    const buttonTexture = Texture.from(MENU_ASSETS.button);
    const iconTextures: Record<`${MinigameId}-icon`, Texture> = {
      "minigame1-icon": Texture.from(MENU_ASSETS["minigame1-icon"]),
      "minigame2-icon": Texture.from(MENU_ASSETS["minigame2-icon"]),
      "minigame3-icon": Texture.from(MENU_ASSETS["minigame3-icon"]),
    };

    this.onSelect = params.onSelect;
    this.buttonAspect = buttonTexture.height / buttonTexture.width;

    const ids: MinigameId[] = ["minigame1", "minigame2", "minigame3"];

    for (const id of ids) {
      const root = new Container();
      root.eventMode = "static";
      root.cursor = "pointer";

      const buttonSprite = new Sprite(buttonTexture);
      buttonSprite.anchor.set(0.5);

      const icon = new Sprite(iconTextures[`${id}-icon`]);
      icon.anchor.set(0.5);

      const label = new Text(id, {
        fill: 0xffffff,
        fontFamily: "Arial",
        fontSize: 34,
        fontWeight: "700",
      });
      label.anchor.set(0.5);

      root.addChild(buttonSprite, icon, label);
      root.on("pointertap", () => this.onSelect(id));
      root.on("pointerover", () => {
        root.scale.set(1.03);
      });
      root.on("pointerout", () => {
        root.scale.set(1);
      });

      this.buttons.push({ id, root, buttonSprite, icon, label });
      this.addChild(root);
    }
  }

  resize(width: number, height: number): void {
    const portrait = height >= width;
    const sidePadding = Math.max(12, Math.round(Math.min(width, height) * 0.06));
    const topBottomPadding = Math.max(16, Math.round(Math.min(width, height) * 0.08));
    const availableWidth = Math.max(1, width - sidePadding * 2);
    const availableHeight = Math.max(1, height - topBottomPadding * 2);

    const desiredWidth = portrait
      ? Math.min(availableWidth, 420)
      : Math.min(availableWidth * 0.72, 420);

    let buttonWidth = desiredWidth;
    let buttonHeight = Math.max(20, buttonWidth * this.buttonAspect);
    let gap = portrait ? Math.max(8, height * 0.018) : Math.max(6, height * 0.015);

    const totalHeight = this.buttons.length * buttonHeight + (this.buttons.length - 1) * gap;
    if (totalHeight > availableHeight) {
      const scale = availableHeight / totalHeight;
      buttonWidth *= scale;
      buttonHeight *= scale;
      gap *= scale;
    }

    const blockHeight = this.buttons.length * buttonHeight + (this.buttons.length - 1) * gap;
    const startY = (height - blockHeight) * 0.5 + buttonHeight * 0.5;

    for (let i = 0; i < this.buttons.length; i++) {
      const button = this.buttons[i];
      const y = startY + i * (buttonHeight + gap);
      const root = button.root;
      root.position.set(width * 0.5, y);

      button.buttonSprite.width = buttonWidth;
      button.buttonSprite.height = buttonHeight;

      const iconSize = buttonHeight * 0.5;
      button.icon.width = iconSize;
      button.icon.height = iconSize;
      button.icon.position.set(-buttonWidth * 0.33, 0);

      button.label.style.fontSize = Math.max(12, Math.round(buttonHeight * 0.32));
      button.label.position.set(buttonWidth * 0.08, 0);
    }
  }
}

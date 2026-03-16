/** Top-right fullscreen toggle button with auto-sync to browser fullscreen state. */
import { Container, Sprite, Texture } from "pixi.js";
import { Images } from "../assets";
import { Utils } from "../utils/Utils";

//all values in config are ratios to the smaller screen side (width or height)
const fullscreenButtonConfig = {
  size: 0.08,
  margin: 0.02,
} as const;

export class FullscreenButton {
  private readonly sprite: Sprite;
  private readonly view: HTMLCanvasElement;

  constructor(parent: Container, view: HTMLCanvasElement) {
    this.view = view;

    this.sprite = new Sprite();
    this.sprite.anchor.set(0.5);
    this.sprite.eventMode = "static";
    this.sprite.cursor = "pointer";
    this.sprite.on("pointertap", this.handleToggle);

    this.syncTexture();
    parent.addChild(this.sprite);

    document.addEventListener("fullscreenchange", this.handleFullscreenChange);
  }

  onResize(width: number, height: number): void {
    const minSide = Math.min(width, height);
    const size = Math.round(minSide * fullscreenButtonConfig.size);
    const margin = Math.round(minSide * fullscreenButtonConfig.margin);

    this.sprite.width = size;
    this.sprite.height = size;
    this.sprite.position.set(width - margin - size * 0.5, margin + size * 0.5);
  }

  onDestroy(): void {
    document.removeEventListener("fullscreenchange", this.handleFullscreenChange);
    this.sprite.off("pointertap", this.handleToggle);
    this.sprite.destroy();
  }

  private handleFullscreenChange = (): void => {
    this.syncTexture();
  };

  private handleToggle = async (): Promise<void> => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await this.view.requestFullscreen();
      }
    } catch {
      // Browser may block fullscreen in some contexts.
    }
  };

  private syncTexture(): void {
    const path = document.fullscreenElement ? Images["fullscreen-off"] : Images.fullscreen;
    this.sprite.texture = Texture.from(Utils.assetPathToUrl(path));
  }
}


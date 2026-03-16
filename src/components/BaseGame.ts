/** Core Pixi application host: lifecycle, screen switching, resize, and shared overlays. */
import { Application, Assets, Container } from "pixi.js";
import { Utils } from "../utils/Utils";
import { AdaptiveScreen } from "../screens/AdaptiveScreen";
import { FpsCounter } from "./FpsCounter";
import { FullscreenButton } from "./FullscreenButton";

export abstract class BaseGame {
  private app: Application<HTMLCanvasElement>;
  private stageRoot: Container;
  private currentScreen: AdaptiveScreen | null = null;
  private fpsCounter: FpsCounter;
  private fullscreenButton: FullscreenButton;

  constructor() {
    this.app = new Application<HTMLCanvasElement>({
      background: "#ffffff",
      resizeTo: window,
      antialias: true,
    });

    this.stageRoot = new Container();
    this.app.stage.addChild(this.stageRoot);

    this.fpsCounter = new FpsCounter(this.app.ticker, this.app.stage);
    this.fullscreenButton = new FullscreenButton(this.app.stage, this.app.view);
    this.fullscreenButton.onResize(this.app.screen.width, this.app.screen.height);

    document.body.appendChild(this.app.view);
    this.app.renderer.on("resize", this.handleResize);
  }

  abstract start(): Promise<void>;

  protected async loadAssets(entries: readonly string[]): Promise<void> {
    for (const assetPath of entries) {
      await Assets.load(Utils.assetPathToUrl(assetPath));
    }
  }

  protected handleResize = (): void => {
    this.fullscreenButton.onResize(this.app.screen.width, this.app.screen.height);

    if (this.currentScreen) {
      this.resizeScreen(this.currentScreen);
    }
  };

  protected resizeScreen(screen: AdaptiveScreen): void {
    screen.resize(this.app.screen.width, this.app.screen.height);
  }

  protected setCurrentScreen(nextScreen: AdaptiveScreen): void {
    if (this.currentScreen) {
      this.stageRoot.removeChild(this.currentScreen);
      this.currentScreen.destroy({ children: true });
    }

    this.currentScreen = nextScreen;
    this.stageRoot.addChild(nextScreen);
    this.resizeScreen(nextScreen);
  }

  destroy(): void {
    this.app.renderer.off("resize", this.handleResize);

    if (this.currentScreen) {
      this.stageRoot.removeChild(this.currentScreen);
      this.currentScreen.destroy({ children: true });
      this.currentScreen = null;
    }

    this.fullscreenButton.onDestroy();
    this.fpsCounter.onDestroy();
    this.app.destroy(true, { children: true });
  }
}


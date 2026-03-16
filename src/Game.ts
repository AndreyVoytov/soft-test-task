import { Application, Assets, Container } from "pixi.js";
import { Images } from "./assets";
import { Utils } from "./Utils";
import { AdaptiveScreen } from "./screens/AdaptiveScreen";
import { LoadingScreen } from "./screens/LoadingScreen";
import { MenuScreen, type MinigameId } from "./screens/MenuScreen";

export class Game {
  private app: Application<HTMLCanvasElement>;
  private stageRoot: Container;
  private currentScreen: AdaptiveScreen | null = null;

  constructor() {
    this.app = new Application<HTMLCanvasElement>({
      background: "#ffffff",
      resizeTo: window,
      antialias: true,
    });

    this.stageRoot = new Container();
    this.app.stage.addChild(this.stageRoot);
    document.body.appendChild(this.app.view);
    this.app.renderer.on("resize", this.handleResize);
  }

  async start(): Promise<void> {
    await this.showLoadingAndLoadAssets();
    this.showMenu();
  }

  private async showLoadingAndLoadAssets(): Promise<void> {
    const loadingScreen = new LoadingScreen();
    this.setCurrentScreen(loadingScreen);

    const loadingPromise = this.loadAssets(Object.values(Images));
    await loadingScreen.spinUntil(loadingPromise);
  }

  private showMenu(): void {
    const menuScreen = new MenuScreen({
      onSelect: (minigameId) => this.handleMinigameOpen(minigameId),
    });
    this.setCurrentScreen(menuScreen);
  }

  private handleMinigameOpen(minigameId: MinigameId): void {
    switch (minigameId) {
      case "minigame1":
        // TODO: open minigame1 screen
        break;
      case "minigame2":
        // TODO: open minigame2 screen
        break;
      case "minigame3":
        // TODO: open minigame3 screen
        break;
    }
  }

  // utility methods
  private async loadAssets(entries: readonly string[]): Promise<void> {
    for (const assetPath of entries) {
      await Assets.load(Utils.assetPathToUrl(assetPath));
    }
  }

  private handleResize = (): void => {
    if (this.currentScreen) {
      this.resizeScreen(this.currentScreen);
    }
  };

  private resizeScreen(screen: AdaptiveScreen): void {
    screen.resize(this.app.screen.width, this.app.screen.height);
  }

  private setCurrentScreen(nextScreen: AdaptiveScreen): void {
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

    this.app.destroy(true, { children: true });
  }
}

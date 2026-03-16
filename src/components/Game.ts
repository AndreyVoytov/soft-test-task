import { Images } from "../assets";
import { LoadingScreen } from "../screens/LoadingScreen";
import { MenuScreen, type MinigameId } from "../screens/MenuScreen";
import { BaseGame } from "./BaseGame";

export class Game extends BaseGame {

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
}

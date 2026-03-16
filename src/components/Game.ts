import { Images } from "../assets";
import { LoadingScreen } from "../screens/LoadingScreen";
import { MenuScreen, type MinigameId } from "../screens/MenuScreen";
import { Minigame1Screen } from "../screens/Minigame1Screen";
import { Minigame2Screen } from "../screens/Minigame2Screen";
import { Minigame3Screen } from "../screens/Minigame3Screen";
import { BaseGame } from "./BaseGame";

export class Game extends BaseGame {
  async start(): Promise<void> {
    await this.showLoadingAndLoadAssets();
    this.showMenu();
  }

  private async showLoadingAndLoadAssets(): Promise<void> {
    const loadingScreen = new LoadingScreen();
    this.setCurrentScreen(loadingScreen);

    const initialAssets = Object.entries(Images)
      .filter(([key]) => !key.startsWith("minigame3-"))
      .map(([, path]) => path);

    const loadingPromise = this.loadAssets(initialAssets);
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
        this.setCurrentScreen(new Minigame1Screen({ onBack: () => this.showMenu() }));
        break;
      case "minigame2":
        this.setCurrentScreen(new Minigame2Screen({ onBack: () => this.showMenu() }));
        break;
      case "minigame3":
        this.setCurrentScreen(new Minigame3Screen({ onBack: () => this.showMenu() }));
        break;
    }
  }
}

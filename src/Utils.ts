import { Text } from "pixi.js";

export class Utils {
  static rescaleTextToFitWidth(text: Text, targetWidth: number): void {
    const baseWidth = text.getLocalBounds().width;
    if (baseWidth <= 0 || targetWidth <= 0) {
      return;
    }

    text.scale.set(targetWidth / baseWidth);
  }
}

import { Container, Text, TextStyle, Ticker } from "pixi.js";

export class FpsCounter {
  private readonly ticker: Ticker;
  private readonly text: Text;
  private accumulatedMs = 0;

  constructor(ticker: Ticker, parent: Container) {
    this.ticker = ticker;

    this.text = new Text(
      "FPS: 00",
      new TextStyle({
        fill: 0x8f8f8f,
        fontFamily: "Arial",
        fontSize: 16,
        fontWeight: "700",
      }),
    );

    this.text.position.set(8, 8);
    this.text.visible = false;
    parent.addChild(this.text);

    this.ticker.add(this.update);
  }

  onDestroy(): void {
    this.ticker.remove(this.update);
    this.text.destroy();
  }

  private update = (): void => {
    this.accumulatedMs += this.ticker.deltaMS;
    if (this.accumulatedMs < 250) {
      return;
    }

    this.accumulatedMs = 0;
    this.text.text = `FPS: ${Math.round(this.ticker.FPS)}`;
    this.text.visible = true;
  };
}

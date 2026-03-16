/** Base class for full-screen scenes that must handle responsive resize. */
import { Container } from "pixi.js";

export abstract class AdaptiveScreen extends Container {
  abstract resize(width: number, height: number): void;
}



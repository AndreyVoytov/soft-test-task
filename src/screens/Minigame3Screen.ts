import { Assets, BLEND_MODES, Container, Sprite, Texture, Ticker, Text } from "pixi.js";
import { Images } from "../assets";
import { Spinner } from "../components/Spinner";
import { Header } from "../minigames/minigame2/Header";
import { Utils } from "../utils/Utils";
import { AdaptiveScreen } from "./AdaptiveScreen";

type Particle = {
  sprite: Sprite;
  age: number;
  life: number;
  baseScale: number;
  vx: number;
  vy: number;
  driftAmp: number;
  phase: number;
  rotSpeed: number;
  skewAmp: number;
  skewSpeed: number;
};

// all values in config are ratios to the smaller screen side (width or height)
const screenConfig = {
  bgTint: 0x3b2222,
  baseY: 0.86,
  emitPerSecond: 12,
  maxParticles: 10,
  minParticleLife: 0.8,
  maxParticleLife: 1.6,
  minVy: 120,
  maxVy: 240,
  minVx: 8,
  maxVx: 44,
  minStatusSize: 16,
  statusSize: 0.04,
} as const;

export class Minigame3Screen extends AdaptiveScreen {
  private static assetsLoaded = false;

  private readonly onBack: () => void;
  private readonly header: Header;
  private readonly spinner: Spinner;
  private readonly status: Text;
  private readonly flameLayer: Container;
  private readonly bgSprite: Sprite;

  private particleTextures: Texture[] = [];
  private particles: Particle[] = [];
  private emitAccumulator = 0;

  private isLoading = false;
  private viewportWidth = 0;
  private viewportHeight = 0;
  private contentTop = 0;

  constructor(params?: { onBack?: () => void }) {
    super();

    this.onBack = params?.onBack ?? (() => {});

    this.header = new Header({
      onBack: this.onBack,
      title: "Phoenix Flame",
    });
    this.header.setProgressVisible(false);

    this.spinner = new Spinner();

    this.status = new Text("Loading Phoenix Flame...", {
      fill: 0xffffff,
      fontFamily: "Arial",
      fontSize: 22,
      fontWeight: "700",
      align: "center",
    });
    this.status.anchor.set(0.5);

    this.bgSprite = new Sprite(Texture.WHITE);
    this.bgSprite.anchor.set(0.5);
    // this.bgSprite.tint = screenConfig.bgTint;

    this.flameLayer = new Container();

    this.addChild(this.bgSprite, this.flameLayer, this.status, this.spinner, this.header);

    Ticker.shared.add(this.update);
    void this.loadAssetsIfNeeded();
  }

  resize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;

    const minSide = Math.min(width, height);

    this.header.resize(width, height);
    this.header.setProgressVisible(false);

    this.contentTop = this.header.contentTop;
    const contentHeight = Math.max(20, height - this.contentTop);

    this.bgSprite.position.set(width * 0.5, this.contentTop + contentHeight * 0.5);
    this.bgSprite.width = width;
    this.bgSprite.height = contentHeight;

    this.spinner.resize(width, height, 0);

    this.status.style.fontSize = Math.max(screenConfig.minStatusSize, Math.round(minSide * screenConfig.statusSize));
    this.status.position.set(width * 0.5, this.contentTop + contentHeight * 0.5);
  }

  override destroy(options?: Parameters<Container["destroy"]>[0]): void {
    Ticker.shared.remove(this.update);
    this.clearParticles();
    super.destroy(options);
  }

  private async loadAssetsIfNeeded(): Promise<void> {
    if (Minigame3Screen.assetsLoaded) {
      this.setupTextures();
      this.isLoading = false;
      this.status.visible = false;
      this.spinner.visible = false;
      return;
    }

    this.isLoading = true;
    this.status.visible = true;
    this.spinner.visible = true;

    const loadTask = this.loadMinigame3Assets();
    await this.spinner.spinUntil(loadTask);
    await loadTask;

    Minigame3Screen.assetsLoaded = true;
    this.setupTextures();

    this.isLoading = false;
    this.status.visible = false;
    this.spinner.visible = false;
  }

  private async loadMinigame3Assets(): Promise<void> {
    const assetPaths = [
      Images["minigame3-bg"],
      Images["minigame3-particle1"],
      Images["minigame3-particle2"],
      Images["minigame3-particle3"],
    ];

    await Promise.all(assetPaths.map((path) => Assets.load(Utils.assetPathToUrl(path))));
  }

  private setupTextures(): void {
    this.bgSprite.texture = Texture.from(Utils.assetPathToUrl(Images["minigame3-bg"]));

    this.particleTextures = [
      Texture.from(Utils.assetPathToUrl(Images["minigame3-particle1"])),
      Texture.from(Utils.assetPathToUrl(Images["minigame3-particle2"])),
      Texture.from(Utils.assetPathToUrl(Images["minigame3-particle3"])),
    ];
  }

  private update = (delta: number): void => {
    if (this.isLoading || this.particleTextures.length === 0) {
      return;
    }

    const dt = delta / 60;
    const contentHeight = Math.max(20, this.viewportHeight - this.contentTop);
    const centerX = this.viewportWidth * 0.5;
    const baseY = this.contentTop + contentHeight * screenConfig.baseY;

    this.emitAccumulator += dt * screenConfig.emitPerSecond;
    if (this.emitAccumulator >= 1 && this.particles.length < screenConfig.maxParticles) {
      this.spawnParticle(centerX, baseY);
      this.emitAccumulator -= 1;
    }

    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const p = this.particles[i];
      p.age += dt;

      if (p.age >= p.life) {
        p.sprite.destroy();
        this.particles.splice(i, 1);
        continue;
      }

      const t = p.age / p.life;
      p.sprite.x += p.vx * dt;
      p.sprite.y -= p.vy * dt;

      const inward = (centerX - p.sprite.x) * 0.12;
      p.sprite.x += inward * dt;
      p.sprite.x += Math.sin(p.phase + t * 6) * p.driftAmp * dt;

      p.sprite.rotation += p.rotSpeed * dt;
      p.sprite.skew.x = Math.sin(p.phase + p.age * p.skewSpeed) * p.skewAmp;
      p.sprite.skew.y = Math.cos(p.phase + p.age * p.skewSpeed * 0.85) * p.skewAmp * 0.55;

      const fadeIn = Math.min(1, t / 0.2);
      const fadeOut = Math.min(1, (1 - t) / 0.45);
      p.sprite.alpha = Math.min(fadeIn, fadeOut);

      const scale = p.baseScale * (0.55 + (1 - t) * 0.75);
      p.sprite.scale.set(scale);

      p.sprite.tint = t < 0.4 ? 0xfff0b8 : t < 0.75 ? 0xff5f2a : 0xc6281a;
    }
  };

  private spawnParticle(centerX: number, baseY: number): void {
    const side = Math.random() < 0.5 ? -1 : 1;
    const xOffset = this.randomRange(28, 108) * side;

    const sprite = new Sprite(this.particleTextures[Math.floor(Math.random() * this.particleTextures.length)]);
    const baseScale = this.randomRange(0.35, 1.35);

    sprite.anchor.set(0.5);
    sprite.position.set(centerX + xOffset, baseY + this.randomRange(-4, 8));
    sprite.scale.set(baseScale);
    sprite.alpha = 0;
    sprite.blendMode = BLEND_MODES.ADD;

    this.flameLayer.addChild(sprite);

    this.particles.push({
      sprite,
      age: 0,
      life: this.randomRange(screenConfig.minParticleLife, screenConfig.maxParticleLife),
      baseScale,
      vx: side * -this.randomRange(screenConfig.minVx, screenConfig.maxVx),
      vy: this.randomRange(screenConfig.minVy, screenConfig.maxVy),
      driftAmp: this.randomRange(8, 24),
      phase: Math.random() * Math.PI * 2,
      rotSpeed: this.randomRange(-0.9, 0.9),
      skewAmp: this.randomRange(0.05, 0.18),
      skewSpeed: this.randomRange(5, 9),
    });
  }

  private clearParticles(): void {
    this.particles.forEach((p) => p.sprite.destroy());
    this.particles = [];
    this.flameLayer.removeChildren();
  }

  private randomRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }
}

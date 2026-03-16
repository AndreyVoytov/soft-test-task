/** Ace of Shadows: two card stacks with continuous top-card transfer animation. */
import { Container, Sprite, Texture, Ticker } from "pixi.js";
import { Images } from "../assets";
import { Header } from "../minigames/minigame2/Header";
import { Utils } from "../utils/Utils";
import { AdaptiveScreen } from "./AdaptiveScreen";

type StackState = {
  container: Container;
  cardIds: number[];
};

type MoveState = {
  cardId: number;
  sprite: Sprite;
  fromStack: number;
  toStack: number;
  fromSlot: number;
  toSlot: number;
  fromSize: number;
  elapsed: number;
  duration: number;
  arcHeight: number;
};

// all values in config are ratios to the smaller screen side (width or height)
const aceConfig = {
  title: "Ace of Shadows",
  boardColor: 0x1f2a35,
  stackCount: 2,
  totalCards: 144,
  moveEverySec: 1,
  moveDurationSec: 2,
  cardWidth: 0.13,
  cardHeight: 0.2,
  cardRevealY: 0.022,
  minCardWidth: 42,
  minCardHeight: 58,
  minRevealY: 1,
  stackTopPadding: 0.12,
  stackBottomPadding: 0.08,
  stackSidePadding: 0.22,
  minArc: 36,
  maxArc: 90,
} as const;

export class Minigame1Screen extends AdaptiveScreen {
  private readonly onBack: () => void;
  private readonly header: Header;
  private readonly boardBg: Sprite;
  private readonly stacksRoot: Container;
  private readonly movingLayer: Container;
  private readonly stacks: StackState[];

  private readonly cards: Sprite[] = [];
  private readonly moves: MoveState[] = [];
  private readonly pendingIncoming: number[] = Array(aceConfig.stackCount).fill(0);

  private cardWidth = 0;
  private cardHeight = 0;
  private cardRevealY = 0;
  private boardWidth = 0;
  private boardHeight = 0;
  private boardY = 0;

  private moveAccumulator = 0;

  constructor(params?: { onBack?: () => void }) {
    super();

    this.onBack = params?.onBack ?? (() => {});
    this.header = new Header({ onBack: this.onBack, title: aceConfig.title });
    this.header.setProgressVisible(false);

    this.boardBg = new Sprite(Texture.WHITE);
    this.boardBg.tint = aceConfig.boardColor;

    this.stacksRoot = new Container();
    this.movingLayer = new Container();

    this.stacks = Array.from({ length: aceConfig.stackCount }, () => ({
      container: new Container(),
      cardIds: [],
    }));

    for (const stack of this.stacks) {
      this.stacksRoot.addChild(stack.container);
    }

    this.createCards();
    this.distributeInitialCards();

    this.addChild(this.boardBg, this.stacksRoot, this.movingLayer, this.header);

    Ticker.shared.add(this.update);
  }

  resize(width: number, height: number): void {
    this.header.resize(width, height);
    this.header.setProgressVisible(false);

    const minSide = Math.min(width, height);
    this.boardY = this.header.contentTop;
    this.boardWidth = width;
    this.boardHeight = Math.max(20, height - this.boardY);

    this.boardBg.position.set(0, this.boardY);
    this.boardBg.width = this.boardWidth;
    this.boardBg.height = this.boardHeight;

    this.cardWidth = Math.max(aceConfig.minCardWidth, Math.round(minSide * aceConfig.cardWidth));
    this.cardHeight = Math.max(aceConfig.minCardHeight, Math.round(minSide * aceConfig.cardHeight));
    this.cardRevealY = Math.max(aceConfig.minRevealY, Math.round(this.cardHeight * aceConfig.cardRevealY));

    this.layoutStacks();
    this.layoutAllStaticCards();
    this.refreshMovingCards();
  }

  override destroy(options?: Parameters<Container["destroy"]>[0]): void {
    Ticker.shared.remove(this.update);
    super.destroy(options);
  }

  private createCards(): void {
    const cardTexture = Texture.from(Utils.assetPathToUrl(Images["minigame1-card"]));

    for (let i = 0; i < aceConfig.totalCards; i += 1) {
      const card = new Sprite(cardTexture);
      card.width = this.cardWidth;
      card.height = this.cardHeight;
      card.alpha = 0.98;
      this.cards.push(card);
    }
  }

  private distributeInitialCards(): void {
    for (let cardId = 0; cardId < aceConfig.totalCards; cardId += 1) {
      this.stacks[0].cardIds.push(cardId);
      this.stacks[0].container.addChild(this.cards[cardId]);
    }
  }

  private update = (delta: number): void => {
    const dt = delta / 60;

    this.moveAccumulator += dt;
    while (this.moveAccumulator >= aceConfig.moveEverySec) {
      this.moveTopCardOneWay();
      this.moveAccumulator -= aceConfig.moveEverySec;
    }

    for (let i = this.moves.length - 1; i >= 0; i -= 1) {
      const move = this.moves[i];
      move.elapsed += dt;

      const t = Math.min(1, move.elapsed / move.duration);
      this.positionMovingCard(move, t);

      if (t >= 1) {
        this.finishMove(i);
      }
    }
  };

  private moveTopCardOneWay(): void {
    const source = 0;
    const target = 1;
    if (this.stacks[source].cardIds.length === 0) {
      return;
    }

    const sourceStack = this.stacks[source];
    const cardId = sourceStack.cardIds.pop();
    if (cardId === undefined) {
      return;
    }

    const fromSlot = sourceStack.cardIds.length;
    const toSlot = this.stacks[target].cardIds.length + this.pendingIncoming[target];

    const move: MoveState = {
      cardId,
      sprite: this.cards[cardId],
      fromStack: source,
      toStack: target,
      fromSlot,
      toSlot,
      fromSize: fromSlot + 1,
      elapsed: 0,
      duration: aceConfig.moveDurationSec,
      arcHeight: this.randomRange(aceConfig.minArc, aceConfig.maxArc),
    };

    this.pendingIncoming[target] += 1;

    sourceStack.container.removeChild(move.sprite);
    this.movingLayer.addChild(move.sprite);

    this.positionMovingCard(move, 0);
    this.moves.push(move);
  }

  private finishMove(moveIndex: number): void {
    const move = this.moves[moveIndex];
    this.moves.splice(moveIndex, 1);

    this.pendingIncoming[move.toStack] = Math.max(0, this.pendingIncoming[move.toStack] - 1);

    const targetStack = this.stacks[move.toStack];
    targetStack.cardIds.push(move.cardId);

    this.movingLayer.removeChild(move.sprite);
    targetStack.container.addChild(move.sprite);

    this.layoutStack(move.toStack);
  }

  private positionMovingCard(move: MoveState, t: number): void {
    const eased = this.easeInOut(t);

    const start = this.getCardPosition(move.fromStack, move.fromSlot, move.fromSize);
    const currentTargetSize = Math.max(move.toSlot + 1, this.stacks[move.toStack].cardIds.length + 1);
    const end = this.getCardPosition(move.toStack, move.toSlot, currentTargetSize);
    const controlX = (start.x + end.x) * 0.5;
    const controlY = Math.min(start.y, end.y) - move.arcHeight;

    const x = this.quadraticBezier(start.x, controlX, end.x, eased);
    const y = this.quadraticBezier(start.y, controlY, end.y, eased);

    move.sprite.position.set(x, y);
    move.sprite.rotation = (end.x - start.x) * 0.0008 * Math.sin(eased * Math.PI);
  }

  private refreshMovingCards(): void {
    for (const move of this.moves) {
      const t = Math.min(1, move.elapsed / move.duration);
      this.positionMovingCard(move, t);
    }
  }

  private layoutStacks(): void {
    const sidePadding = this.boardWidth * aceConfig.stackSidePadding;
    const usableWidth = Math.max(40, this.boardWidth - sidePadding * 2);
    const step = usableWidth / Math.max(1, aceConfig.stackCount - 1);

    const baseY = this.getStackBaseY();

    for (let i = 0; i < this.stacks.length; i += 1) {
      const x = sidePadding + step * i - this.cardWidth * 0.5;
      this.stacks[i].container.position.set(x, baseY);
    }
  }

  private layoutAllStaticCards(): void {
    for (let i = 0; i < this.stacks.length; i += 1) {
      this.layoutStack(i);
    }
  }

  private layoutStack(stackIndex: number): void {
    const stack = this.stacks[stackIndex];
    const reveal = this.getRevealForSize(stack.cardIds.length);

    for (let i = 0; i < stack.cardIds.length; i += 1) {
      const cardId = stack.cardIds[i];
      const sprite = this.cards[cardId];

      sprite.width = this.cardWidth;
      sprite.height = this.cardHeight;
      sprite.position.set(0, -i * reveal);
      sprite.zIndex = i;
    }
  }

  private getCardPosition(stackIndex: number, slotIndex: number, stackSize: number): { x: number; y: number } {
    const stackPos = this.stacks[stackIndex].container.position;
    const reveal = this.getRevealForSize(stackSize);
    return { x: stackPos.x, y: stackPos.y - slotIndex * reveal };
  }

  private getRevealForSize(stackSize: number): number {
    if (stackSize <= 1) {
      return this.cardRevealY;
    }

    const maxRise = this.getMaxStackRise();
    const naturalRise = (stackSize - 1) * this.cardRevealY;
    if (naturalRise <= maxRise) {
      return this.cardRevealY;
    }

    return maxRise / Math.max(1, stackSize - 1);
  }

  private getStackBaseY(): number {
    const bottomY = this.boardY + this.boardHeight * (1 - aceConfig.stackBottomPadding);
    return bottomY - this.cardHeight;
  }

  private getMaxStackRise(): number {
    const topY = this.boardY + this.boardHeight * aceConfig.stackTopPadding;
    return Math.max(0, this.getStackBaseY() - topY);
  }

  private quadraticBezier(p0: number, p1: number, p2: number, t: number): number {
    const i = 1 - t;
    return i * i * p0 + 2 * i * t * p1 + t * t * p2;
  }

  private easeInOut(t: number): number {
    return 0.5 - 0.5 * Math.cos(Math.PI * t);
  }

  private randomRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }
}




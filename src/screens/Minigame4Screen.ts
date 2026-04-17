import {
  Container,
  Graphics,
  Sprite,
  Text,
  Texture,
  Ticker,
  type DisplayObject,
  type FederatedPointerEvent,
} from "pixi.js";
import { Header } from "../minigames/minigame2/Header";
import { mergeChainsConfig } from "../minigames/minigame4/mergeChains";
import { minigame4StartLevel } from "../minigames/minigame4/startLevel";
import type {
  GeneratorBehavior,
  MergeNode,
  PrimitiveShape,
  StartLevelConfig,
} from "../minigames/minigame4/types";
import { AdaptiveScreen } from "./AdaptiveScreen";

type ItemDefinition = MergeNode & {
  spawnsItemKey?: string;
};

type BoardItem = {
  id: number;
  itemKey: string;
  col: number;
  row: number;
  chargesLeft?: number;
  cooldownLeftSec?: number;
};

type BoardItemView = {
  root: Container;
  bg: Graphics;
  iconHolder: Container;
  grade: Text;
  cooldown: Text;
  border: Graphics;
};

type DragState = {
  itemId: number;
  pointerId: number;
  startGlobalX: number;
  startGlobalY: number;
  startCol: number;
  startRow: number;
  moved: boolean;
};

const screenConfig = {
  title: "Prism Merge",
  hudHeightRatio: 0.12,
  minHudHeight: 82,
  boardPadding: 12,
  cellGap: 4,
  boardBg: 0x152033,
  boardGrid: 0x24314c,
  panelBg: 0x20304f,
  panelStroke: 0x3f5786,
  textMain: 0xf8fafc,
  textDim: 0xb6c3e0,
  energyColor: 0xfacc15,
  dragThreshold: 10,
  maxToastSec: 2.6,
} as const;

const baseGeneratorDefinitions: Record<string, ItemDefinition> = {
  "generator-alpha": {
    key: "generator-alpha",
    label: "Alpha Generator",
    chainId: "generator-alpha",
    grade: 0,
    color: 0xfb7185,
    shape: "star",
    generatesChainId: "ember",
    generatorBehavior: { kind: "charges", chargesPerCycle: 30, cooldownSec: 120 },
    spawnsItemKey: "ember-1",
  },
  "generator-beta": {
    key: "generator-beta",
    label: "Beta Generator",
    chainId: "generator-beta",
    grade: 0,
    color: 0x38bdf8,
    shape: "cross",
    generatesChainId: "mist",
    generatorBehavior: { kind: "charges", chargesPerCycle: 20, cooldownSec: 20 },
    spawnsItemKey: "mist-1",
  },
};

export class Minigame4Screen extends AdaptiveScreen {
  private readonly onBack: () => void;
  private readonly header: Header;
  private readonly hudBg: Graphics;
  private readonly boardBg: Graphics;
  private readonly boardGrid: Graphics;
  private readonly itemsLayer: Container;
  private readonly footerBg: Graphics;
  private readonly energyText: Text;
  private readonly statusText: Text;
  private readonly detailsText: Text;
  private readonly chainsText: Text;
  private readonly toastText: Text;

  private readonly itemDefinitions = new Map<string, ItemDefinition>();
  private readonly nextGradeByKey = new Map<string, string>();
  private readonly items = new Map<number, BoardItem>();
  private readonly itemViews = new Map<number, BoardItemView>();

  private nextItemId = 1;
  private dragState: DragState | null = null;
  private toastLeftSec = 0;

  private boardCols = minigame4StartLevel.board.cols;
  private boardRows = minigame4StartLevel.board.rows;
  private energy = minigame4StartLevel.energy;

  private viewportWidth = 0;
  private viewportHeight = 0;
  private hudHeight = 0;
  private footerHeight = 0;
  private boardX = 0;
  private boardY = 0;
  private cellSize = 0;
  private boardPixelWidth = 0;
  private boardPixelHeight = 0;

  constructor(params?: { onBack?: () => void }) {
    super();

    this.onBack = params?.onBack ?? (() => {});
    this.header = new Header({ onBack: this.onBack, title: screenConfig.title });
    this.header.setProgressVisible(false);

    this.hudBg = new Graphics();
    this.boardBg = new Graphics();
    this.boardGrid = new Graphics();
    this.itemsLayer = new Container();
    this.footerBg = new Graphics();

    this.energyText = this.createLabel("Energy: 400", 26, screenConfig.energyColor, "700");
    this.statusText = this.createLabel("Tap generators to spawn items. Drag equal grades together to merge.", 18);
    this.detailsText = this.createLabel("", 16, screenConfig.textDim, "600");
    this.chainsText = this.createLabel("", 16, screenConfig.textMain, "600");
    this.toastText = this.createLabel("", 18, 0xffffff, "700");
    this.toastText.anchor.set(0.5);
    this.toastText.visible = false;

    this.addChild(
      this.boardBg,
      this.boardGrid,
      this.itemsLayer,
      this.hudBg,
      this.footerBg,
      this.energyText,
      this.statusText,
      this.detailsText,
      this.chainsText,
      this.toastText,
      this.header,
    );

    this.bootstrapDefinitions();
    this.loadStartLevel(minigame4StartLevel);

    this.eventMode = "static";
    this.on("pointermove", this.handlePointerMove);
    this.on("pointerup", this.handlePointerUp);
    this.on("pointerupoutside", this.handlePointerUp);
    this.on("pointercancel", this.handlePointerUp);

    Ticker.shared.add(this.update);
  }

  resize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;

    const minSide = Math.min(width, height);
    this.header.resize(width, height);
    this.header.setProgressVisible(false);

    const contentTop = this.header.contentTop;
    const remainingHeight = Math.max(200, height - contentTop);

    this.hudHeight = Math.max(screenConfig.minHudHeight, Math.round(minSide * screenConfig.hudHeightRatio));
    this.footerHeight = Math.max(110, Math.round(minSide * 0.18));

    const availableBoardHeight = Math.max(120, remainingHeight - this.hudHeight - this.footerHeight - screenConfig.boardPadding * 2);
    const availableBoardWidth = Math.max(120, width - screenConfig.boardPadding * 2);
    this.cellSize = Math.max(
      18,
      Math.floor(
        Math.min(
          (availableBoardWidth - screenConfig.cellGap * (this.boardCols - 1)) / this.boardCols,
          (availableBoardHeight - screenConfig.cellGap * (this.boardRows - 1)) / this.boardRows,
        ),
      ),
    );

    this.boardPixelWidth = this.boardCols * this.cellSize + (this.boardCols - 1) * screenConfig.cellGap;
    this.boardPixelHeight = this.boardRows * this.cellSize + (this.boardRows - 1) * screenConfig.cellGap;
    this.boardX = Math.round((width - this.boardPixelWidth) * 0.5);
    this.boardY = Math.round(contentTop + this.hudHeight + screenConfig.boardPadding);

    this.drawHud(contentTop, width);
    this.drawBoard();
    this.drawFooter(width, height);
    this.layoutTexts(contentTop, width, height, minSide);
    this.refreshAllViews();
  }

  override destroy(options?: Parameters<Container["destroy"]>[0]): void {
    Ticker.shared.remove(this.update);
    this.off("pointermove", this.handlePointerMove);
    this.off("pointerup", this.handlePointerUp);
    this.off("pointerupoutside", this.handlePointerUp);
    this.off("pointercancel", this.handlePointerUp);
    super.destroy(options);
  }

  private createLabel(text: string, fontSize: number, fill = screenConfig.textMain, fontWeight = "500"): Text {
    return new Text(text, {
      fill,
      fontFamily: "Arial",
      fontSize,
      fontWeight,
      wordWrap: true,
      wordWrapWidth: 800,
    });
  }

  private bootstrapDefinitions(): void {
    for (const item of Object.values(baseGeneratorDefinitions)) {
      this.itemDefinitions.set(item.key, item);
    }

    for (const chain of mergeChainsConfig) {
      chain.nodes.forEach((node, index) => {
        const item: ItemDefinition = {
          ...node,
          spawnsItemKey: node.generatesChainId ? `${node.generatesChainId}-1` : undefined,
        };

        this.itemDefinitions.set(item.key, item);

        const nextNode = chain.nodes[index + 1];
        if (nextNode) {
          this.nextGradeByKey.set(node.key, nextNode.key);
        }
      });
    }
  }

  private loadStartLevel(config: StartLevelConfig): void {
    this.items.clear();
    this.itemViews.clear();
    this.itemsLayer.removeChildren();
    this.nextItemId = 1;

    this.energy = config.energy;
    this.boardCols = config.board.cols;
    this.boardRows = config.board.rows;

    for (const entry of config.generators) {
      this.addItem({
        itemKey: entry.itemKey,
        col: entry.col,
        row: entry.row,
        chargesLeft: entry.chargesLeft,
        cooldownLeftSec: entry.cooldownLeftSec,
      });
    }

    for (const entry of config.items) {
      this.addItem({ itemKey: entry.itemKey, col: entry.col, row: entry.row });
    }

    this.updateInfoTexts();
  }

  private addItem(params: Omit<BoardItem, "id">): number {
    const id = this.nextItemId++;
    const item: BoardItem = { id, ...params };
    this.items.set(id, item);
    const view = this.createItemView(id);
    this.itemViews.set(id, view);
    this.itemsLayer.addChild(view.root);
    this.refreshItemView(id);
    return id;
  }

  private createItemView(itemId: number): BoardItemView {
    const root = new Container();
    root.eventMode = "static";
    root.cursor = "pointer";

    const bg = new Graphics();
    const iconHolder = new Container();
    const border = new Graphics();

    const grade = new Text("", {
      fill: 0xffffff,
      fontFamily: "Arial",
      fontSize: 14,
      fontWeight: "700",
    });
    grade.anchor.set(1, 1);

    const cooldown = new Text("", {
      fill: 0xffffff,
      fontFamily: "Arial",
      fontSize: 12,
      fontWeight: "700",
      align: "center",
    });
    cooldown.anchor.set(0.5, 0.5);

    root.addChild(bg, iconHolder, border, grade, cooldown);
    root.on("pointerdown", (event) => this.handleItemPointerDown(itemId, event));

    return { root, bg, iconHolder, grade, cooldown, border };
  }

  private refreshAllViews(): void {
    for (const itemId of this.items.keys()) {
      this.refreshItemView(itemId);
    }
    this.updateInfoTexts();
  }

  private refreshItemView(itemId: number): void {
    const item = this.items.get(itemId);
    const view = this.itemViews.get(itemId);
    if (!item || !view) {
      return;
    }

    const def = this.getDefinition(item.itemKey);
    const x = this.boardX + item.col * (this.cellSize + screenConfig.cellGap);
    const y = this.boardY + item.row * (this.cellSize + screenConfig.cellGap);

    view.root.position.set(x, y);
    view.root.zIndex = item.row * this.boardCols + item.col;
    view.root.alpha = this.dragState?.itemId === itemId ? 0.92 : 1;

    view.bg.clear();
    view.bg.beginFill(0x0f172a, 0.88);
    view.bg.lineStyle(2, def.color, 0.95);
    this.drawRoundedRect(view.bg, 0, 0, this.cellSize, this.cellSize, Math.max(4, this.cellSize * 0.18));
    view.bg.endFill();

    view.border.clear();
    if (this.dragState?.itemId === itemId) {
      view.border.lineStyle(3, 0xffffff, 0.9);
      this.drawRoundedRect(view.border, 1.5, 1.5, this.cellSize - 3, this.cellSize - 3, Math.max(4, this.cellSize * 0.18));
    }

    view.iconHolder.removeChildren();
    const icon = this.createItemVisual(def, this.cellSize * 0.55);
    icon.position.set(this.cellSize * 0.5, this.cellSize * 0.46);
    view.iconHolder.addChild(icon);

    view.grade.style.fontSize = Math.max(12, Math.round(this.cellSize * 0.22));
    view.grade.text = def.grade > 0 ? `G${def.grade}` : "GEN";
    view.grade.position.set(this.cellSize - 4, this.cellSize - 3);

    const isCoolingDown = (item.cooldownLeftSec ?? 0) > 0.05;
    const generatorBehavior = def.generatorBehavior;
    const chargesLeft = this.resolveCharges(item, generatorBehavior);
    view.cooldown.visible = isCoolingDown || generatorBehavior?.kind === "charges";
    view.cooldown.style.fontSize = Math.max(10, Math.round(this.cellSize * 0.18));

    if (isCoolingDown) {
      view.cooldown.text = `${Math.ceil(item.cooldownLeftSec ?? 0)}s`;
      view.cooldown.position.set(this.cellSize * 0.5, this.cellSize * 0.14);
    } else if (generatorBehavior?.kind === "charges") {
      view.cooldown.text = `${chargesLeft}/${generatorBehavior.chargesPerCycle ?? 0}`;
      view.cooldown.position.set(this.cellSize * 0.5, this.cellSize * 0.14);
    } else {
      view.cooldown.text = "∞";
      view.cooldown.position.set(this.cellSize * 0.5, this.cellSize * 0.14);
    }
  }

  private drawHud(contentTop: number, width: number): void {
    this.hudBg.clear();
    this.hudBg.beginFill(screenConfig.panelBg, 0.96);
    this.hudBg.lineStyle(2, screenConfig.panelStroke, 1);
    this.drawRoundedRect(this.hudBg, 10, contentTop + 8, width - 20, this.hudHeight - 8, 18);
    this.hudBg.endFill();
  }

  private drawBoard(): void {
    this.boardBg.clear();
    this.boardBg.beginFill(screenConfig.boardBg, 1);
    this.boardBg.lineStyle(2, 0x475569, 1);
    this.drawRoundedRect(this.boardBg, this.boardX - 8, this.boardY - 8, this.boardPixelWidth + 16, this.boardPixelHeight + 16, 18);
    this.boardBg.endFill();

    this.boardGrid.clear();
    this.boardGrid.beginFill(screenConfig.boardGrid, 1);
    for (let row = 0; row < this.boardRows; row += 1) {
      for (let col = 0; col < this.boardCols; col += 1) {
        const x = this.boardX + col * (this.cellSize + screenConfig.cellGap);
        const y = this.boardY + row * (this.cellSize + screenConfig.cellGap);
        this.drawRoundedRect(this.boardGrid, x, y, this.cellSize, this.cellSize, Math.max(3, this.cellSize * 0.14));
      }
    }
    this.boardGrid.endFill();
  }

  private drawFooter(width: number, height: number): void {
    const y = this.boardY + this.boardPixelHeight + 14;
    const footerHeight = Math.max(70, height - y - 10);

    this.footerBg.clear();
    this.footerBg.beginFill(screenConfig.panelBg, 0.96);
    this.footerBg.lineStyle(2, screenConfig.panelStroke, 1);
    this.drawRoundedRect(this.footerBg, 10, y, width - 20, footerHeight, 18);
    this.footerBg.endFill();
  }

  private layoutTexts(contentTop: number, width: number, height: number, minSide: number): void {
    this.energyText.style.fontSize = Math.max(20, Math.round(minSide * 0.042));
    this.statusText.style.fontSize = Math.max(13, Math.round(minSide * 0.022));
    this.detailsText.style.fontSize = Math.max(12, Math.round(minSide * 0.019));
    this.chainsText.style.fontSize = Math.max(12, Math.round(minSide * 0.02));
    this.toastText.style.fontSize = Math.max(14, Math.round(minSide * 0.024));

    this.energyText.position.set(24, contentTop + 18);
    this.energyText.style.wordWrapWidth = width - 48;

    this.statusText.position.set(24, contentTop + 18 + this.energyText.height + 6);
    this.statusText.style.wordWrapWidth = width - 48;

    const footerY = this.boardY + this.boardPixelHeight + 24;
    this.detailsText.position.set(24, footerY);
    this.detailsText.style.wordWrapWidth = width - 48;

    this.chainsText.position.set(24, footerY + this.detailsText.height + 10);
    this.chainsText.style.wordWrapWidth = width - 48;

    this.toastText.position.set(width * 0.5, Math.min(height - 26, this.boardY - 14));
  }

  private update = (delta: number): void => {
    const dt = delta / 60;
    let anyCooldownChanged = false;

    for (const item of this.items.values()) {
      const def = this.getDefinition(item.itemKey);
      const behavior = def.generatorBehavior;
      if (!behavior || behavior.kind !== "charges") {
        continue;
      }

      if ((item.cooldownLeftSec ?? 0) > 0) {
        item.cooldownLeftSec = Math.max(0, (item.cooldownLeftSec ?? 0) - dt);
        anyCooldownChanged = true;

        if ((item.cooldownLeftSec ?? 0) <= 0.0001) {
          item.cooldownLeftSec = 0;
          item.chargesLeft = behavior.chargesPerCycle ?? 0;
          this.showToast(`${def.label} recharged`);
        }
      }
    }

    if (anyCooldownChanged) {
      for (const item of this.items.values()) {
        this.refreshItemView(item.id);
      }
      this.updateInfoTexts();
    }

    if (this.toastLeftSec > 0) {
      this.toastLeftSec = Math.max(0, this.toastLeftSec - dt);
      this.toastText.visible = this.toastLeftSec > 0;
      this.toastText.alpha = Math.min(1, this.toastLeftSec / 0.35, 1);
    } else if (this.toastText.visible) {
      this.toastText.visible = false;
    }
  };

  private handleItemPointerDown(itemId: number, event: FederatedPointerEvent): void {
    event.stopPropagation();

    const item = this.items.get(itemId);
    if (!item) {
      return;
    }

    this.dragState = {
      itemId,
      pointerId: event.pointerId,
      startGlobalX: event.global.x,
      startGlobalY: event.global.y,
      startCol: item.col,
      startRow: item.row,
      moved: false,
    };

    const view = this.itemViews.get(itemId);
    if (view) {
      this.itemsLayer.addChild(view.root);
      this.refreshItemView(itemId);
    }
  }

  private handlePointerMove = (event: FederatedPointerEvent): void => {
    if (!this.dragState || this.dragState.pointerId !== event.pointerId) {
      return;
    }

    const item = this.items.get(this.dragState.itemId);
    const view = this.itemViews.get(this.dragState.itemId);
    if (!item || !view) {
      return;
    }

    const dx = event.global.x - this.dragState.startGlobalX;
    const dy = event.global.y - this.dragState.startGlobalY;
    if (!this.dragState.moved && Math.hypot(dx, dy) >= screenConfig.dragThreshold) {
      this.dragState.moved = true;
    }

    if (this.dragState.moved) {
      view.root.position.set(event.global.x - this.cellSize * 0.5, event.global.y - this.cellSize * 0.5);
    }
  };

  private handlePointerUp = (event: FederatedPointerEvent): void => {
    if (!this.dragState || this.dragState.pointerId !== event.pointerId) {
      return;
    }

    const drag = this.dragState;
    this.dragState = null;

    const item = this.items.get(drag.itemId);
    if (!item) {
      return;
    }

    if (!drag.moved) {
      this.tryActivateGenerator(item.id);
      this.refreshItemView(item.id);
      return;
    }

    const dropCell = this.globalToCell(event.global.x, event.global.y);
    if (!dropCell) {
      item.col = drag.startCol;
      item.row = drag.startRow;
      this.refreshItemView(item.id);
      return;
    }

    const occupying = this.getItemAtCell(dropCell.col, dropCell.row, item.id);
    if (!occupying) {
      item.col = dropCell.col;
      item.row = dropCell.row;
      this.refreshItemView(item.id);
      this.updateInfoTexts();
      return;
    }

    const merged = this.tryMergeItems(item.id, occupying.id);
    if (!merged) {
      item.col = drag.startCol;
      item.row = drag.startRow;
      this.refreshItemView(item.id);
    }
  };

  private tryActivateGenerator(itemId: number): void {
    const item = this.items.get(itemId);
    if (!item) {
      return;
    }

    const def = this.getDefinition(item.itemKey);
    if (!def.generatesChainId || !def.spawnsItemKey) {
      return;
    }

    if (this.energy <= 0) {
      this.showToast("Out of energy");
      return;
    }

    const behavior = def.generatorBehavior;
    if (behavior?.kind === "charges") {
      if ((item.cooldownLeftSec ?? 0) > 0) {
        this.showToast(`${def.label} is cooling down`);
        return;
      }

      const chargesLeft = this.resolveCharges(item, behavior);
      if (chargesLeft <= 0) {
        item.cooldownLeftSec = behavior.cooldownSec ?? 0;
        this.showToast(`${def.label} starts recharging`);
        this.refreshItemView(item.id);
        this.updateInfoTexts();
        return;
      }
    }

    const spawnCell = this.findNearestFreeCell(item.col, item.row);
    if (!spawnCell) {
      this.showToast("Board is full");
      this.refreshItemView(item.id);
      return;
    }

    this.energy = Math.max(0, this.energy - 1);
    this.addItem({ itemKey: def.spawnsItemKey, col: spawnCell.col, row: spawnCell.row });

    if (behavior?.kind === "charges") {
      item.chargesLeft = Math.max(0, this.resolveCharges(item, behavior) - 1);
      if ((item.chargesLeft ?? 0) <= 0) {
        item.cooldownLeftSec = behavior.cooldownSec ?? 0;
      }
    }

    this.showToast(`+ ${this.getDefinition(def.spawnsItemKey).label}`);
    this.refreshItemView(item.id);
    this.updateInfoTexts();
  }

  private tryMergeItems(sourceId: number, targetId: number): boolean {
    const source = this.items.get(sourceId);
    const target = this.items.get(targetId);
    if (!source || !target) {
      return false;
    }

    const sourceDef = this.getDefinition(source.itemKey);
    const targetDef = this.getDefinition(target.itemKey);

    if (sourceDef.chainId !== targetDef.chainId || sourceDef.grade !== targetDef.grade) {
      this.showToast("Only equal items of the same chain can merge");
      return false;
    }

    const nextKey = this.nextGradeByKey.get(source.itemKey);
    if (!nextKey) {
      this.showToast("This is the top grade for the chain");
      return false;
    }

    source.col = target.col;
    source.row = target.row;
    source.itemKey = nextKey;
    source.chargesLeft = undefined;
    source.cooldownLeftSec = undefined;

    this.removeItem(targetId);
    this.refreshItemView(sourceId);
    this.updateInfoTexts();

    const nextDef = this.getDefinition(nextKey);
    this.showToast(`Merged into ${nextDef.label}`);
    return true;
  }

  private removeItem(itemId: number): void {
    this.items.delete(itemId);
    const view = this.itemViews.get(itemId);
    if (view) {
      view.root.destroy({ children: true });
      this.itemViews.delete(itemId);
    }
  }

  private updateInfoTexts(): void {
    this.energyText.text = `Energy: ${this.energy} / 400`;

    const generatorStatuses = Array.from(this.items.values())
      .map((item) => {
        const def = this.getDefinition(item.itemKey);
        if (!def.generatesChainId) {
          return null;
        }

        const behavior = def.generatorBehavior;
        if (behavior?.kind === "charges") {
          const cooldownLeft = Math.ceil(item.cooldownLeftSec ?? 0);
          if (cooldownLeft > 0) {
            return `${def.label}: cooldown ${cooldownLeft}s`;
          }
          return `${def.label}: ${this.resolveCharges(item, behavior)}/${behavior.chargesPerCycle ?? 0} taps`;
        }

        return `${def.label}: infinite generator of ${def.generatesChainId}`;
      })
      .filter((value): value is string => Boolean(value));

    this.detailsText.text = [
      `Board: ${this.boardCols}x${this.boardRows} · Occupied: ${this.items.size}/${this.boardCols * this.boardRows}`,
      generatorStatuses.join(" · "),
    ].join("\n");

    this.chainsText.text = mergeChainsConfig
      .map((chain) => {
        const maxGrade = chain.nodes[chain.nodes.length - 1]?.grade ?? 0;
        const overrideHint = chain.nodes.some((node) => node.imageUrl)
          ? "custom images configured"
          : "imageUrl slots ready for overrides";
        return `${chain.label}: ${chain.nodes.length} nodes (grades 1-${maxGrade}), ${overrideHint}.`;
      })
      .join("\n");
  }

  private resolveCharges(item: BoardItem, behavior?: GeneratorBehavior): number {
    if (!behavior || behavior.kind !== "charges") {
      return 0;
    }

    return item.chargesLeft ?? behavior.chargesPerCycle ?? 0;
  }

  private findNearestFreeCell(originCol: number, originRow: number): { col: number; row: number } | null {
    const maxRadius = Math.max(this.boardCols, this.boardRows);
    for (let radius = 1; radius <= maxRadius; radius += 1) {
      for (let row = Math.max(0, originRow - radius); row <= Math.min(this.boardRows - 1, originRow + radius); row += 1) {
        for (let col = Math.max(0, originCol - radius); col <= Math.min(this.boardCols - 1, originCol + radius); col += 1) {
          const onRing = Math.abs(col - originCol) === radius || Math.abs(row - originRow) === radius;
          if (!onRing) {
            continue;
          }
          if (!this.getItemAtCell(col, row)) {
            return { col, row };
          }
        }
      }
    }
    return null;
  }

  private getItemAtCell(col: number, row: number, excludeId?: number): BoardItem | null {
    for (const item of this.items.values()) {
      if (excludeId !== undefined && item.id === excludeId) {
        continue;
      }
      if (item.col === col && item.row === row) {
        return item;
      }
    }
    return null;
  }

  private globalToCell(globalX: number, globalY: number): { col: number; row: number } | null {
    const localX = globalX - this.boardX;
    const localY = globalY - this.boardY;
    if (localX < 0 || localY < 0 || localX > this.boardPixelWidth || localY > this.boardPixelHeight) {
      return null;
    }

    const stride = this.cellSize + screenConfig.cellGap;
    const col = Math.floor(localX / stride);
    const row = Math.floor(localY / stride);
    if (col < 0 || row < 0 || col >= this.boardCols || row >= this.boardRows) {
      return null;
    }

    const cellX = localX - col * stride;
    const cellY = localY - row * stride;
    if (cellX > this.cellSize || cellY > this.cellSize) {
      return null;
    }

    return { col, row };
  }

  private createItemVisual(def: ItemDefinition, size: number): DisplayObject {
    if (def.imageUrl) {
      const sprite = new Sprite(Texture.from(def.imageUrl));
      sprite.anchor.set(0.5);
      const scale = size / Math.max(1, Math.max(sprite.texture.width || 1, sprite.texture.height || 1));
      sprite.scale.set(scale);
      return sprite;
    }

    const g = new Graphics();
    g.beginFill(def.color, 1);
    this.drawPrimitive(g, def.shape, size);
    g.endFill();
    return g;
  }

  private drawPrimitive(g: Graphics, shape: PrimitiveShape, size: number): void {
    const half = size * 0.5;
    switch (shape) {
      case "circle":
        g.drawCircle(0, 0, half);
        break;
      case "square":
        g.drawRect(-half, -half, size, size);
        break;
      case "diamond":
        g.drawPolygon([0, -half, half, 0, 0, half, -half, 0]);
        break;
      case "triangle":
        g.drawPolygon([0, -half, half, half, -half, half]);
        break;
      case "hex": {
        const points: number[] = [];
        for (let i = 0; i < 6; i += 1) {
          const angle = -Math.PI / 2 + (Math.PI / 3) * i;
          points.push(Math.cos(angle) * half, Math.sin(angle) * half);
        }
        g.drawPolygon(points);
        break;
      }
      case "star": {
        const points: number[] = [];
        for (let i = 0; i < 10; i += 1) {
          const radius = i % 2 === 0 ? half : half * 0.45;
          const angle = -Math.PI / 2 + (Math.PI / 5) * i;
          points.push(Math.cos(angle) * radius, Math.sin(angle) * radius);
        }
        g.drawPolygon(points);
        break;
      }
      case "pill":
        this.drawRoundedRect(g, -half, -half * 0.62, size, size * 0.68, size * 0.3);
        break;
      case "cross":
        g.drawRect(-half * 0.22, -half, half * 0.44, size);
        g.drawRect(-half, -half * 0.22, size, half * 0.44);
        break;
    }
  }

  private drawRoundedRect(g: Graphics, x: number, y: number, width: number, height: number, radius: number): void {
    g.drawRoundedRect(x, y, width, height, radius);
  }

  private getDefinition(itemKey: string): ItemDefinition {
    const def = this.itemDefinitions.get(itemKey);
    if (!def) {
      throw new Error(`Unknown item key: ${itemKey}`);
    }
    return def;
  }

  private showToast(message: string): void {
    this.toastText.text = message;
    this.toastText.visible = true;
    this.toastText.alpha = 1;
    this.toastLeftSec = screenConfig.maxToastSec;
  }
}

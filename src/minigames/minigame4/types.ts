export type PrimitiveShape = "circle" | "square" | "diamond" | "triangle" | "hex" | "star" | "pill" | "cross";

export type GeneratorBehavior = {
  kind: "charges" | "infinite";
  chargesPerCycle?: number;
  cooldownSec?: number;
};

export type MergeNode = {
  key: string;
  label: string;
  chainId: string;
  grade: number;
  color: number;
  shape: PrimitiveShape;
  imageUrl?: string;
  generatesChainId?: string;
  generatorBehavior?: GeneratorBehavior;
};

export type MergeChainConfig = {
  id: string;
  label: string;
  description: string;
  nodes: MergeNode[];
};

export type BoardCellConfig = {
  col: number;
  row: number;
  itemKey: string;
};

export type GeneratorStateConfig = {
  itemKey: string;
  col: number;
  row: number;
  chargesLeft?: number;
  cooldownLeftSec?: number;
};

export type StartLevelConfig = {
  energy: number;
  board: {
    cols: number;
    rows: number;
  };
  generators: GeneratorStateConfig[];
  items: BoardCellConfig[];
};

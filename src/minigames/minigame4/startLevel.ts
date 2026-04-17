import type { StartLevelConfig } from "./types";

export const minigame4StartLevel: StartLevelConfig = {
  energy: 400,
  board: {
    cols: 10,
    rows: 15,
  },
  generators: [
    {
      itemKey: "generator-alpha",
      col: 1,
      row: 13,
      chargesLeft: 30,
      cooldownLeftSec: 0,
    },
    {
      itemKey: "generator-beta",
      col: 8,
      row: 13,
      chargesLeft: 20,
      cooldownLeftSec: 0,
    },
  ],
  items: [],
};

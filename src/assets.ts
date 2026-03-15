export type MenuAssetKey =
  | "button"
  | "minigame1-icon"
  | "minigame2-icon"
  | "minigame3-icon";

export const MENU_ASSETS: Record<MenuAssetKey, string> = {
  button: new URL("../images/menu/button.png", import.meta.url).href,
  "minigame1-icon": new URL(
    "../images/menu/minigame1-icon.png",
    import.meta.url,
  ).href,
  "minigame2-icon": new URL(
    "../images/menu/minigame2-icon.png",
    import.meta.url,
  ).href,
  "minigame3-icon": new URL(
    "../images/menu/minigame3-icon.png",
    import.meta.url,
  ).href,
};

# soft-test-task

Pixi.js + TypeScript test assignment with three mini-games and a shared screen/navigation framework.

## Stack
- TypeScript
- Pixi.js v7
- Vite

## Run
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
npm run preview
```

## GitHub Pages deployment
1. Push the repository to GitHub.
2. In **Settings -> Pages**, set **Source** to **GitHub Actions**.
3. Push to `main` or `master` (or run the workflow manually from the **Actions** tab).
4. The workflow publishes the Vite `dist` folder to GitHub Pages automatically.

> Note: `vite.config.ts` already uses `base: "/soft-test-task/"`, so the published site works correctly at `https://<your-account>.github.io/soft-test-task/`. If you rename the repository, update the `base` value as well.

## Project Structure
- `src/components` — shared app infrastructure and reusable UI components.
- `src/screens` — top-level screens (`Loading`, `Menu`, `Minigame1/2/3`).
- `src/minigames/minigame2` — dialogue-specific domain code and reusable minigame header.
- `images` — sprite assets used by menu and minigames.

## Mini-games
1. `Ace of Shadows`
- 144 card sprites (`card.png`) in two stacks.
- Every 1 second, top card flies from stack 1 to stack 2.
- Flight animation duration is 2 seconds.
- Moving cards are rendered in a dedicated moving layer for stable Z-order.

2. `Magic Words`
- Dialogue parser + store using API data.
- Message-by-message reveal on click.
- Avatars, inline emoji images, custom bubble layout.
- Scrollbar supports wheel + drag + touch-style pointer drag.

3. `Phoenix Flame`
- Particle-effect fire demo using only particle sprites (`particle1/2/3`) and `bg`.
- At most 10 particle sprites active simultaneously.
- Assets for minigame 3 are loaded only on first open, then reused from cache.

## Notes
- Screens are responsive and implement `resize(width, height)`.
- `Header` is reused across minigames for consistent top UI and back navigation.
- `Game` orchestrates startup loading, menu routing, and screen transitions.

# Osynk — Project Context

## What this is
Osynk is a browser rhythm/reflex game in the spirit of osu!: hit circles and sliders appear with a
shrinking approach ring over a 3D starfield, you click (or press Z, X or Space) on the beat, and score and
combo build up. Single player, no account, no backend. Live at https://osynk.vercel.app/.

## Stack
- React 19 + TypeScript 5.8 + Vite 6
- Three.js via React Three Fiber, Drei, Postprocessing (Bloom, Vignette)
- Zustand for game state (`src/store/useGameStore.ts`)
- Tailwind CSS v4 (via `@tailwindcss/vite`), `motion` for UI animation, `lucide-react` icons
- Static deploy on Vercel. There is no server, database, or AI API.

## Commands
```bash
npm install        # Node.js 22.12+
npm run dev        # Vite dev server on :5173
npm run lint       # tsc --noEmit (typecheck)
npm test           # vitest (game logic)
npm run build      # production bundle in dist/
npm run preview    # serve dist/ locally
```

## Layout
- `src/App.tsx` — HUD and menus (DOM overlay on top of the canvas)
- `src/components/CosmicCanvas.tsx` — R3F scene, cursor, input handling
- `src/components/HitCircles.tsx` — circle and slider rendering
- `src/components/ForceFields.tsx` — click ripple effects
- `src/store/useGameStore.ts` — game loop, spawning, judging, scoring
- `src/utils/gameplay.ts` — pure game rules (hit windows, scoring, spawn bounds)

## Conventions
- Game rules (timing windows, scoring, health, spawning) live in the store or pure functions in
  `src/utils/`, never in components, so they can be unit tested without WebGL.
- Use the game clock, never raw `Date.now()`, for anything that must stop while paused.
- Never mutate store state in place; always return new objects from `set`.
- Spawn positions must stay inside the visible play field for the current aspect ratio.
- UI: Tailwind utilities with the theme tokens in `src/index.css`. Every control needs hover,
  `:focus-visible`, active and disabled states and an accessible name. Respect
  `prefers-reduced-motion`.
- No secrets in the client bundle. Nothing is read from `process.env` at runtime.
- No new dependency without asking first.

## Verification before a PR
`npm run lint`, `npm test`, `npm run build` all pass, and the change has been looked at in a real
browser at desktop (1440x900) and phone (390x844) sizes.

## Roadmap
1. Done: core gameplay fixes (health instead of instant fail, pausable clock, Z/X hits, on-screen spawns)
2. Done: remove AI Studio leftovers and unused server/AI dependencies, README, LICENSE
3. Music generated in the browser with Web Audio (no audio files, no new dependency), beat-synced spawning, hit sounds
4. Judgement feedback, health bar, accuracy, results screen, local high scores
5. Design and accessibility polish, performance (bundle size, render churn)
6. CI (typecheck, test, build) on every PR

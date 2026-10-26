# Osynk

A browser rhythm/reflex game in the spirit of *osu!*, set in a 3D starfield. Circles and sliders
appear with a shrinking approach ring. Hit them as the ring closes to build score and combo. Misses
drain your health bar, and the run ends when it's empty.

**Play:** https://osynk.vercel.app/

## How to play

- Move the cursor over a circle and **click**, or press **Z**, **X** or **Space**, as the approach ring meets the circle.
- Hitting close to the timing point scores 300, a little off scores 100 or 50. Each hit is multiplied by your combo.
- Tapping a circle far too early counts as a miss, so mashing doesn't work.
- Misses break your combo and drain health. Good hits restore a little.
- Use the gear button during a run to pause or quit.

| Mode | Pace | Miss penalty |
|---|---|---|
| Easy | Slow circles, long approach | 10% health |
| Normal | The standard pace | 15% health |
| Insane | Fast spawns, short approach | 20% health |
| Practice | Relaxed pace | None: no fail, combo kept on miss |

## Tech stack

- React 19, TypeScript, Vite 6
- Three.js through React Three Fiber, Drei and Postprocessing (bloom, vignette)
- Zustand for game state
- Tailwind CSS v4 and `motion` for the menus and HUD
- Vitest for unit tests

It is a static site with no backend. Deployed on Vercel.

## Run locally

Requires Node.js 22.12 or newer.

```bash
npm install
npm run dev        # dev server at http://localhost:5173
npm run lint       # typecheck
npm test           # unit tests
npm run build      # production build in dist/
npm run preview    # serve the production build
```

## Project structure

```
src/
  App.tsx                    Menus and HUD (DOM overlay on the canvas)
  components/
    CosmicCanvas.tsx         3D scene, cursor and input handling
    HitCircles.tsx           Circle and slider visuals
    ForceFields.tsx          Click ripple effects
  store/useGameStore.ts      Game loop, spawning, judging, scoring, health
  utils/gameplay.ts          Pure game rules (hit windows, scoring, spawn bounds)
```

Game rules live in the store and in `utils/gameplay.ts`, not in components, so they can be tested
without WebGL.

## License

[Apache 2.0](./LICENSE)

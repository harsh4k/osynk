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
- Circles land on the beat of a soundtrack generated live in your browser. Every mode has its own tempo.
- **Esc** pauses, **M** mutes. The gear button during a run also has pause, mute and quit. Switching tabs pauses automatically.

| Mode | Tempo | A circle every | Miss penalty |
|---|---|---|---|
| Easy | 90 BPM | 2 beats (1.33 s) | 10% health |
| Normal | 150 BPM | 2 beats (0.8 s) | 15% health |
| Insane | 150 BPM | 1 beat (0.4 s) | 20% health |
| Practice | 120 BPM | 2 beats (1 s) | None: no fail, combo kept on miss |

## Tech stack

- React 19, TypeScript, Vite 6
- Three.js through React Three Fiber, Drei and Postprocessing (bloom, vignette)
- Zustand for game state
- Web Audio API for the generated music and sound effects (no audio files)
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
  audio/
    synth.ts                 Generated track and sound effects
    engine.ts                AudioContext, beat scheduling, mute
    useGameAudio.ts          Plays effects for hits, misses, pause and fail
  store/useGameStore.ts      Game loop, spawning, judging, scoring, health
  utils/gameplay.ts          Pure game rules (hit windows, scoring, spawn bounds)
  utils/rhythm.ts            Beat-grid math shared by spawning and music
```

Game rules live in the store and in `utils/gameplay.ts`, not in components, so they can be tested
without WebGL.

## License

[Apache 2.0](./LICENSE)

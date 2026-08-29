# Osynk

A rhythm/reflex clicking game rendered in 3D — think *osu!* set inside a cosmic particle field. Circles and sliders spawn in time, you click them at the right moment for accuracy, and combos/score build as you go.

**Live:** https://osynk.vercel.app/

## Gameplay

- **Hit circles & sliders** spawn with a shrinking timing ring — click at the sweet spot for max accuracy.
- **Combo & scoring** system with a fail state when accuracy drops too far.
- **Difficulty modes** — Easy, Normal, Insane, and Practice (no combo loss on miss).
- Full-screen 3D scene (`CosmicCanvas`) with force-field/curl-noise-driven particle motion behind the gameplay layer.

## Tech Stack

- React 19 + Vite 6
- Three.js / React Three Fiber / Drei / Postprocessing (3D rendering)
- Zustand (game state — score, combo, targets, difficulty)
- Express + WebSocket (`ws`) backend, SQLite (`better-sqlite3`) for persistence
- Google Gemini API (`@google/genai`)

## Run Locally

```powershell
npm install
npm run dev
```
Requires a `.env` — see `.env.example`.

## Structure

- `src/components/CosmicCanvas.tsx` — the 3D background scene
- `src/components/HitCircles.tsx` — hit-circle/slider rendering & click handling
- `src/components/ForceFields.tsx` — particle force-field effects
- `src/store/useGameStore.ts` — Zustand store driving game loop, difficulty, scoring
- `src/utils/curlNoise.ts` — noise field used for particle motion
- `server.ts` — Express + Vite middleware server

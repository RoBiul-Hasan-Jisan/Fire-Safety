# FLAMEFALL — Fire Safety: Moon to Mars

Survive the Fire. Decode the Science. Save the Mission.

## Run

```
npm install
npm run dev   # http://localhost:3000
```

Next.js 14 · TypeScript · React Three Fiber · Tailwind.

## Structure

- `components/Scene.tsx` – 3D habitat, flame, smoke, alarm light (no game logic)
- `lib/sim.ts` – data-driven simulation, AI analyst, scoring (pure functions)
- `lib/useGame.ts` – game state hook (modes, planet, timer)
- `data/experiments.json` – **placeholder** records (`PH-xxx`). Not NASA data.
- `app/page.tsx` – mission-control UI and all six modes

## Plugging in real NASA data

Replace `data/experiments.json` with records matching `Experiment` in `lib/types.ts`
(id, material, o2, pressure, airflow, g, outcome, source). Everything (similar-experiment
search, confidence, Data Detective) reads from it. The growth model in `rate()` is a
simulated heuristic; calibrate or replace it with a model fit to real data.

## Honesty rules

All telemetry, temperature, growth and scores are SIMULATED and labelled so. No NASA
measurement is invented; placeholder rows carry `source: "placeholder-illustrative"`.

## 3D architecture (v2)
- **React Three Fiber** → `components/Scene.tsx` (declarative scene, no game logic).
- **Three.js / WebGL2** → renderer. WebGPU is *detected* (badge in the top bar) but not enabled: R3F v8 cannot await the async WebGPURenderer. To use it, upgrade to R3F v9 + a three version with WebGPURenderer and pass it through `gl`.
- **GLB** → drop a model at `public/models/habitat.glb`. It is auto-loaded; otherwise a procedural habitat is used (`components/scene/Habitat.tsx`). Place the fire at the world origin or move `<Fire>` in `Scene.tsx`.
- **Shaders** → `components/scene/shaders.ts`: fbm-noise flame (round/blue in microgravity, tall/orange with buoyancy) and GPU smoke/ember particles.
- **Post-processing** → `components/scene/Effects.tsx`: bloom (grows with fire), screen-space heat shimmer, vignette.
Run `npm install` again after updating (adds `@react-three/postprocessing`, `postprocessing`).

## Evidence Dashboard (answers the Flame in Freefall challenge)
Top bar → **Evidence Dashboard**: (1) summarizes outcomes by gravity band, (2) ranks hazards by material × gravity with an O₂ sweep, (3) ranks experiments by relevance to the live scenario (Replay loads one into the 3D scene), (4) gives an AI interpretation and recommended action.
**Load real data:** click *Load CSV* (template at `/experiments-template.csv`). Columns: id,title,material,o2,pressure,airflow,g,outcome,source. Materials must be cotton/paper/foam/acrylic and outcomes extinguishes/slow/persistent/rapid; airflow is relative 0..1. Other rows are skipped and listed. The badge turns from PLACEHOLDER to USER DATASET once loaded.

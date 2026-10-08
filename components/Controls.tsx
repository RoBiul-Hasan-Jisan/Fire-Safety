'use client';
import { useState } from 'react';
import { MATERIALS, OUTCOMES } from '@/lib/constants';
import { EXPERIMENTS, classify, randomExperiment, simulateBuild } from '@/lib/sim';
import type { Action, Analysis, Experiment, Mat, Outcome, Score } from '@/lib/types';
import type { Game } from '@/lib/useGame';

const ACTIONS: Action[] = ['vent', 'airflow', 'isolate', 'extinguish', 'wait'];

/** Moon / Mars / Impossible: real-time emergency actions. */
export function ActionBar({ game }: { game: Game }) {
  const { s, mode } = game;
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {ACTIONS.map((a) => (
        <button key={a} className="btn" onClick={() => game.act(a)}>
          {a === 'airflow' ? 'Change Airflow' : a}
        </button>
      ))}
      <span className="text-[11px] ml-auto">
        Power {s.power.toFixed(0)} · Suppressant {s.supp.toFixed(0)}
        {mode === 'mars' && ' · O₂ & time limited'}
      </span>
    </div>
  );
}

/** Impossible Fire: variables are hidden, so the player predicts from evidence. */
export function HiddenPredict({ game }: { game: Game }) {
  const [pick, setPick] = useState<Outcome | null>(null);
  return (
    <div className="mt-2 flex gap-2 items-center text-xs">
      <span>Predict (use evidence):</span>
      {OUTCOMES.map((o) => (
        <button
          key={o}
          className={`btn ${pick === o ? 'on' : ''}`}
          onClick={() => {
            setPick(o);
            game.consult();
          }}
        >
          {o}
        </button>
      ))}
      {pick && (
        <span>
          {pick === classify(game.s) ? '✔ matches simulation' : '✘ differs from simulation'}
        </span>
      )}
    </div>
  );
}

/** Fire Lab: predict the outcome of a random experiment, then reveal the simulation. */
export function LabControls({ game, analysis }: { game: Game; analysis: Analysis }) {
  const [pred, setPred] = useState<Outcome | null>(null);
  const [revealed, setRevealed] = useState(false);

  const next = () => {
    game.start('lab');
    setPred(null);
    setRevealed(false);
  };
  const reveal = () => {
    setRevealed(true);
    game.setRunning(true);
    game.consult();
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-xs">Predict:</span>
      {OUTCOMES.map((o) => (
        <button key={o} className={`btn ${pred === o ? 'on' : ''}`} onClick={() => setPred(o)}>
          {o}
        </button>
      ))}
      <button className="btn" disabled={!pred} onClick={reveal}>
        Reveal
      </button>
      <button className="btn" onClick={next}>
        New
      </button>
      {revealed && (
        <span className="text-xs">
          Simulated outcome: <b className="text-orange-300">{analysis.outcome}</b> — you{' '}
          {pred === analysis.outcome ? 'were right' : 'missed'} · risk {analysis.risk} · confidence{' '}
          {analysis.conf}%
        </span>
      )}
    </div>
  );
}

const GRAVITY_FILTERS = ['0', '0.16', '0.38', '1'];

/** Data Detective: find the hidden experiment record that matches the clue. */
export function DetectiveControls() {
  const [target] = useState<Experiment>(randomExperiment);
  const [material, setMaterial] = useState('any');
  const [gravity, setGravity] = useState('any');
  const [guess, setGuess] = useState<string | null>(null);

  const rows = EXPERIMENTS.filter(
    (e) =>
      (material === 'any' || e.material === material) &&
      (gravity === 'any' || String(e.g) === gravity),
  );

  return (
    <div className="text-xs space-y-2">
      <div>
        Clue:{' '}
        <b>
          g≈{target.g}, O₂≈{target.o2}%, {target.material}
        </b>{' '}
        (outcome and ID hidden). Filter the table, pick the match.
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <select className="btn" value={material} onChange={(e) => setMaterial(e.target.value)}>
          <option value="any">any material</option>
          {MATERIALS.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <select className="btn" value={gravity} onChange={(e) => setGravity(e.target.value)}>
          <option value="any">any g</option>
          {GRAVITY_FILTERS.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
        {rows.map((r) => (
          <button key={r.id} className="btn" onClick={() => setGuess(r.id)}>
            {r.id} · O₂ {r.o2}
          </button>
        ))}
      </div>
      {guess && (
        <div className={guess === target.id ? 'text-green-400' : 'text-red-400'}>
          {guess === target.id
            ? `Match: ${target.id} (${target.outcome}) — placeholder record`
            : 'Not matching — check O₂ and gravity.'}
        </div>
      )}
    </div>
  );
}

const BUILDER_SLIDERS = [
  { label: 'O₂ %', key: 'o2', min: 15, max: 35, step: 0.5 },
  { label: 'Pressure kPa', key: 'pressure', min: 50, max: 120, step: 1 },
  { label: 'Airflow', key: 'airflow', min: 0, max: 1, step: 0.05 },
] as const;

/** Habitat Builder: design the habitat, then run a fixed simulation for a score. */
export function BuilderControls({ game }: { game: Game }) {
  const { s, setS } = game;
  const [ventilation, setVentilation] = useState(0);
  const [suppression, setSuppression] = useState(0);
  const [result, setResult] = useState<Score | null>(null);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
      {BUILDER_SLIDERS.map(({ label, key, min, max, step }) => (
        <label key={key}>
          {label} {s[key].toFixed(1)}
          <input
            type="range"
            className="w-full"
            min={min}
            max={max}
            step={step}
            value={s[key]}
            onChange={(e) => setS((x) => ({ ...x, [key]: +e.target.value }))}
          />
        </label>
      ))}
      <label>
        Material
        <select
          className="btn w-full"
          value={s.material}
          onChange={(e) => setS((x) => ({ ...x, material: e.target.value as Mat }))}
        >
          {MATERIALS.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </label>
      <label>
        Ventilation {ventilation.toFixed(1)}
        <input
          type="range"
          className="w-full"
          min={0}
          max={1}
          step={0.1}
          value={ventilation}
          onChange={(e) => setVentilation(+e.target.value)}
        />
      </label>
      <label>
        Suppression {suppression.toFixed(1)}
        <input
          type="range"
          className="w-full"
          min={0}
          max={1}
          step={0.1}
          value={suppression}
          onChange={(e) => setSuppression(+e.target.value)}
        />
      </label>
      <button className="btn" onClick={() => setResult(simulateBuild(s, ventilation, suppression))}>
        Run Simulation
      </button>
      {result && (
        <div className="text-orange-300">
          Fire Safety Score {result.overall} · {result.rank}
        </div>
      )}
    </div>
  );
}

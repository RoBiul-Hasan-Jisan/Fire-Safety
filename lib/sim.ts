import data from '@/data/experiments.json';
import type {
  Action,
  Analysis,
  Experiment,
  Mat,
  Outcome,
  Risk,
  Score,
  Sim,
  Telemetry,
} from './types';

export const EXPERIMENTS = data as Experiment[];

// ---------- helpers ----------
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const clamp01 = (v: number) => clamp(v, 0, 1);

// ---------- growth model (SIMULATED heuristic, not NASA data) ----------
const FLAMMABILITY: Record<Mat, number> = { cotton: 1, paper: 0.9, foam: 1.2, acrylic: 0.7 };
const BURN_THRESHOLD_O2 = 17; // % below which the model flame cannot sustain itself
const AMBIENT_O2 = 21;
const AMBIENT_PRESSURE = 101; // kPa

/** Flame growth rate. <= 0 means the flame dies out. */
export function growthRate(t: Telemetry): number {
  const oxygen = (t.o2 - BURN_THRESHOLD_O2) / 4;
  const pressure = Math.min(1.5, t.pressure / AMBIENT_PRESSURE);
  const airflow = 0.4 + 0.6 * t.airflow;
  const gravity = 0.7 + 0.3 * Math.min(1, t.g);
  return oxygen * pressure * FLAMMABILITY[t.material] * airflow * gravity;
}

export function classify(t: Telemetry): Outcome {
  const r = growthRate(t);
  if (r <= 0) return 'extinguishes';
  if (r < 0.35) return 'slow';
  if (r < 1) return 'persistent';
  return 'rapid';
}

// ---------- AI analyst: nearest-neighbour search over experiment records ----------
const distance = (a: Telemetry, e: Experiment) =>
  Math.hypot(
    (a.o2 - e.o2) / 10,
    (a.pressure - e.pressure) / 50,
    a.airflow - e.airflow,
    Math.abs(a.g - e.g),
    a.material === e.material ? 0 : 0.6,
  );

export const findSimilar = (t: Telemetry, n = 3) =>
  EXPERIMENTS.map((e) => ({ e, d: distance(t, e) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n);

function riskOf(rate: number): Risk {
  if (rate > 1) return 'CRITICAL';
  if (rate > 0.35) return 'HIGH';
  if (rate > 0) return 'MODERATE';
  return 'LOW';
}

export function analyze(t: Telemetry): Analysis {
  const similar = findSimilar(t);
  const outcome = classify(t);
  const rate = growthRate(t);

  const closeness = Math.max(5, Math.round(100 * (1 - similar[0].d / 1.2)));
  const agreeing = similar.filter((x) => x.e.outcome === outcome).length;
  const conf = Math.round(closeness * (0.6 + 0.13 * agreeing));

  const why = [
    `O₂ ${t.o2.toFixed(1)}% is ${t.o2 >= AMBIENT_O2 ? 'at/above' : 'below'} ambient; the model's burn threshold is ~${BURN_THRESHOLD_O2}% (simulated).`,
    t.g < 0.5
      ? `Low gravity (${t.g}g) weakens buoyant convection, so flames turn rounder and rely on forced airflow (${t.airflow.toFixed(2)}).`
      : `Gravity ${t.g}g gives buoyant flow that feeds a tall flame.`,
    `${t.material} flammability factor applied; pressure ${t.pressure.toFixed(0)} kPa scales supply.`,
  ];

  return { outcome, risk: riskOf(rate), conf, similar, why, evidence: similar.map((x) => x.e.id) };
}

// ---------- game state ----------
export const createSim = (g: number, overrides: Partial<Sim> = {}): Sim => ({
  g,
  o2: 24,
  pressure: AMBIENT_PRESSURE,
  airflow: 0.5,
  material: 'cotton',
  temp: 293,
  fire: 0.25,
  smoke: 0,
  power: 100,
  supp: 100,
  crew: 100,
  left: 60,
  good: 0,
  acts: 0,
  consults: 0,
  peak: 0.25,
  done: false,
  isolated: false,
  ...overrides,
});

/** Advance the simulation by one tick (0.5 s of mission time). */
export function tick(s: Sim): Sim {
  if (s.done) return s;

  const rate = growthRate(s) * (s.isolated ? 0.4 : 1);
  const fire = clamp01(s.fire + rate * 0.03 - (rate <= 0 ? 0.03 : 0));
  const smoke = clamp01(s.smoke + fire * 0.02 - 0.008);
  const crew = Math.max(0, s.crew - (smoke > 0.5 ? 0.9 : 0) - (s.o2 < 16 ? 1 : 0));
  const left = Math.max(0, s.left - 0.5);

  return {
    ...s,
    fire,
    smoke,
    crew,
    left,
    temp: 293 + fire * 380,
    peak: Math.max(s.peak, fire),
    done: left <= 0 || crew <= 0,
  };
}

/** Apply a player action. Tracks whether the decision was "good" for the score. */
export function applyAction(s: Sim, action: Action): Sim {
  const n: Sim = { ...s, acts: s.acts + 1 };
  let good = false;

  switch (action) {
    case 'vent':
      n.o2 = Math.max(0, s.o2 - 2.5);
      n.pressure = Math.max(0, s.pressure - 6);
      n.power = Math.max(0, s.power - 5);
      good = s.o2 > AMBIENT_O2;
      break;
    case 'airflow':
      n.airflow = s.airflow > 0.3 ? 0.1 : 0.7;
      n.power = Math.max(0, s.power - 3);
      good = s.airflow > 0.3 && growthRate(s) > 0;
      break;
    case 'isolate':
      n.isolated = true;
      n.power = Math.max(0, s.power - 8);
      good = s.fire > 0.3 && !s.isolated;
      break;
    case 'extinguish':
      if (s.supp >= 15) {
        n.supp = s.supp - 15;
        n.fire = s.fire * 0.45;
        good = s.fire > 0.25;
      }
      break;
    case 'wait':
      good = s.fire < 0.15;
      break;
  }

  if (good) n.good += 1;
  return n;
}

export function computeScore(s: Sim): Score {
  const crew = s.crew;
  const contain = Math.round(100 * (1 - s.peak) * 0.5 + (1 - s.fire) * 50);
  const resource = Math.round((s.power + s.supp) / 2);
  const evidence = Math.min(100, s.consults * 25);
  const decision = s.acts ? Math.round((100 * s.good) / s.acts) : 0;
  const overall = Math.round(
    crew * 0.3 + contain * 0.25 + resource * 0.15 + evidence * 0.15 + decision * 0.15,
  );
  const rank =
    overall > 85
      ? 'S — Flight Director'
      : overall > 70
        ? 'A — Fire Marshal'
        : overall > 50
          ? 'B — Mission Specialist'
          : 'C — Cadet';
  return { crew: Math.round(crew), contain, resource, evidence, decision, overall, rank };
}

/**
 * Habitat Builder: run a fixed-length simulation from the player's design
 * (ventilation lowers O₂, suppression drains resources but damps the fire).
 */
export function simulateBuild(base: Sim, ventilation: number, suppression: number): Score {
  let x: Sim = {
    ...base,
    o2: base.o2 - ventilation * 4,
    fire: 0.3,
    peak: 0.3,
    smoke: 0,
    crew: 100,
    left: 60,
    done: false,
    power: 100 - suppression * 20,
    supp: 100 - suppression * 20,
    // Fixed evidence/decision credit so the score reflects the *design*, not play style.
    consults: 2,
    acts: 4,
    good: 3,
  };
  for (let i = 0; i < 120 && !x.done; i++) {
    x = tick(x);
    x.fire = Math.max(0, x.fire * (1 - suppression * 0.04));
  }
  return computeScore(x);
}

export const randomExperiment = () => EXPERIMENTS[Math.floor(Math.random() * EXPERIMENTS.length)];

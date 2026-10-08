export type Mat = 'cotton' | 'paper' | 'foam' | 'acrylic';
export type Outcome = 'extinguishes' | 'slow' | 'persistent' | 'rapid';
export type Planet = 'earth' | 'moon' | 'mars';
export type Mode = 'lab' | 'moon' | 'mars' | 'detective' | 'builder' | 'impossible';
export type Action = 'vent' | 'airflow' | 'isolate' | 'extinguish' | 'wait';
export type Risk = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

/** The physical conditions that drive the (simulated) flame. */
export interface Telemetry {
  g: number;
  o2: number; // %
  pressure: number; // kPa
  airflow: number; // 0..1, relative
  material: Mat;
  temp: number; // K
}

/** Rows follow this shape. Replace data/experiments.json with real NASA records (see README). */
export interface Experiment {
  id: string;
  title: string;
  material: Mat;
  o2: number;
  pressure: number;
  airflow: number;
  g: number;
  outcome: Outcome;
  source: string;
}

/** Full game state: telemetry + mission resources + bookkeeping for scoring. */
export interface Sim extends Telemetry {
  fire: number; // 0..1
  smoke: number; // 0..1
  power: number; // 0..100
  supp: number; // suppressant, 0..100
  crew: number; // 0..100
  left: number; // seconds remaining
  good: number; // good decisions made
  acts: number; // total decisions made
  consults: number; // times the AI analyst / evidence was used
  peak: number; // highest fire level reached
  done: boolean;
  isolated: boolean;
}

export interface Score {
  crew: number;
  contain: number;
  resource: number;
  evidence: number;
  decision: number;
  overall: number;
  rank: string;
}

export interface Analysis {
  outcome: Outcome;
  risk: Risk;
  conf: number;
  similar: { e: Experiment; d: number }[];
  why: string[];
  evidence: string[];
}

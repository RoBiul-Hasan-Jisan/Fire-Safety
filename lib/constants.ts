import type { Mat, Mode, Outcome, Planet } from './types';

export const GRAVITY: Record<Planet, number> = { earth: 1, moon: 0.16, mars: 0.38 };
export const PLANETS: Planet[] = ['earth', 'moon', 'mars'];
export const MATERIALS: Mat[] = ['cotton', 'paper', 'foam', 'acrylic'];
export const OUTCOMES: Outcome[] = ['extinguishes', 'slow', 'persistent', 'rapid'];

export const MODES: { id: Mode; label: string }[] = [
  { id: 'moon', label: 'Moon Emergency' },
  { id: 'mars', label: 'Mars Crisis' },
  { id: 'lab', label: 'Fire Lab' },
  { id: 'detective', label: 'Data Detective' },
  { id: 'builder', label: 'Habitat Builder' },
  { id: 'impossible', label: 'Impossible Fire' },
];

/** Modes where the clock runs and the player acts in real time. */
export const LIVE_MODES: Mode[] = ['moon', 'mars', 'impossible'];

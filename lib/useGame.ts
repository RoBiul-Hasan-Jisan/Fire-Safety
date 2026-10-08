'use client';
import { useCallback, useEffect, useState } from 'react';
import { GRAVITY, LIVE_MODES } from './constants';
import { applyAction, createSim, randomExperiment, tick } from './sim';
import type { Action, Mode, Planet, Sim } from './types';

const TICK_MS = 500;
const HISTORY_LENGTH = 60;

/** Which planet's gravity each mode forces (others keep the player's current planet). */
const FORCED_PLANET: Partial<Record<Mode, Planet>> = {
  moon: 'moon',
  mars: 'mars',
  impossible: 'moon',
};

function presetFor(mode: Mode, g: number): Sim {
  switch (mode) {
    case 'mars':
      return createSim(g, { left: 90, power: 60, supp: 60, o2: 22 });
    case 'impossible':
      return createSim(g, { o2: 27, pressure: 90, material: 'foam', airflow: 0.6, fire: 0.3 });
    case 'lab': {
      const e = randomExperiment();
      return createSim(e.g, {
        o2: e.o2,
        pressure: e.pressure,
        airflow: e.airflow,
        material: e.material,
        fire: 0.2,
      });
    }
    case 'moon':
      return createSim(g);
    default:
      return createSim(g, { fire: 0.2 });
  }
}

export function useGame() {
  const [mode, setMode] = useState<Mode>('moon');
  const [planet, setPlanet] = useState<Planet>('moon');
  const [s, setS] = useState<Sim>(() => presetFor('moon', GRAVITY.moon));
  const [running, setRunning] = useState(true);
  const [history, setHistory] = useState<number[]>([]);

  // Game clock.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setS(tick), TICK_MS);
    return () => clearInterval(id);
  }, [running]);

  // Fire-level history for the sparkline.
  useEffect(() => {
    setHistory((h) => [...h.slice(-(HISTORY_LENGTH - 1)), s.fire]);
  }, [s.fire, s.left]);

  const start = useCallback(
    (m: Mode) => {
      const p = FORCED_PLANET[m] ?? planet;
      setMode(m);
      setPlanet(p);
      setS(presetFor(m, GRAVITY[p]));
      setHistory([]);
      setRunning(LIVE_MODES.includes(m));
    },
    [planet],
  );

  const changePlanet = useCallback((p: Planet) => {
    setPlanet(p);
    setS((x) => ({ ...x, g: GRAVITY[p] }));
  }, []);

  const act = useCallback((a: Action) => setS((x) => (x.done ? x : applyAction(x, a))), []);
  const consult = useCallback(() => setS((x) => ({ ...x, consults: x.consults + 1 })), []);

  return { mode, planet, s, setS, running, setRunning, history, start, changePlanet, act, consult };
}

export type Game = ReturnType<typeof useGame>;

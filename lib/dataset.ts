import { EXPERIMENTS } from './sim';
import type { Experiment, Mat, Outcome } from './types';

const MATS = ['cotton', 'paper', 'foam', 'acrylic'];
const OUTS = ['extinguishes', 'slow', 'persistent', 'rapid'];
export const TEMPLATE_CSV =
  'id,title,material,o2,pressure,airflow,g,outcome,source\nEXP-001,"Example row",cotton,21,101,0.2,0,slow,"citation or URL"\n';

function split(line: string) {
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (const c of line) {
    if (c === '"') q = !q;
    else if (c === ',' && !q) { out.push(cur); cur = ''; } else cur += c;
  }
  out.push(cur);
  return out.map((x) => x.trim());
}

/** Parse a CSV of experiments. Rows with unknown material/outcome or non-numeric values are skipped and reported. */
export function loadCsv(text: string) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const head = split(lines[0] ?? '').map((h) => h.toLowerCase());
  const rows: Experiment[] = [];
  const errors: string[] = [];
  lines.slice(1).forEach((l, i) => {
    const c = split(l);
    const r: Record<string, string> = {};
    head.forEach((h, j) => (r[h] = c[j] ?? ''));
    const bad = !r.id || !MATS.includes(r.material) || !OUTS.includes(r.outcome) ||
      ['o2', 'pressure', 'airflow', 'g'].some((k) => r[k] === '' || Number.isNaN(Number(r[k])));
    if (bad) { errors.push(`row ${i + 2}`); return; }
    rows.push({ id: r.id, title: r.title || r.id, material: r.material as Mat, o2: +r.o2, pressure: +r.pressure,
      airflow: +r.airflow, g: +r.g, outcome: r.outcome as Outcome, source: r.source || 'user-csv' });
  });
  return { rows, errors };
}

/** Swap the dataset in place; similar-experiment search, confidence and Data Detective all follow. */
export const replaceExperiments = (rows: Experiment[]) => { EXPERIMENTS.splice(0, EXPERIMENTS.length, ...rows); };
export const isPlaceholder = () => EXPERIMENTS.every((e) => e.source.startsWith('placeholder'));

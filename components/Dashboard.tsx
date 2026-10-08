'use client';
import { useMemo, useState } from 'react';
import { isPlaceholder, loadCsv, replaceExperiments } from '@/lib/dataset';
import { EXPERIMENTS, classify, findSimilar, growthRate } from '@/lib/sim';
import type { Mat, Outcome } from '@/lib/types';
import type { Game } from '@/lib/useGame';

const COL: Record<Outcome, string> = { extinguishes: '#35e08a', slow: '#38bdf8', persistent: '#fbbf24', rapid: '#ef4444' };
const OUTS: Outcome[] = ['extinguishes', 'slow', 'persistent', 'rapid'];
const BANDS: [string, (g: number) => boolean][] = [['Microgravity (≤0.05g)', (g) => g <= 0.05], ['Moon / Mars-like (0.05–0.5g)', (g) => g > 0.05 && g <= 0.5], ['Earth-like (>0.5g)', (g) => g > 0.5]];
const PL: [string, number, string][] = [['Earth', 1, '#fb923c'], ['Mars', 0.38, '#f87171'], ['Moon', 0.16, '#cbd5e1']];

function advice(s: Game['s']): string {
  const r = growthRate(s);
  if (r <= 0) return 'Under these conditions the model says the flame is self-limiting. Monitor, keep suppressant in reserve (Wait).';
  if (s.o2 > 21) return `Oxygen (${s.o2.toFixed(1)}%) is the biggest lever in the model: Vent to bring it toward 21% or lower.`;
  if (s.airflow > 0.5) return 'Forced airflow is feeding the flame. Reduce airflow first; in low gravity it replaces buoyant convection.';
  return 'Atmosphere is near ambient, so use Isolate Module to cap spread and Extinguish early while the flame is small.';
}

export default function Dashboard({ game, ver, onClose, onData }: { game: Game; ver: number; onClose: () => void; onData: () => void }) {
  const s = game.s;
  const [msg, setMsg] = useState('');
  const [sort, setSort] = useState<'rel' | 'o2'>('rel');
  const ranked = useMemo(() => {
    const r = findSimilar(s, EXPERIMENTS.length).map(({ e, d }) => ({ e, rel: Math.max(0, Math.round(100 * (1 - d / 1.2))) }));
    return sort === 'rel' ? r : [...r].sort((a, b) => b.e.o2 - a.e.o2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.o2, s.pressure, s.airflow, s.g, s.material, ver, sort]);
  const N = EXPERIMENTS.length;
  const mats: Mat[] = ['cotton', 'paper', 'foam', 'acrylic'];
  const gs = [0, 0.16, 0.38, 1];
  const lines = PL.map(([n, g, c]) => ({ n, c, pts: Array.from({ length: 21 }, (_, i) => [15 + i, growthRate({ ...s, g, o2: 15 + i })] as const) }));
  const max = Math.max(1, ...lines.flatMap((l) => l.pts.map((p) => p[1])));
  const Y = (r: number) => 110 - ((r + 1) / (max + 1)) * 100;
  const upload = (f?: File) => f?.text().then((t) => {
    const { rows, errors } = loadCsv(t);
    if (rows.length) { replaceExperiments(rows); onData(); }
    setMsg(`${rows.length} rows loaded${errors.length ? `; skipped ${errors.length} (${errors.slice(0, 5).join(', ')})` : ''}`);
  });
  const replay = (i: number) => { const e = ranked[i].e; game.setS((x) => ({ ...x, g: e.g, o2: e.o2, pressure: e.pressure, airflow: e.airflow, material: e.material, fire: Math.max(x.fire, 0.2) })); onClose(); };

  return (
    <div className="absolute inset-0 z-30 bg-black/75 p-5 overflow-auto">
      <div className="max-w-6xl mx-auto space-y-3">
        <div className="flex items-center gap-3">
          <h2 className="hd text-lg">Evidence Dashboard · Flame in Freefall</h2>
          <span className={`text-[10px] px-2 py-0.5 rounded border ${isPlaceholder() ? 'border-amber-400 text-amber-300' : 'border-green-400 text-green-300'}`}>{isPlaceholder() ? `PLACEHOLDER DATA (${N} rows) — not NASA results` : `USER DATASET (${N} rows)`}</span>
          <label className="btn ml-auto cursor-pointer">Load CSV<input type="file" accept=".csv" hidden onChange={(e) => upload(e.target.files?.[0])} /></label>
          <a className="btn" href="/experiments-template.csv" download>Template</a>
          <button className="btn on" onClick={onClose}>Back to game</button>
        </div>
        {msg && <div className="text-xs text-sky-200">{msg}</div>}
        <div className="grid lg:grid-cols-2 gap-3">
          <section className="panel p-4 space-y-2">
            <div className="hd">1 · Summary — what the data says</div>
            {BANDS.map(([name, f]) => {
              const rows = EXPERIMENTS.filter((e) => f(e.g));
              const top = OUTS.map((o) => [o, rows.filter((e) => e.outcome === o).length] as const).sort((a, b) => b[1] - a[1])[0];
              return (
                <div key={name} className="text-xs">
                  <div className="flex justify-between"><span>{name}</span><span className="text-sky-300/70">{rows.length} runs</span></div>
                  <div className="flex h-3 rounded overflow-hidden bg-slate-800 mt-1">{OUTS.map((o) => <div key={o} title={o} style={{ width: `${rows.length ? (rows.filter((e) => e.outcome === o).length / rows.length) * 100 : 0}%`, background: COL[o] }} />)}</div>
                  <div className="text-sky-200/80 mt-0.5">{rows.length ? `Most common: ${top[0]} (${top[1]} of ${rows.length})` : 'No runs in this band'}</div>
                </div>
              );
            })}
            <div className="flex gap-3 text-[10px] pt-1">{OUTS.map((o) => <span key={o}><i className="inline-block w-2 h-2 mr-1" style={{ background: COL[o] }} />{o}</span>)}</div>
          </section>

          <section className="panel p-4 space-y-2">
            <div className="hd">2 · Hazard Ranking — simulated outcome by material × gravity</div>
            <table className="w-full text-xs text-center"><thead><tr><th /> {gs.map((g) => <th key={g} className="text-sky-300/70 font-normal">{g}g</th>)}</tr></thead>
              <tbody>{mats.map((m) => <tr key={m}><td className="text-left py-0.5">{m}</td>{gs.map((g) => { const o = classify({ ...s, material: m, g }); return <td key={g} className="p-0.5"><div className="rounded py-1 text-black font-bold" style={{ background: COL[o] }}>{o.slice(0, 4)}</div></td>; })}</tr>)}</tbody></table>
            <div className="text-[10px] text-sky-300/60">At current O₂ {s.o2.toFixed(1)}%, {s.pressure.toFixed(0)} kPa, airflow {s.airflow.toFixed(2)}. Simulated heuristic.</div>
            <svg viewBox="0 0 300 120" className="w-full"><line x1="0" x2="300" y1={Y(0)} y2={Y(0)} stroke="#475569" strokeDasharray="3 3" />
              {lines.map((l) => <polyline key={l.n} fill="none" stroke={l.c} strokeWidth="2" points={l.pts.map(([o, r]) => `${((o - 15) / 20) * 300},${Y(r)}`).join(' ')} />)}
              <line x1={((s.o2 - 15) / 20) * 300} x2={((s.o2 - 15) / 20) * 300} y1="0" y2="120" stroke="#38bdf8" /></svg>
            <div className="flex gap-3 text-[10px]">{lines.map((l) => <span key={l.n}><i className="inline-block w-2 h-2 mr-1" style={{ background: l.c }} />{l.n}</span>)}<span className="ml-auto text-sky-300/60">growth rate vs O₂ 15–35% (simulated)</span></div>
          </section>

          <section className="panel p-4 space-y-1">
            <div className="flex items-center"><span className="hd">3 · Ranked Evidence for this scenario</span><button className="btn ml-auto !py-0.5" onClick={() => setSort(sort === 'rel' ? 'o2' : 'rel')}>sort: {sort === 'rel' ? 'relevance' : 'O₂'}</button></div>
            {ranked.slice(0, 8).map(({ e, rel }, i) => (
              <div key={e.id} className="flex items-center gap-2 text-xs">
                <span className="w-16">{e.id}</span><span className="flex-1 truncate">{e.title.replace('Placeholder: ', '')}</span>
                <div className="w-20 h-1.5 bg-slate-800 rounded"><div className="h-1.5 rounded bg-cyan-400" style={{ width: `${rel}%` }} /></div><span className="w-8 text-right">{rel}%</span>
                <span className="w-20 text-right" style={{ color: COL[e.outcome] }}>{e.outcome}</span><button className="btn !py-0 !px-2" onClick={() => replay(i)}>Replay</button>
              </div>
            ))}
            <div className="text-[10px] text-sky-300/60">Relevance = closeness in O₂, pressure, airflow, gravity and material. Replay loads that experiment into the 3D scene.</div>
          </section>

          <section className="panel p-4 space-y-2 text-xs">
            <div className="hd">4 · AI Interpretation</div>
            <p><b className="text-orange-300">Predicted: {classify(s)}</b> (simulated). Suggested move: {advice(s)}</p>
            <p>Earth vs Moon vs Mars: same scenario grows at {PL.map(([n, g]) => `${n} ${growthRate({ ...s, g }).toFixed(2)}`).join(' · ')} (simulated rate units). Lower gravity weakens buoyant convection, so flames lean on forced airflow and oxygen supply instead.</p>
            <p className="text-sky-200/80">Why it matters: crews on the Moon (0.16g) and Mars (0.38g) cannot assume Earth fire behavior or ISS microgravity behavior; evidence from both ends has to be compared, which is what this board ranks.</p>
            <p className="text-[10px] text-sky-300/60">Explanations come from rules over the loaded dataset and a simulated model. They are not NASA measurements.</p>
          </section>
        </div>
      </div>
    </div>
  );
}

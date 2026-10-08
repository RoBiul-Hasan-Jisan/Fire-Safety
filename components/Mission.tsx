import { GRAVITY, LIVE_MODES, PLANETS } from '@/lib/constants';
import { webgpuAvailable } from '@/lib/renderer';
import { classify, computeScore } from '@/lib/sim';
import type { Action, Analysis, Mode, Sim } from '@/lib/types';
import type { Game } from '@/lib/useGame';
import type { View } from './Scene';
import { Bar } from './ui';

const OBJECTIVE: Record<Mode, string> = {
  moon: 'Fire detected in Habitat Module 2. Take action!',
  mars: 'Balance crew safety against limited O₂, power and suppressant.',
  lab: 'Predict how this experiment will burn.',
  detective: 'Identify the matching experiment from the evidence.',
  builder: 'Configure the habitat, then run the simulation.',
  impossible: 'Variables hidden. Use the evidence to decide.',
};
const mmss = (t: number) => `${String(Math.floor(Math.max(0, t) / 60)).padStart(2, '0')}:${String(Math.ceil(Math.max(0, t) % 60) % 60).padStart(2, '0')}`;

export function TopBar({ rank, onDash }: { rank: string; onDash: () => void }) {
  return (
    <header className="panel pointer-events-auto flex items-center gap-4 px-4 py-2 col-span-3">
      <div className="grid place-items-center w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-700 font-black text-white text-xs">FF</div>
      <div>
        <h1 className="text-2xl font-black tracking-[.22em] text-white leading-none">FLAME<span className="text-orange-400">FALL</span></h1>
        <div className="text-[11px] text-sky-200/80 italic">Survive the Fire. Decode the Science. Save the Mission.</div>
      </div>
      <div className="ml-auto text-[10px] text-sky-300/60 text-right leading-tight">
        RENDERER · WebGL2 {webgpuAvailable() ? '(WebGPU-capable browser)' : ''}<br />Microgravity Combustion · Prototype
      </div>
      <button className="btn on" onClick={onDash}>Evidence Dashboard</button>
      <div className="panel px-3 py-1 text-xs"><div className="hd">Fire Safety Commander</div><div className="text-sky-300/70">Rank {rank}</div></div>
    </header>
  );
}

export function Banner({ game }: { game: Game }) {
  const { mode, s, running } = game;
  const live = running && !s.done;
  return (
    <div className={`panel pointer-events-auto p-3 ${live && s.fire > 0.5 ? 'danger' : ''}`}>
      <div className="flex items-center gap-2">
        <span className="hd text-base">{mode === 'lab' ? 'Fire Lab' : mode === 'moon' ? 'Moon Emergency' : mode === 'mars' ? 'Mars Fire Crisis' : mode === 'detective' ? 'Data Detective' : mode === 'builder' ? 'Habitat Builder' : 'Impossible Fire'}</span>
        {live && <span className="text-[10px] px-1.5 rounded border border-red-500 text-red-400">● LIVE</span>}
        {LIVE_MODES.includes(mode) && <span className="ml-auto text-2xl font-bold text-red-400 tabular-nums">{mmss(s.left)}</span>}
      </div>
      <div className="text-[11px] text-sky-200/80 mt-1">{OBJECTIVE[mode]}</div>
    </div>
  );
}

function Row({ k, v, unit, frac, warn }: { k: string; v: string; unit?: string; frac?: number; warn?: boolean }) {
  return (
    <div className="py-1.5 border-b border-sky-400/10 last:border-0">
      <div className="flex justify-between text-sm"><span className="text-sky-200/80">{k}</span><span className={`font-bold tabular-nums ${warn ? 'text-red-400' : 'text-white'}`}>{v}<span className="text-[10px] text-sky-300/60 ml-1">{unit}</span></span></div>
      {frac !== undefined && <div className="h-1 mt-1 bg-slate-800 rounded"><div className={`h-1 rounded transition-all ${warn ? 'bg-red-500' : 'bg-gradient-to-r from-cyan-400 to-blue-500'}`} style={{ width: `${Math.max(2, Math.min(100, frac * 100))}%` }} /></div>}
    </div>
  );
}

export function TelemetryPanel({ game }: { game: Game }) {
  const { s, mode, history } = game;
  const hid = mode === 'impossible';
  const m = (v: string) => (hid ? '???' : v);
  const pts = history.map((v, i) => `${i * 4},${34 - v * 32}`).join(' ');
  return (
    <div className="panel pointer-events-auto p-3">
      <div className="flex justify-between"><span className="hd">Live Telemetry</span><span className="text-[10px] px-1.5 rounded border border-cyan-400/60 text-cyan-300">SIMULATED</span></div>
      <Row k="Gravity" v={s.g.toFixed(2)} unit="g" frac={s.g} />
      <Row k="Oxygen" v={m(s.o2.toFixed(1))} unit="%" frac={hid ? 0.5 : s.o2 / 35} warn={!hid && s.o2 > 25} />
      <Row k="Pressure" v={m(s.pressure.toFixed(0))} unit="kPa" frac={hid ? 0.5 : s.pressure / 120} />
      <Row k="Airflow" v={s.airflow.toFixed(2)} unit="rel" frac={s.airflow} />
      <Row k="Material" v={m(s.material)} />
      <Row k="Temperature" v={(s.temp - 273).toFixed(0)} unit="°C" frac={(s.temp - 293) / 400} warn={s.fire > 0.6} />
      <div className="text-[10px] text-sky-300/60 mt-2">FIRE INTENSITY (SIMULATED)</div>
      <svg width="100%" height="36" viewBox="0 0 240 36" preserveAspectRatio="none"><polyline fill="none" stroke="#fb923c" strokeWidth="2" points={pts} /></svg>
    </div>
  );
}

export function AnalystCard({ a, hidden, onConsult }: { a: Analysis; hidden: boolean; onConsult: () => void }) {
  const bad = a.risk === 'HIGH' || a.risk === 'CRITICAL';
  return (
    <div className="panel pointer-events-auto p-3 text-xs space-y-2">
      <div className="flex justify-between items-center"><span className="hd">AI Fire Analyst</span><button className="btn !py-0.5" onClick={onConsult}>Consult</button></div>
      {hidden ? <p>Variables hidden. Reason from similar experiments below.</p> : a.why.map((w, i) => <p key={i} className="text-sky-100/90">• {w}</p>)}
      <div className={`flex justify-between items-center px-2 py-1.5 rounded border ${bad ? 'border-red-500/70 bg-red-950/40' : 'border-green-500/50 bg-green-950/30'}`}><span>Risk Level</span><b className={bad ? 'text-red-400' : 'text-green-400'}>{a.risk}</b></div>
      <div className="flex justify-between"><span className="text-sky-300/70">Predicted outcome</span><b className="text-orange-300">{a.outcome} <span className="font-normal text-sky-300/60">(sim.)</span></b></div>
      <div><div className="flex justify-between"><span className="text-sky-300/70">Confidence</span><b>{a.conf}%</b></div><div className="h-1.5 bg-slate-800 rounded mt-1"><div className="h-1.5 rounded bg-cyan-400" style={{ width: `${a.conf}%` }} /></div></div>
      <div className="text-sky-300/70">Similar experiments <span className="text-[10px]">(placeholder data)</span></div>
      {a.similar.map((x) => <div key={x.e.id} className="flex justify-between"><span>{x.e.id}{hidden ? '' : ` · ${x.e.title.replace('Placeholder: ', '')}`}</span><span className="text-orange-300">{x.e.outcome}</span></div>)}
      <div className="text-[10px] text-sky-300/50">Evidence used: {a.evidence.join(', ')}. All values simulated, not NASA measurements.</div>
    </div>
  );
}

const ACTIONS: [Action, string][] = [['vent', 'Vent'], ['airflow', 'Change Airflow'], ['isolate', 'Isolate Module'], ['extinguish', 'Extinguish'], ['wait', 'Wait']];
export function ActionList({ game }: { game: Game }) {
  const live = LIVE_MODES.includes(game.mode);
  return (
    <div className="panel pointer-events-auto p-3 space-y-1.5">
      <div className="hd">Actions</div>
      {ACTIONS.map(([a, l]) => (
        <button key={a} disabled={!live} onClick={() => game.act(a)} className={`btn w-full text-left ${a === 'extinguish' ? '!border-red-500/70 !bg-red-900/30' : ''}`}>{l}</button>
      ))}
      {!live && <div className="text-[10px] text-sky-300/60">Live actions: Moon, Mars, Impossible Fire.</div>}
    </div>
  );
}

export function CamAndEnv({ view, setView, game }: { view: View; setView: (v: View) => void; game: Game }) {
  return (
    <div className="pointer-events-auto flex justify-between items-start gap-3">
      <div className="panel p-1.5 flex gap-1">{(['free', 'orbit', 'inside'] as View[]).map((v) => <button key={v} className={`btn ${view === v ? 'on' : ''}`} onClick={() => setView(v)}>{v}</button>)}</div>
      <div className="panel p-1.5 flex gap-1">
        {PLANETS.map((p) => (
          <button key={p} className={`btn ${game.planet === p ? 'on' : ''}`} onClick={() => game.changePlanet(p)}>
            {p} {GRAVITY[p]}g<span className="block text-[9px] opacity-70">{classify({ ...game.s, g: GRAVITY[p] })}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ScoreCard({ s }: { s: Sim }) {
  const sc = computeScore(s);
  const C = 2 * Math.PI * 34;
  return (
    <div className="panel pointer-events-auto p-3">
      <div className="hd mb-2">NASA-style Fire Safety Rank</div>
      <div className="flex gap-3 items-center">
        <svg width="84" height="84" viewBox="0 0 84 84">
          <circle cx="42" cy="42" r="34" fill="none" stroke="#12304f" strokeWidth="7" />
          <circle cx="42" cy="42" r="34" fill="none" stroke="#35e08a" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${(sc.overall / 100) * C} ${C}`} transform="rotate(-90 42 42)" />
          <text x="42" y="48" textAnchor="middle" fontSize="22" fontWeight="800" fill="#fff">{sc.rank[0]}</text>
        </svg>
        <div className="flex-1 space-y-1"><Bar label="Crew Safety" value={sc.crew} /><Bar label="Containment" value={sc.contain} /><Bar label="Resources" value={sc.resource} /><Bar label="Evidence" value={sc.evidence} /><Bar label="Decisions" value={sc.decision} /></div>
      </div>
      <div className="text-right text-xs mt-1">Overall <b className="text-orange-300">{sc.overall}/100</b></div>
    </div>
  );
}

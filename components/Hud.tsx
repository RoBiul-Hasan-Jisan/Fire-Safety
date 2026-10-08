import { computeScore } from '@/lib/sim';
import type { Game } from '@/lib/useGame';
import { Bar } from './ui';

/** End-of-mission card drawn over the 3D scene. */
export default function Hud({ game }: { game: Game }) {
  const { s, mode, start } = game;
  if (!s.done) return null;
  const sc = computeScore(s);
  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-black/65">
      <div className="panel p-6 w-96 space-y-2">
        <div className="hd text-lg">{s.crew > 0 ? 'Mission complete' : 'Crew lost'}</div>
        <Bar label="Crew Safety" value={sc.crew} />
        <Bar label="Fire Containment" value={sc.contain} />
        <Bar label="Resource Efficiency" value={sc.resource} />
        <Bar label="Evidence Quality" value={sc.evidence} />
        <Bar label="Decision Quality" value={sc.decision} />
        <div className="text-orange-300 pt-1">RANK {sc.rank} · {sc.overall}/100</div>
        <div className="text-xs text-sky-100/90 space-y-1 border-t border-sky-400/20 pt-2">
          <div className="hd">AI debrief</div>
          <p>{s.good} of {s.acts} actions were sensible under the model. Peak fire {Math.round(s.peak * 100)}%.</p>
          <p>{s.consults === 0 ? 'You never consulted the evidence; the analyst or dashboard would have raised Evidence Quality.' : `You consulted evidence ${s.consults} time(s).`}</p>
        </div>
        <button className="btn on" onClick={() => start(mode)}>Retry</button>
      </div>
    </div>
  );
}

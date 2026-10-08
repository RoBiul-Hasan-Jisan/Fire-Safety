import { PLANETS, GRAVITY } from '@/lib/constants';
import { classify, computeScore, growthRate } from '@/lib/sim';
import type { Analysis, Sim } from '@/lib/types';
import type { Game } from '@/lib/useGame';
import { Bar } from './ui';

export function AnalystPanel({
  analysis,
  hidden,
  onConsult,
}: {
  analysis: Analysis;
  hidden: boolean;
  onConsult: () => void;
}) {
  const dangerous = analysis.risk === 'CRITICAL' || analysis.risk === 'HIGH';
  return (
    <div className="panel p-3 text-xs space-y-2">
      <div className="flex justify-between">
        <b className="text-cyan-300 tracking-widest">AI FIRE ANALYST</b>
        <button className="btn" onClick={onConsult}>
          Consult
        </button>
      </div>
      <div className="flex gap-3">
        <span>
          Risk <b className={dangerous ? 'text-red-400' : 'text-green-400'}>{analysis.risk}</b>
        </span>
        <span>
          Predicted <b className="text-orange-300">{analysis.outcome}</b>
        </span>
        <span>Conf {analysis.conf}%</span>
      </div>

      {hidden ? (
        <div>Variables hidden. Use similar experiments:</div>
      ) : (
        analysis.why.map((line, i) => <p key={i}>• {line}</p>)
      )}

      <div className="text-sky-300/70">
        Similar experiments (placeholder data, not NASA results):
      </div>
      {analysis.similar.map(({ e }) => (
        <div key={e.id} className="flex justify-between">
          <span>
            {e.id} {hidden ? '' : e.title.replace('Placeholder: ', '')}
          </span>
          <span className="text-orange-300">{e.outcome}</span>
        </div>
      ))}
      <div className="text-[10px] text-sky-300/50">
        Evidence: {analysis.evidence.join(', ')} · analysis is a SIMULATED heuristic.
      </div>
    </div>
  );
}

/** Same scenario, replayed under each planet's gravity. */
export function PlanetCompare({ s, game }: { s: Sim; game: Game }) {
  return (
    <div className="panel p-3 text-xs space-y-2">
      <b className="tracking-widest text-cyan-300">EARTH · MOON · MARS</b>
      {PLANETS.map((p) => {
        const scenario = { ...s, g: GRAVITY[p] };
        const rate = growthRate(scenario);
        return (
          <div key={p} className={game.planet === p ? 'text-white' : ''}>
            <div className="flex justify-between">
              <button onClick={() => game.changePlanet(p)} className="underline">
                {p} {GRAVITY[p]}g
              </button>
              <span>{classify(scenario)}</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded">
              <div
                className="h-1.5 rounded bg-orange-400"
                style={{ width: `${Math.max(2, Math.min(100, rate * 70))}%` }}
              />
            </div>
          </div>
        );
      })}
      <div className="text-[10px] text-sky-300/50">
        Same scenario, simulated growth rate by gravity.
      </div>
    </div>
  );
}

export function ScorePanel({ s }: { s: Sim }) {
  const score = computeScore(s);
  return (
    <div className="panel p-3 space-y-1">
      <b className="text-xs tracking-widest text-cyan-300">LIVE SCORE · {score.rank}</b>
      <Bar label="Crew Safety" value={score.crew} />
      <Bar label="Fire Containment" value={score.contain} />
      <Bar label="Resource Efficiency" value={score.resource} />
      <Bar label="Evidence Quality" value={score.evidence} />
      <Bar label="Decision Quality" value={score.decision} />
    </div>
  );
}

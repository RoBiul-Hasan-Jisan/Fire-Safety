'use client';
import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { BuilderControls, DetectiveControls, HiddenPredict, LabControls } from '@/components/Controls';
import Dashboard from '@/components/Dashboard';
import Hud from '@/components/Hud';
import { ActionList, AnalystCard, Banner, CamAndEnv, ScoreCard, TelemetryPanel, TopBar } from '@/components/Mission';
import type { View } from '@/components/Scene';
import { MODES } from '@/lib/constants';
import { analyze, computeScore } from '@/lib/sim';
import { useGame } from '@/lib/useGame';

// WebGL/three.js is browser-only, so the 3D scene is client-only.
const Scene = dynamic(() => import('@/components/Scene'), { ssr: false });

export default function Page() {
  const game = useGame();
  const { s, mode } = game;
  const [view, setView] = useState<View>('free');
  const [dash, setDash] = useState(false);
  const [ver, setVer] = useState(0);
  const hidden = mode === 'impossible';
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only the physical inputs matter
  const analysis = useMemo(() => analyze(s), [s.o2, s.pressure, s.airflow, s.g, s.material, ver]);

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <div className="absolute inset-0"><Scene fire={s.fire} smoke={s.smoke} g={s.g} crew={s.crew} view={view} /></div>
      <div className="absolute inset-0 grid gap-3 p-3 pointer-events-none" style={{ gridTemplateColumns: '300px 1fr 330px', gridTemplateRows: 'auto 1fr auto' }}>
        <TopBar rank={computeScore(s).rank[0]} onDash={() => setDash(true)} />
        <div className="space-y-3 overflow-hidden"><Banner game={game} /><TelemetryPanel game={game} /></div>
        <CamAndEnv view={view} setView={setView} game={game} />
        <div className="overflow-hidden"><AnalystCard a={analysis} hidden={hidden} onConsult={game.consult} /></div>
        <ActionList game={game} />
        <div className="panel pointer-events-auto p-3 self-end max-h-[260px] overflow-auto" key={mode}>
          <div className="flex gap-1 flex-wrap mb-2">{MODES.map(({ id, label }) => <button key={id} className={`btn ${mode === id ? 'on' : ''}`} onClick={() => game.start(id)}>{label}</button>)}</div>
          {mode === 'lab' && <LabControls game={game} analysis={analysis} />}
          {mode === 'detective' && <DetectiveControls />}
          {mode === 'builder' && <BuilderControls game={game} />}
          {hidden && <HiddenPredict game={game} />}
          {(mode === 'moon' || mode === 'mars') && <div className="text-xs text-sky-200/80">Power {s.power.toFixed(0)}% · Suppressant {s.supp.toFixed(0)}% · Crew {s.crew.toFixed(0)}% — choose actions at left.</div>}
        </div>
        <ScoreCard s={s} />
      </div>
      <Hud game={game} />
      {dash && <Dashboard game={game} ver={ver} onClose={() => setDash(false)} onData={() => setVer((v) => v + 1)} />}
    </main>
  );
}

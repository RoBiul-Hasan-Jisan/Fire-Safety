/** Small shared presentational pieces. */

export function StatCard({
  label,
  value,
  unit,
  warn,
  simulated,
}: {
  label: string;
  value: string;
  unit?: string;
  warn?: boolean;
  simulated?: boolean;
}) {
  return (
    <div className={`panel p-3 ${warn ? 'border-red-500/70 animate-pulse' : ''}`}>
      <div className="text-[10px] tracking-widest text-sky-300/60">
        {label}
        {simulated && ' · SIM'}
      </div>
      <div className="text-2xl font-bold text-white">
        {value}
        <span className="text-xs text-sky-300/60 ml-1">{unit}</span>
      </div>
    </div>
  );
}

export function Bar({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="text-[11px]">
      <div className="flex justify-between">
        <span>{label}</span>
        <span>{Math.round(value)}</span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded">
        <div className="h-1.5 rounded bg-cyan-400 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

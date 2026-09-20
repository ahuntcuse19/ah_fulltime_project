/** Plain-div horizontal bar chart (no chart library, per the stack rules). */
export function BarChart({ rows, unit = "" }: { rows: { label: string; value: number }[]; unit?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[10rem_1fr_3rem] items-center gap-2 text-sm">
          <span className="truncate text-slate-600" title={r.label}>
            {r.label}
          </span>
          <div className="h-4 rounded bg-slate-100">
            <div className="h-4 rounded bg-sky-500" style={{ width: `${(100 * r.value) / max}%` }} aria-hidden />
          </div>
          <span className="text-right tabular-nums">
            {r.value}
            {unit}
          </span>
        </div>
      ))}
    </div>
  );
}

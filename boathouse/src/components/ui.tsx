import type { AssetStatus, SessionStatus } from "@/engine/types";

export function Badge({ tone, children }: { tone: "green" | "amber" | "red" | "gray" | "blue" | "purple"; children: React.ReactNode }) {
  const cls = {
    green: "bg-emerald-100 text-emerald-800",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-rose-100 text-rose-800",
    gray: "bg-slate-100 text-slate-700",
    blue: "bg-sky-100 text-sky-800",
    purple: "bg-violet-100 text-violet-800",
  }[tone];
  return <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}

export function AssetStatusBadge({ status }: { status: AssetStatus }) {
  const tone = { on_water: "green", caution: "amber", off_water: "red", retired: "gray" } as const;
  return <Badge tone={tone[status]}>{status.replace("_", " ")}</Badge>;
}

/** 11.2 colours: allocated green, partially_allocated amber, unfilled red. */
export function sessionStatusClasses(status: SessionStatus): string {
  switch (status) {
    case "allocated":
      return "border-emerald-300 bg-emerald-50";
    case "partially_allocated":
      return "border-amber-300 bg-amber-50";
    case "unfilled":
      return "border-rose-300 bg-rose-50";
    case "cancelled":
      return "border-slate-200 bg-slate-100 opacity-60";
    default:
      return "border-slate-200 bg-white";
  }
}

export function PageTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h1 className="text-xl font-semibold tracking-tight">{children}</h1>
      {right}
    </div>
  );
}

export function Card({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white p-4 ${className}`}>
      {title ? <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2> : null}
      {children}
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-500">{children}</p>;
}

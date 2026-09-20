import Link from "next/link";
import { formatDollars, formatPctValue } from "@/engine/metrics";
import { createServerClient } from "@/lib/supabase";
import { costShareRows, fleetRows, loadReportData, orgUtilization, programRows } from "@/lib/reports";
import { Card, PageTitle } from "@/components/ui";
import { FleetTable } from "./FleetTable";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "utilization", label: "Utilization by organization" },
  { key: "fleet", label: "Fleet view" },
  { key: "cost", label: "Cost-share summary" },
] as const;

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: rawTab } = await searchParams;
  const tab = TABS.some((t) => t.key === rawTab) ? (rawTab as (typeof TABS)[number]["key"]) : "utilization";
  const data = await loadReportData(createServerClient());

  return (
    <div>
      <PageTitle right={<span className="text-sm text-slate-500">Approved allocations only. Denominators run through {data.today}.</span>}>Reports</PageTitle>
      <nav className="mb-4 flex gap-1 border-b border-slate-200 text-sm">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/reports?tab=${t.key}`}
            className={`-mb-px border-b-2 px-3 py-2 ${tab === t.key ? "border-slate-800 font-semibold" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "utilization" ? <UtilizationTab data={data} /> : null}
      {tab === "fleet" ? (
        <Card title="Fleet view (non-retired shells)">
          <FleetTable
            rows={fleetRows(data).map((r) => ({
              id: r.asset.id,
              name: r.asset.name,
              asset_class: r.asset.asset_class,
              age: r.age,
              utilizationPct: r.utilizationPct,
              repairRatioPct: r.repairRatioPct,
              status: r.asset.status,
              candidate: r.candidate,
            }))}
          />
        </Card>
      ) : null}
      {tab === "cost" ? <CostTab data={data} /> : null}
    </div>
  );
}

function UtilizationTab({ data }: { data: Awaited<ReturnType<typeof loadReportData>> }) {
  const rows = orgUtilization(data);
  const total = rows.reduce((n, r) => n + r.total, 0);
  const programs = programRows(data);
  return (
    <div className="space-y-4">
      <Card title="Utilization by organization (8.2)">
        <table>
          <thead>
            <tr>
              <th>Organization</th>
              <th className="text-right">Borrowed session-outs</th>
              <th className="text-right">Owned session-outs</th>
              <th className="text-right">Total session-outs</th>
              <th className="text-right">Share of house total</th>
              <th className="text-right">Annual fee paid</th>
              <th className="text-right">Fee per session-out</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.org.id}>
                <td className="font-medium">{r.org.name}</td>
                <td className="text-right tabular-nums">{r.borrowed}</td>
                <td className="text-right tabular-nums">{r.owned}</td>
                <td className="text-right tabular-nums">{r.total}</td>
                <td className="text-right tabular-nums">{formatPctValue(r.share)}</td>
                <td className="text-right tabular-nums">{formatDollars(r.annual_fee_cents)}</td>
                <td className="text-right tabular-nums">{r.fee_per_session_out_cents === null ? "n/a" : formatDollars(r.fee_per_session_out_cents)}</td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td>House total</td>
              <td className="text-right tabular-nums">{rows.reduce((n, r) => n + r.borrowed, 0)}</td>
              <td className="text-right tabular-nums">{rows.reduce((n, r) => n + r.owned, 0)}</td>
              <td className="text-right tabular-nums">{total}</td>
              <td className="text-right tabular-nums">{total > 0 ? "100.0%" : "n/a"}</td>
              <td></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </Card>
      <Card title="Program split (A6): session-outs by organization and program">
        <table className="max-w-2xl">
          <thead>
            <tr>
              <th>Organization</th>
              <th>Program</th>
              <th className="text-right">Session-outs</th>
            </tr>
          </thead>
          <tbody>
            {programs.map((p) => (
              <tr key={`${p.org.id}-${p.program ?? "unset"}`}>
                <td>{p.org.name}</td>
                <td>{p.program ?? "unset"}</td>
                <td className="text-right tabular-nums">{p.session_outs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function CostTab({ data }: { data: Awaited<ReturnType<typeof loadReportData>> }) {
  const rows = costShareRows(data);
  return (
    <Card title="Cost-share summary (8.5): inputs only, no fair-fee formula (Section 12)">
      <table className="max-w-3xl">
        <thead>
          <tr>
            <th>Organization</th>
            <th className="text-right">Damage cost where liable (fixed or not)</th>
            <th className="text-right">Fee per session-out</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.org.id}>
              <td className="font-medium">{r.org.name}</td>
              <td className="text-right tabular-nums">{formatDollars(r.liable_damage_cents)}</td>
              <td className="text-right tabular-nums">{r.fee_per_session_out_cents === null ? "n/a" : formatDollars(r.fee_per_session_out_cents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

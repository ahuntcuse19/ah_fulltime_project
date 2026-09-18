import Link from "next/link";
import { notFound } from "next/navigation";
import { isShellClass } from "@/engine/types";
import { formatDollars, formatPctValue } from "@/engine/metrics";
import { createServerClient } from "@/lib/supabase";
import { loadNote, loadParts } from "@/lib/data";
import { boatReport, loadReportData } from "@/lib/reports";
import { AssetStatusBadge, Card, Empty, PageTitle } from "@/components/ui";
import { BarChart } from "@/components/BarChart";
import { RetireToggle } from "./RetireToggle";
import { DamageEvents } from "./DamageEvents";
import { DonorParagraph } from "./DonorParagraph";

export const dynamic = "force-dynamic";

export default async function AssetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createServerClient();
  const data = await loadReportData(db);
  const asset = data.assets.find((a) => a.id === id);
  if (!asset) notFound();
  const [parts, note] = await Promise.all([loadParts(db), loadNote(db, id)]);
  const r = boatReport(data, asset);
  const shell = isShellClass(asset.asset_class);
  const orgName = (orgId: string | null) => (orgId ? (data.organizations.find((o) => o.id === orgId)?.name ?? orgId) : "House");

  return (
    <div className="space-y-4">
      <PageTitle
        right={
          <div className="flex items-center gap-3">
            <AssetStatusBadge status={asset.status} />
            <RetireToggle assetId={asset.id} retired={asset.status === "retired"} />
            <Link href="/inventory" className="text-sm text-slate-500 hover:underline">
              Back to inventory
            </Link>
          </div>
        }
      >
        {shell ? "Boat report" : "Oar set"}: {asset.name}
      </PageTitle>

      {/* 8.3.1 Identity */}
      <Card title="Identity">
        <dl className="grid grid-cols-4 gap-x-6 gap-y-2 text-sm">
          <dt className="text-slate-500">Name</dt>
          <dd>{asset.name}</dd>
          <dt className="text-slate-500">Class</dt>
          <dd>{asset.asset_class}</dd>
          <dt className="text-slate-500">Year built</dt>
          <dd>{asset.year_built}</dd>
          <dt className="text-slate-500">Age</dt>
          <dd>{r.age}</dd>
          <dt className="text-slate-500">Donor</dt>
          <dd>{asset.donor_name ?? "House purchase"}</dd>
          <dt className="text-slate-500">Purchase cost</dt>
          <dd>{formatDollars(asset.purchase_cost_cents)}</dd>
          <dt className="text-slate-500">Replacement cost</dt>
          <dd>{formatDollars(asset.replacement_cost_cents)}</dd>
          <dt className="text-slate-500">Rack location</dt>
          <dd>{asset.rack_location}</dd>
          <dt className="text-slate-500">Owner</dt>
          <dd>{orgName(asset.owner_org_id)}</dd>
          <dt className="text-slate-500">Quality tier</dt>
          <dd>{asset.quality_tier}</dd>
          <dt className="text-slate-500">Current status</dt>
          <dd>
            <AssetStatusBadge status={asset.status} />
            {asset.retired_on ? <span className="ml-2 text-slate-500">since {asset.retired_on}</span> : null}
          </dd>
        </dl>
      </Card>

      {/* 8.3.2 Usage */}
      <Card title="Usage">
        <div className="grid grid-cols-3 gap-6 text-sm">
          <div>
            <dl className="space-y-1">
              <div className="flex justify-between">
                <dt className="text-slate-500">Session-outs</dt>
                <dd className="tabular-nums">{r.sessionOuts}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Available sessions</dt>
                <dd className="tabular-nums">{r.availableSessions}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Utilization</dt>
                <dd className="tabular-nums">{formatPctValue(r.utilizationPct)}</dd>
              </div>
              {shell ? (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Fleet median utilization</dt>
                  <dd className="tabular-nums">{formatPctValue(r.fleetMedianPct)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt className="text-slate-500">By slot</dt>
                <dd className="tabular-nums">
                  AM1 {r.bySlot.AM1}, AM2 {r.bySlot.AM2}, PM1 {r.bySlot.PM1}
                </dd>
              </div>
            </dl>
          </div>
          <div>
            <h3 className="mb-2 text-slate-500">Session-outs by organization</h3>
            <BarChart rows={r.byOrg.map((x) => ({ label: x.org.name, value: x.session_outs }))} />
          </div>
          <div>
            <h3 className="mb-2 text-slate-500">Session-outs by program</h3>
            <BarChart rows={["mens", "womens", "mixed"].map((p) => ({ label: p, value: r.byProgram[p] ?? 0 }))} />
          </div>
        </div>
      </Card>

      {/* 8.3.3 Health */}
      <Card title="Health">
        <div className="mb-3 grid grid-cols-3 gap-6 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Repair spend</span>
            <span className="tabular-nums">{formatDollars(r.repairSpendCents)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Repair ratio</span>
            <span className="tabular-nums">{formatPctValue(r.repairRatioPct)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Days off water this season</span>
            <span className="tabular-nums">{r.daysOffWater}</span>
          </div>
        </div>
        <DamageEvents
          assetId={asset.id}
          events={r.events}
          organizations={data.organizations.map((o) => ({ id: o.id, name: o.name }))}
          parts={parts.map((p) => ({ id: p.id, name: p.name }))}
        />
      </Card>

      {/* 8.3.4 Donor paragraph */}
      {shell ? (
        <Card title="Donor paragraph">
          <DonorParagraph assetId={asset.id} initialText={note?.text ?? null} updatedAt={note?.updated_at ?? null} />
        </Card>
      ) : (
        <Empty>Oar sets have no donor paragraph.</Empty>
      )}
    </div>
  );
}

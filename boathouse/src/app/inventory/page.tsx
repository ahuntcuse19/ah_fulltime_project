import type { AssetClass, AssetStatus } from "@/engine/types";
import { formatDollars } from "@/engine/metrics";
import { createServerClient } from "@/lib/supabase";
import { loadAssets, loadOrganizations } from "@/lib/data";
import { AssetStatusBadge, PageTitle } from "@/components/ui";
import { RowLink } from "@/components/RowLink";

export const dynamic = "force-dynamic";

const CLASSES: AssetClass[] = ["shell_1x", "shell_2x", "shell_2-", "shell_4x", "shell_4+", "shell_8+", "oar_set_sweep", "oar_set_scull"];
const STATUSES: AssetStatus[] = ["on_water", "caution", "off_water", "retired"];

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string; org?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const db = createServerClient();
  const [assets, orgs] = await Promise.all([loadAssets(db), loadOrganizations(db)]);
  const orgById = new Map(orgs.map((o) => [o.id, o]));

  const rows = assets
    .filter((a) => !sp.class || a.asset_class === sp.class)
    .filter((a) => !sp.org || (sp.org === "house" ? a.owner_org_id === null : a.owner_org_id === sp.org))
    .filter((a) => !sp.status || a.status === sp.status)
    .sort((a, b) => a.asset_class.localeCompare(b.asset_class) || b.year_built - a.year_built || a.name.localeCompare(b.name));

  return (
    <div>
      <PageTitle>Inventory</PageTitle>
      <form className="mb-4 flex flex-wrap items-end gap-3 text-sm" action="/inventory" method="get">
        <label className="flex flex-col gap-1">
          <span className="text-slate-500">Class</span>
          <select name="class" defaultValue={sp.class ?? ""} className="rounded border border-slate-300 px-2 py-1">
            <option value="">All</option>
            {CLASSES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-slate-500">Owner</span>
          <select name="org" defaultValue={sp.org ?? ""} className="rounded border border-slate-300 px-2 py-1">
            <option value="">All</option>
            <option value="house">House-owned</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-slate-500">Status</span>
          <select name="status" defaultValue={sp.status ?? ""} className="rounded border border-slate-300 px-2 py-1">
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded bg-slate-800 px-3 py-1.5 font-medium text-white">
          Filter
        </button>
        <a href="/inventory" className="text-slate-500 hover:underline">
          Clear
        </a>
        <span className="ml-auto text-slate-500">
          {rows.length} of {assets.length} assets. Click a row for the boat report.
        </span>
      </form>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Class</th>
              <th>Seats</th>
              <th>Quality</th>
              <th>Owner</th>
              <th>Shared</th>
              <th>Built</th>
              <th>Purchase</th>
              <th>Replacement</th>
              <th>Donor</th>
              <th>Status</th>
              <th>Rack</th>
              <th>Retired on</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <RowLink key={a.id} href={`/inventory/${a.id}`}>
                <td className="font-medium">{a.name}</td>
                <td>{a.asset_class}</td>
                <td className="tabular-nums">{a.seats}</td>
                <td>{a.quality_tier}</td>
                <td>{a.owner_org_id ? orgById.get(a.owner_org_id)?.name : "House"}</td>
                <td>{a.shared ? "yes" : "no"}</td>
                <td className="tabular-nums">{a.year_built}</td>
                <td className="tabular-nums">{formatDollars(a.purchase_cost_cents)}</td>
                <td className="tabular-nums">{formatDollars(a.replacement_cost_cents)}</td>
                <td>{a.donor_name ?? ""}</td>
                <td>
                  <AssetStatusBadge status={a.status} />
                </td>
                <td>{a.rack_location}</td>
                <td>{a.retired_on ?? ""}</td>
              </RowLink>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

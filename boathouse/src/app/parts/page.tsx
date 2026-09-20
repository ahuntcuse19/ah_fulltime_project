import { formatDollars } from "@/engine/metrics";
import { createServerClient } from "@/lib/supabase";
import { loadParts } from "@/lib/data";
import { Badge, PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

/** Section 11.5: parts table, flagged when qty_in_stock < reorder_threshold (4.7). */
export default async function PartsPage() {
  const parts = await loadParts(createServerClient());
  const flagged = parts.filter((p) => p.qty_in_stock < p.reorder_threshold).length;
  return (
    <div>
      <PageTitle right={<span className="text-sm text-slate-500">{flagged} of {parts.length} parts below reorder threshold</span>}>Parts</PageTitle>
      <div className="rounded-lg border border-slate-200 bg-white">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Component</th>
              <th className="text-right">In stock</th>
              <th className="text-right">On order</th>
              <th className="text-right">Unit cost</th>
              <th className="text-right">Reorder threshold</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {parts.map((p) => {
              const low = p.qty_in_stock < p.reorder_threshold;
              return (
                <tr key={p.id} className={low ? "bg-rose-50" : ""}>
                  <td className="font-medium">{p.name}</td>
                  <td>{p.component}</td>
                  <td className="text-right tabular-nums">{p.qty_in_stock}</td>
                  <td className="text-right tabular-nums">{p.qty_on_order}</td>
                  <td className="text-right tabular-nums">{formatDollars(p.unit_cost_cents)}</td>
                  <td className="text-right tabular-nums">{p.reorder_threshold}</td>
                  <td>{low ? <Badge tone="red">Reorder</Badge> : null}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

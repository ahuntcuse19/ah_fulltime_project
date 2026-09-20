"use client";

import { useMemo, useState } from "react";
import { formatPctValue } from "@/engine/metrics";
import { AssetStatusBadge, Badge } from "@/components/ui";
import { RowLink } from "@/components/RowLink";
import type { AssetStatus } from "@/engine/types";

export interface FleetRowView {
  id: string;
  name: string;
  asset_class: string;
  age: number;
  utilizationPct: number | null;
  repairRatioPct: number;
  status: AssetStatus;
  candidate: boolean;
}

type Key = "name" | "asset_class" | "age" | "utilizationPct" | "repairRatioPct" | "status";

const COLUMNS: { key: Key; label: string; numeric?: boolean }[] = [
  { key: "name", label: "Name" },
  { key: "asset_class", label: "Class" },
  { key: "age", label: "Age", numeric: true },
  { key: "utilizationPct", label: "Utilization", numeric: true },
  { key: "repairRatioPct", label: "Repair ratio", numeric: true },
  { key: "status", label: "Status" },
];

/** 8.4: sortable by any column; Replacement candidate flag when age >= 10 and repair ratio >= 15.0. */
export function FleetTable({ rows }: { rows: FleetRowView[] }) {
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "name", dir: 1 });
  const sorted = useMemo(() => {
    const cmp = (a: FleetRowView, b: FleetRowView) => {
      const x = a[sort.key];
      const y = b[sort.key];
      if (x === null && y === null) return 0;
      if (x === null) return 1;
      if (y === null) return -1;
      if (typeof x === "number" && typeof y === "number") return (x - y) * sort.dir;
      return String(x).localeCompare(String(y)) * sort.dir;
    };
    return [...rows].sort(cmp);
  }, [rows, sort]);

  return (
    <table>
      <thead>
        <tr>
          {COLUMNS.map((c) => (
            <th key={c.key} className={c.numeric ? "text-right" : ""}>
              <button
                type="button"
                onClick={() => setSort((s) => ({ key: c.key, dir: s.key === c.key ? ((s.dir * -1) as 1 | -1) : 1 }))}
                className="hover:underline"
              >
                {c.label}
                {sort.key === c.key ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
              </button>
            </th>
          ))}
          <th>Flag</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((r) => (
          <RowLink key={r.id} href={`/inventory/${r.id}`}>
            <td className="font-medium">{r.name}</td>
            <td>{r.asset_class}</td>
            <td className="text-right tabular-nums">{r.age}</td>
            <td className="text-right tabular-nums">{formatPctValue(r.utilizationPct)}</td>
            <td className="text-right tabular-nums">{formatPctValue(r.repairRatioPct)}</td>
            <td>
              <AssetStatusBadge status={r.status} />
            </td>
            <td>{r.candidate ? <Badge tone="red">Replacement candidate</Badge> : null}</td>
          </RowLink>
        ))}
      </tbody>
    </table>
  );
}

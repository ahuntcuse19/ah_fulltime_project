import Link from "next/link";
import { SEASON_START, addDays, isInSeason, isoWeekday, thisWeekMonday, todayNY, weekMondays } from "@/engine/dates";
import { createServerClient } from "@/lib/supabase";
import { cellKey, loadWeekView } from "@/lib/week-view";
import { Badge, PageTitle, sessionStatusClasses } from "@/components/ui";
import { WeekControls } from "./WeekControls";
import { OverrideControl } from "./OverrideControl";

export const dynamic = "force-dynamic";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function resolveMonday(raw: string | undefined): string {
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) && isoWeekday(raw) === 1 && isInSeason(raw)) return raw;
  return thisWeekMonday(todayNY());
}

export default async function WeekPage({ searchParams }: { searchParams: Promise<{ monday?: string }> }) {
  const { monday: raw } = await searchParams;
  const monday = resolveMonday(raw);
  const view = await loadWeekView(createServerClient(), monday);
  const mondays = weekMondays();
  const idx = mondays.indexOf(monday);
  const prev = idx > 0 ? mondays[idx - 1] : null;
  const next = idx >= 0 && idx < mondays.length - 1 ? mondays[idx + 1] : null;

  return (
    <div>
      <PageTitle
        right={
          <div className="flex items-center gap-2">
            {view.locked ? <Badge tone="blue">Locked: week approved</Badge> : <Badge tone="gray">Unapproved</Badge>}
            <WeekControls monday={monday} locked={view.locked} allocationCount={view.allocationCount} />
          </div>
        }
      >
        Week of {monday}
      </PageTitle>

      <form className="mb-4 flex items-center gap-2 text-sm" action="/week" method="get">
        {prev ? (
          <Link className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-100" href={`/week?monday=${prev}`}>
            Previous
          </Link>
        ) : null}
        <select name="monday" defaultValue={monday} className="rounded border border-slate-300 px-2 py-1">
          {mondays.map((m, i) => (
            <option key={m} value={m}>
              Week {i + 1}: {m} to {addDays(m, 6)}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-100">
          Go
        </button>
        {next ? (
          <Link className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-100" href={`/week?monday=${next}`}>
            Next
          </Link>
        ) : null}
        <span className="ml-auto text-slate-500">Season starts {SEASON_START}. Today is {todayNY()}.</span>
      </form>

      <div className="overflow-x-auto">
        <table className="min-w-[1100px] table-fixed">
          <thead>
            <tr>
              <th className="w-16">Slot</th>
              {view.dates.map((d, i) => (
                <th key={d}>
                  {DAY_NAMES[i]} <span className="font-normal text-slate-400">{d.slice(5)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.slots.map((slot) => (
              <tr key={slot}>
                <td className="font-semibold text-slate-600">{slot}</td>
                {view.dates.map((d) => {
                  const sessions = view.cells[cellKey(d, slot)] ?? [];
                  return (
                    <td key={d} className="p-1">
                      {sessions.length === 0 ? (
                        <div className="h-6" />
                      ) : (
                        <div className="space-y-1">
                          {sessions.map((sv) => (
                            <div key={sv.session.id} className={`rounded border p-2 text-xs ${sessionStatusClasses(sv.session.status)}`}>
                              <div className="flex items-start justify-between gap-1">
                                <span className="font-semibold">{sv.org.name}</span>
                                <span className="whitespace-nowrap tabular-nums text-slate-600">
                                  {sv.seatsAllocated}/{sv.session.requested_seats}
                                </span>
                              </div>
                              <div className="mb-1 flex flex-wrap gap-1">
                                <Badge tone={sv.session.status === "allocated" ? "green" : sv.session.status === "partially_allocated" ? "amber" : sv.session.status === "unfilled" ? "red" : "gray"}>
                                  {sv.session.status.replace("_", " ")}
                                </Badge>
                                {sv.noOars > 0 ? <Badge tone="red">no oars ({sv.noOars})</Badge> : null}
                                {sv.session.program ? <Badge tone="gray">{sv.session.program}</Badge> : null}
                              </div>
                              <ul className="space-y-0.5">
                                {sv.allocations.map((av) => (
                                  <li key={av.allocation.id} className="flex flex-wrap items-center gap-1">
                                    <span>{av.asset.name}</span>
                                    <span className="text-slate-400">{av.allocation.basis}</span>
                                    {av.caution ? <Badge tone="amber">caution</Badge> : null}
                                    {av.allocation.approved ? <Badge tone="blue">locked</Badge> : null}
                                    {av.allocation.overridden_from_asset_id ? <Badge tone="purple">override</Badge> : null}
                                    <OverrideControl allocationId={av.allocation.id} candidates={av.candidates} />
                                  </li>
                                ))}
                                {sv.allocations.length === 0 ? <li className="text-slate-500">no assets</li> : null}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

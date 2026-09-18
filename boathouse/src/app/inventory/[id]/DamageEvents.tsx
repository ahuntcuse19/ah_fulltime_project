"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Component, DamageEvent, DamageStatus, Severity } from "@/engine/types";
import { formatDollars } from "@/engine/metrics";

const COMPONENTS: Component[] = ["hull", "rigger", "oarlock", "seat_slide", "foot_stretcher", "fin_skeg", "oar", "other"];
const SEVERITIES: Severity[] = ["cosmetic", "caution", "off_water"];
const STATUSES: DamageStatus[] = ["open", "parts_ordered", "fixed"];

type Org = { id: string; name: string };
type Part = { id: string; name: string };

const input = "rounded border border-slate-300 px-2 py-1 text-sm";

export function DamageEvents({ assetId, events, organizations, parts }: { assetId: string; events: DamageEvent[]; organizations: Org[]; parts: Part[] }) {
  return (
    <div className="space-y-3">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Component</th>
            <th>Severity</th>
            <th>Status</th>
            <th>Resolved</th>
            <th>Cost</th>
            <th>Liable org</th>
            <th>Description</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {events.length === 0 ? (
            <tr>
              <td colSpan={9} className="text-slate-500">
                No damage events.
              </td>
            </tr>
          ) : null}
          {events.map((e) => (
            <EventRow key={e.id} event={e} organizations={organizations} parts={parts} />
          ))}
        </tbody>
      </table>
      <NewEventForm assetId={assetId} organizations={organizations} parts={parts} />
    </div>
  );
}

function EventRow({ event, organizations, parts }: { event: DamageEvent; organizations: Org[]; parts: Part[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<DamageStatus>(event.status);
  const [resolvedOn, setResolvedOn] = useState(event.resolved_on ?? "");
  const [cost, setCost] = useState(String(event.cost_cents / 100));
  const [partId, setPartId] = useState("");
  const [qty, setQty] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const orgName = (id: string | null) => (id ? (organizations.find((o) => o.id === id)?.name ?? id) : "House");

  async function save() {
    setBusy(true);
    setError(null);
    const patch: Record<string, unknown> = {
      status,
      resolved_on: resolvedOn || null,
      cost_cents: Math.round(Number(cost) * 100),
    };
    if (partId) patch.parts = [{ part_id: partId, qty_used: Number(qty) }];
    try {
      const res = await fetch(`/api/damage-events/${event.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Update failed");
        return;
      }
      setEditing(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <tr>
        <td className="tabular-nums">{event.reported_on}</td>
        <td>{event.component}</td>
        <td>{event.severity}</td>
        <td>{event.status}</td>
        <td className="tabular-nums">{event.resolved_on ?? ""}</td>
        <td className="tabular-nums">{formatDollars(event.cost_cents)}</td>
        <td>{orgName(event.liable_org_id)}</td>
        <td>{event.description}</td>
        <td>
          <button type="button" onClick={() => setEditing(true)} className="text-sky-700 hover:underline">
            Edit
          </button>
        </td>
      </tr>
    );
  }
  return (
    <tr className="bg-slate-50">
      <td className="tabular-nums">{event.reported_on}</td>
      <td>{event.component}</td>
      <td>{event.severity}</td>
      <td>
        <select value={status} onChange={(e) => setStatus(e.target.value as DamageStatus)} className={input}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </td>
      <td>
        <input type="date" value={resolvedOn} onChange={(e) => setResolvedOn(e.target.value)} className={input} />
      </td>
      <td>
        <input value={cost} onChange={(e) => setCost(e.target.value)} className={`${input} w-24`} inputMode="decimal" />
      </td>
      <td>{orgName(event.liable_org_id)}</td>
      <td>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Part used (decremented when fixed)</span>
          <div className="flex gap-1">
            <select value={partId} onChange={(e) => setPartId(e.target.value)} className={input}>
              <option value="">none</option>
              {parts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input value={qty} onChange={(e) => setQty(e.target.value)} className={`${input} w-16`} inputMode="numeric" />
          </div>
          {error ? <span className="text-xs text-rose-700">{error}</span> : null}
        </div>
      </td>
      <td>
        <div className="flex gap-1">
          <button type="button" disabled={busy} onClick={save} className="rounded bg-slate-800 px-2 py-1 text-xs text-white disabled:opacity-50">
            Save
          </button>
          <button type="button" onClick={() => setEditing(false)} className="rounded border border-slate-300 px-2 py-1 text-xs">
            Cancel
          </button>
        </div>
      </td>
    </tr>
  );
}

function NewEventForm({ assetId, organizations, parts }: { assetId: string; organizations: Org[]; parts: Part[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    reported_on: "",
    component: "hull" as Component,
    severity: "caution" as Severity,
    status: "open" as DamageStatus,
    resolved_on: "",
    cost: "0",
    liable_org_id: "",
    reported_by_org_id: "",
    description: "",
    part_id: "",
    qty_used: "1",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    setBusy(true);
    setError(null);
    const body: Record<string, unknown> = {
      asset_id: assetId,
      reported_on: form.reported_on,
      component: form.component,
      severity: form.severity,
      status: form.status,
      resolved_on: form.resolved_on || null,
      cost_cents: Math.round(Number(form.cost) * 100),
      liable_org_id: form.liable_org_id || null,
      reported_by_org_id: form.reported_by_org_id || null,
      description: form.description,
    };
    if (form.part_id) body.parts = [{ part_id: form.part_id, qty_used: Number(form.qty_used) }];
    try {
      const res = await fetch("/api/damage-events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Create failed");
        return;
      }
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="rounded border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100">
        Add damage event
      </button>
    );
  }
  return (
    <div className="grid grid-cols-4 gap-3 rounded border border-slate-200 bg-slate-50 p-3 text-sm">
      <label className="flex flex-col gap-1">
        <span className="text-slate-500">Reported on</span>
        <input type="date" value={form.reported_on} onChange={(e) => set("reported_on", e.target.value)} className={input} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-slate-500">Component</span>
        <select value={form.component} onChange={(e) => set("component", e.target.value)} className={input}>
          {COMPONENTS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-slate-500">Severity</span>
        <select value={form.severity} onChange={(e) => set("severity", e.target.value)} className={input}>
          {SEVERITIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-slate-500">Status</span>
        <select value={form.status} onChange={(e) => set("status", e.target.value)} className={input}>
          {STATUSES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-slate-500">Resolved on (required when fixed)</span>
        <input type="date" value={form.resolved_on} onChange={(e) => set("resolved_on", e.target.value)} className={input} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-slate-500">Cost (dollars)</span>
        <input value={form.cost} onChange={(e) => set("cost", e.target.value)} className={input} inputMode="decimal" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-slate-500">Liable organization</span>
        <select value={form.liable_org_id} onChange={(e) => set("liable_org_id", e.target.value)} className={input}>
          <option value="">House absorbs</option>
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-slate-500">Reported by</span>
        <select value={form.reported_by_org_id} onChange={(e) => set("reported_by_org_id", e.target.value)} className={input}>
          <option value="">Unknown</option>
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </label>
      <label className="col-span-2 flex flex-col gap-1">
        <span className="text-slate-500">Description</span>
        <input value={form.description} onChange={(e) => set("description", e.target.value)} className={input} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-slate-500">Part used</span>
        <select value={form.part_id} onChange={(e) => set("part_id", e.target.value)} className={input}>
          <option value="">none</option>
          {parts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-slate-500">Qty used</span>
        <input value={form.qty_used} onChange={(e) => set("qty_used", e.target.value)} className={input} inputMode="numeric" />
      </label>
      {error ? <p className="col-span-4 text-rose-700">{error}</p> : null}
      <div className="col-span-4 flex gap-2">
        <button type="button" disabled={busy} onClick={submit} className="rounded bg-slate-800 px-3 py-1.5 font-medium text-white disabled:opacity-50">
          Save event
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded border border-slate-300 px-3 py-1.5">
          Cancel
        </button>
      </div>
    </div>
  );
}

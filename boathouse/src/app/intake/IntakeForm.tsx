"use client";

import { useState } from "react";

type Org = { id: string; name: string; default_skill_tier: string };

interface Parsed {
  date: string | null;
  slot: "AM1" | "AM2" | "PM1" | null;
  requested_seats: number | null;
  skill_tier: "novice" | "intermediate" | "competitive" | null;
  confidence: "high" | "low";
  notes: string;
}

const FALLBACK = "Could not parse, fill in manually.";
const input = "rounded border border-slate-300 px-2 py-1.5 text-sm";
const highlight = "border-amber-400 bg-amber-50";

export function IntakeForm({ organizations }: { organizations: Org[] }) {
  const [orgId, setOrgId] = useState(organizations[0]?.id ?? "");
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [form, setForm] = useState({ date: "", slot: "", requested_seats: "", skill_tier: "" });
  const [inline, setInline] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState<"parse" | "save" | null>(null);
  const [nullFields, setNullFields] = useState<Set<string>>(new Set());

  async function parse() {
    setBusy("parse");
    setInline(null);
    setSaveError(null);
    setSaved(null);
    try {
      const res = await fetch("/api/intake/parse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ org_id: orgId, text }),
      });
      const body = (await res.json()) as { ok: boolean; parsed?: Parsed; message?: string };
      if (!res.ok || !body.ok || !body.parsed) {
        setParsed(null);
        setForm({ date: "", slot: "", requested_seats: "", skill_tier: "" });
        setNullFields(new Set());
        setInline(body.message ?? FALLBACK);
        return;
      }
      const p = body.parsed;
      setParsed(p);
      setForm({
        date: p.date ?? "",
        slot: p.slot ?? "",
        requested_seats: p.requested_seats === null ? "" : String(p.requested_seats),
        skill_tier: p.skill_tier ?? "",
      });
      setNullFields(
        new Set(
          (["date", "slot", "requested_seats", "skill_tier"] as const).filter((k) => p[k] === null),
        ),
      );
    } catch {
      setParsed(null);
      setInline(FALLBACK);
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    setBusy("save");
    setSaveError(null);
    setSaved(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          org_id: orgId,
          date: form.date,
          slot: form.slot,
          requested_seats: Number(form.requested_seats),
          skill_tier: form.skill_tier || null,
          source: "intake",
          raw_request_text: text,
        }),
      });
      const body = (await res.json()) as { id?: string; error?: string; date?: string };
      if (!res.ok) {
        setSaveError(body.error ?? "Save failed");
        return;
      }
      setSaved(`Session saved for ${body.date}. Generate that week to allocate.`);
    } finally {
      setBusy(null);
    }
  }

  const missing = !form.date || !form.slot || !form.requested_seats || !form.skill_tier;
  const cls = (k: string) => `${input} ${nullFields.has(k) ? highlight : ""}`;

  return (
    <div className="grid max-w-4xl grid-cols-2 gap-6">
      <div className="space-y-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-500">Requesting organization (required)</span>
          <select value={orgId} onChange={(e) => setOrgId(e.target.value)} className={input}>
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-500">Paste the request</span>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} className={input} placeholder="hey can we get two eights thursday early, we'll have about 16, the varsity group" />
        </label>
        <button type="button" onClick={parse} disabled={busy !== null || !text.trim() || !orgId} className="rounded bg-slate-800 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
          {busy === "parse" ? "Parsing" : "Parse request"}
        </button>
        {inline ? <p className="text-sm text-rose-700">{inline}</p> : null}
      </div>

      <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Session request</h2>
        {parsed ? (
          <p className="text-xs text-slate-500">
            Confidence: <span className={parsed.confidence === "high" ? "text-emerald-700" : "text-amber-700"}>{parsed.confidence}</span>
            {parsed.notes ? <span> · {parsed.notes}</span> : null}
          </p>
        ) : null}
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-500">Date</span>
          <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className={cls("date")} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-500">Slot</span>
          <select value={form.slot} onChange={(e) => setForm((f) => ({ ...f, slot: e.target.value }))} className={cls("slot")}>
            <option value="">Choose</option>
            <option value="AM1">AM1 (05:30 to 07:00)</option>
            <option value="AM2">AM2 (07:00 to 08:30)</option>
            <option value="PM1">PM1 (16:30 to 18:00)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-500">Requested seats</span>
          <input value={form.requested_seats} onChange={(e) => setForm((f) => ({ ...f, requested_seats: e.target.value }))} className={cls("requested_seats")} inputMode="numeric" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-500">Skill tier</span>
          <select value={form.skill_tier} onChange={(e) => setForm((f) => ({ ...f, skill_tier: e.target.value }))} className={cls("skill_tier")}>
            <option value="">Choose</option>
            <option value="novice">novice</option>
            <option value="intermediate">intermediate</option>
            <option value="competitive">competitive</option>
          </select>
        </label>
        {saveError ? <p className="text-sm text-rose-700">{saveError}</p> : null}
        {saved ? <p className="text-sm text-emerald-700">{saved}</p> : null}
        <button type="button" onClick={save} disabled={busy !== null || missing} className="rounded border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100 disabled:opacity-50">
          {busy === "save" ? "Saving" : "Save session"}
        </button>
      </div>
    </div>
  );
}

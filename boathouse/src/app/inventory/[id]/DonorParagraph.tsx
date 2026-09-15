"use client";

import { useState } from "react";

/** 8.3.4: generated paragraph, editable, Regenerate and Save paragraph (stored in boat_report_note). */
export function DonorParagraph({ assetId, initialText, updatedAt }: { assetId: string; initialText: string | null; updatedAt: string | null }) {
  const [text, setText] = useState(initialText ?? "");
  const [savedAt, setSavedAt] = useState(updatedAt);
  const [busy, setBusy] = useState<"generate" | "save" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function regenerate() {
    setBusy("generate");
    setMessage(null);
    try {
      const res = await fetch(`/api/assets/${assetId}/donor-paragraph`, { method: "POST" });
      const body = (await res.json()) as { text?: string; error?: string };
      if (!res.ok || !body.text) {
        setMessage(body.error ?? "Could not generate a paragraph.");
        return;
      }
      setText(body.text);
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    setBusy("save");
    setMessage(null);
    try {
      const res = await fetch(`/api/assets/${assetId}/note`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const body = (await res.json()) as { updated_at?: string; error?: string };
      if (!res.ok) {
        setMessage(body.error ?? "Save failed");
        return;
      }
      setSavedAt(body.updated_at ?? null);
      setMessage("Saved");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2 text-sm">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder="Click Regenerate to draft a paragraph for the donor, then edit and save."
        className="w-full rounded border border-slate-300 p-2"
      />
      <div className="flex items-center gap-2">
        <button type="button" disabled={busy !== null} onClick={regenerate} className="rounded bg-slate-800 px-3 py-1.5 font-medium text-white disabled:opacity-50">
          {busy === "generate" ? "Generating" : "Regenerate"}
        </button>
        <button
          type="button"
          disabled={busy !== null || text.trim().length === 0}
          onClick={save}
          className="rounded border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-100 disabled:opacity-50"
        >
          {busy === "save" ? "Saving" : "Save paragraph"}
        </button>
        {message ? <span className="text-slate-600">{message}</span> : null}
        {savedAt ? <span className="ml-auto text-slate-400">Saved {new Date(savedAt).toLocaleString("en-US", { timeZone: "America/New_York" })}</span> : null}
      </div>
    </div>
  );
}

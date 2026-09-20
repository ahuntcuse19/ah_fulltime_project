"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Section 6.4: replace one allocated asset with an eligible one, with a required reason. */
export function OverrideControl({ allocationId, candidates }: { allocationId: string; candidates: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [assetId, setAssetId] = useState(candidates[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sky-700 underline-offset-2 hover:underline">
        override
      </button>
    );
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/allocations/${allocationId}/override`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ asset_id: assetId, reason }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Override failed");
        return;
      }
      setOpen(false);
      setReason("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Override failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="mt-1 flex w-full flex-col gap-1 rounded border border-slate-300 bg-white p-1.5">
      {candidates.length === 0 ? (
        <span className="text-slate-500">No eligible replacement</span>
      ) : (
        <select value={assetId} onChange={(e) => setAssetId(e.target.value)} className="rounded border border-slate-300 px-1 py-0.5">
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (required)"
        className="rounded border border-slate-300 px-1 py-0.5"
      />
      {error ? <span className="text-rose-700">{error}</span> : null}
      <span className="flex gap-1">
        <button
          type="button"
          disabled={busy || candidates.length === 0}
          onClick={submit}
          className="rounded bg-slate-800 px-2 py-0.5 text-white disabled:opacity-50"
        >
          Apply
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded border border-slate-300 px-2 py-0.5">
          Cancel
        </button>
      </span>
    </span>
  );
}

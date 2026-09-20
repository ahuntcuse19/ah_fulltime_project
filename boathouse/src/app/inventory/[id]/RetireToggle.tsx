"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RetireToggle({ assetId, retired }: { assetId: string; retired: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/assets/${assetId}/retire`, { method: "POST" });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) setError(body.error ?? "Failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="flex items-center gap-2 text-sm">
      {error ? <span className="text-rose-700">{error}</span> : null}
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className="rounded border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-100 disabled:opacity-50"
      >
        {retired ? "Unretire" : "Retire"}
      </button>
    </span>
  );
}

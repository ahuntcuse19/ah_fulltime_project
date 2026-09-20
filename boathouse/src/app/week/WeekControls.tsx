"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function WeekControls({ monday, locked, allocationCount }: { monday: string; locked: boolean; allocationCount: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function call(action: "generate" | "approve") {
    setBusy(action);
    setMessage(null);
    try {
      const res = await fetch(`/api/weeks/${monday}/${action}`, { method: "POST" });
      const body = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        setMessage(String(body.error ?? "Request failed"));
      } else if (action === "generate") {
        setMessage(`Generated: ${body.inserted} new, ${body.kept} kept, ${body.deleted} removed`);
      } else {
        setMessage(`Approved ${body.approved} allocations`);
      }
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      {message ? <span className="text-slate-600">{message}</span> : null}
      <button
        type="button"
        onClick={() => call("generate")}
        disabled={busy !== null}
        className="rounded bg-slate-800 px-3 py-1.5 font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {busy === "generate" ? "Generating" : "Generate week"}
      </button>
      <button
        type="button"
        onClick={() => call("approve")}
        disabled={busy !== null || locked || allocationCount === 0}
        className="rounded border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-100 disabled:opacity-50"
      >
        {busy === "approve" ? "Approving" : "Approve week"}
      </button>
    </div>
  );
}

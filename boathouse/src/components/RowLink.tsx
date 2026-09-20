"use client";

import { useRouter } from "next/navigation";

/** A table row that navigates on click (Section 11.1 row click). */
export function RowLink({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) {
  const router = useRouter();
  return (
    <tr
      onClick={() => router.push(href)}
      className={`cursor-pointer hover:bg-slate-50 ${className}`}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(href);
      }}
    >
      {children}
    </tr>
  );
}

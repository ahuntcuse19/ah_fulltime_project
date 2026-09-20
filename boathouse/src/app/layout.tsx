import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Boathouse Allocation Engine",
  description: "Shared boathouse inventory, weekly allocation, damage tracking, and reports.",
};

const NAV: { href: string; label: string }[] = [
  { href: "/inventory", label: "Inventory" },
  { href: "/week", label: "Week" },
  { href: "/intake", label: "Intake" },
  { href: "/reports", label: "Reports" },
  { href: "/parts", label: "Parts" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-slate-200 bg-white">
          <nav className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-3">
            <Link href="/week" className="font-semibold tracking-tight text-slate-900">
              Boathouse
            </Link>
            <ul className="flex items-center gap-4 text-sm">
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="text-slate-600 hover:text-slate-900">
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
      </body>
    </html>
  );
}

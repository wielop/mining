"use client";

import Link from "next/link";
import { cn } from "@/components/ui/cn";

// Shared admin navigation tabs (visible only for admins).
export function AdminNav({
  active,
  isAdmin,
}: {
  active: "panel" | "data";
  isAdmin: boolean;
}) {
  if (!isAdmin) return null;
  const tabClass = (current: "panel" | "data") =>
    cn(
      "rounded-full border px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] transition",
      active === current
        ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100"
        : "border-white/10 text-zinc-400 hover:text-white"
    );

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <Link href="/admin" className={tabClass("panel")}>
        Panel
      </Link>
      <Link href="/admin/data" className={tabClass("data")}>
        Dane
      </Link>
    </div>
  );
}

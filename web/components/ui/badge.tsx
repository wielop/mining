"use client";

import { cn } from "@/components/ui/cn";

export function Badge({
  children,
  variant = "default",
  title,
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "muted";
  title?: string;
}) {
  const styles =
    variant === "success"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
      : variant === "warning"
        ? "border-amber-500/20 bg-amber-500/10 text-amber-200"
        : variant === "danger"
          ? "border-rose-500/20 bg-rose-500/10 text-rose-200"
          : variant === "muted"
            ? "border-zinc-700/60 bg-zinc-900/40 text-zinc-300"
            : "border-cyan-500/20 bg-cyan-500/10 text-cyan-200";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide",
        styles
      )}
      title={title}
    >
      {children}
    </span>
  );
}

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
      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100"
      : variant === "warning"
        ? "border-amber-400/40 bg-amber-400/10 text-amber-100"
        : variant === "danger"
          ? "border-rose-400/40 bg-rose-400/10 text-rose-100"
          : variant === "muted"
            ? "border-white/10 bg-white/5 text-zinc-300"
            : "border-cyan-400/40 bg-cyan-400/10 text-cyan-100";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em]",
        styles
      )}
      title={title}
    >
      {children}
    </span>
  );
}

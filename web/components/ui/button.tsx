"use client";

import { cn } from "@/components/ui/cn";

export function Button({
  children,
  onClick,
  disabled,
  variant = "primary",
  size = "md",
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 disabled:opacity-40 disabled:cursor-not-allowed";
  const sizes =
    size === "sm"
      ? "h-9 px-3 text-sm"
      : size === "lg"
        ? "h-12 px-5 text-base"
        : "h-10 px-3.5 text-sm";
  const variants =
    variant === "secondary"
      ? "border border-cyan-400/20 bg-ink/70 text-zinc-100 hover:border-cyan-300/40 hover:bg-ink/90"
      : variant === "ghost"
        ? "text-zinc-200 hover:bg-white/5"
        : variant === "danger"
          ? "border border-rose-500/30 bg-rose-500/15 text-rose-100 hover:bg-rose-500/25"
          : "border border-cyan-300/40 bg-gradient-to-r from-cyan-400/30 via-teal-300/20 to-emerald-300/20 text-white shadow-[0_0_18px_rgba(34,242,255,0.25)] hover:from-cyan-400/40 hover:to-emerald-300/30";

  return (
    <button
      type="button"
      className={cn(base, sizes, variants)}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
}

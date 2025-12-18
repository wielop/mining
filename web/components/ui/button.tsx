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
    "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 disabled:opacity-40 disabled:cursor-not-allowed";
  const sizes =
    size === "sm"
      ? "h-9 px-3 text-sm"
      : size === "lg"
        ? "h-12 px-4 text-base"
        : "h-10 px-3.5 text-sm";
  const variants =
    variant === "secondary"
      ? "border border-zinc-800/80 bg-zinc-900/50 text-zinc-100 hover:bg-zinc-900/70"
      : variant === "ghost"
        ? "text-zinc-200 hover:bg-zinc-900/60"
        : variant === "danger"
          ? "bg-rose-500/20 text-rose-100 hover:bg-rose-500/30 border border-rose-500/20"
          : "bg-gradient-to-b from-cyan-400/30 to-fuchsia-500/20 text-zinc-50 border border-white/10 hover:from-cyan-400/40 hover:to-fuchsia-500/30";

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


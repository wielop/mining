"use client";

import { cn } from "@/components/ui/cn";

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-3xl border border-cyan-400/10 bg-ink/70 p-5 shadow-[0_0_0_1px_rgba(34,242,255,0.08)] backdrop-blur-xl transition hover:border-cyan-300/30 hover:shadow-[0_0_32px_rgba(34,242,255,0.18)]",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-transparent" />
      <div className="relative">{children}</div>
    </section>
  );
}

export function CardHeader({
  title,
  description,
  right,
}: {
  title: string;
  description?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
        {description ? <div className="mt-1 text-xs text-zinc-400">{description}</div> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

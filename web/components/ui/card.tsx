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
        "relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/30 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur-xl",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" />
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


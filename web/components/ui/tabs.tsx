"use client";

import { cn } from "@/components/ui/cn";

export type TabOption<T extends string> = {
  value: T;
  label: string;
};

export function Tabs<T extends string>({
  value,
  onValueChange,
  options,
  className,
}: {
  value: T;
  onValueChange: (value: T) => void;
  options: Array<TabOption<T>>;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex rounded-full border border-cyan-400/20 bg-ink/70 p-1", className)}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onValueChange(opt.value)}
            className={cn(
              "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition",
              active
                ? "bg-cyan-300/20 text-white shadow-[0_0_14px_rgba(34,242,255,0.2)]"
                : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

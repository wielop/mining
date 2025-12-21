"use client";

import { cn } from "@/components/ui/cn";

export function Input({
  value,
  onChange,
  placeholder,
  right,
  mono = false,
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  right?: React.ReactNode;
  mono?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <input
        className={cn(
          "h-11 w-full rounded-2xl border border-cyan-400/10 bg-ink/80 px-3 pr-20 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/15",
          mono ? "font-mono" : "",
          disabled ? "cursor-not-allowed opacity-60" : ""
        )}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
      {right ? <div className="absolute inset-y-0 right-2 flex items-center">{right}</div> : null}
    </div>
  );
}

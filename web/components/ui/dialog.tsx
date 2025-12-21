"use client";

import { cn } from "@/components/ui/cn";
import { Button } from "@/components/ui/button";

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
        aria-label="Close dialog"
      />
      <div
        className={cn(
          "relative w-full max-w-lg overflow-hidden rounded-3xl border border-cyan-300/20 bg-ink/90 shadow-[0_0_40px_rgba(34,242,255,0.15)] backdrop-blur-xl"
        )}
      >
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-zinc-100">{title}</div>
              {description ? <div className="mt-1 text-xs text-zinc-400">{description}</div> : null}
            </div>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
          <div className="mt-4">{children}</div>
        </div>
        {footer ? <div className="border-t border-white/10 p-4">{footer}</div> : null}
      </div>
    </div>
  );
}

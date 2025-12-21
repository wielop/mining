"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type Toast = {
  id: string;
  title: string;
  description?: string;
  variant?: "success" | "error" | "info";
};

type ToastCtx = {
  push: (t: Omit<Toast, "id">) => void;
};

const Ctx = createContext<ToastCtx | null>(null);

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (crypto as any).randomUUID()
        : String(Date.now()) + Math.random().toString(16).slice(2);
    setToasts((prev) => [...prev, { ...t, id }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 3500);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-50 mx-auto flex max-w-md flex-col gap-2 px-3">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={[
              "pointer-events-auto rounded-2xl border px-4 py-3 shadow-[0_0_24px_rgba(34,242,255,0.15)] backdrop-blur-xl",
              t.variant === "success"
                ? "border-emerald-400/30 bg-emerald-950/40 text-emerald-100"
                : t.variant === "error"
                  ? "border-rose-400/30 bg-rose-950/40 text-rose-100"
                  : "border-cyan-300/20 bg-ink/80 text-zinc-100",
            ].join(" ")}
          >
            <div className="text-sm font-semibold">{t.title}</div>
            {t.description ? <div className="mt-1 text-xs text-white/70">{t.description}</div> : null}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

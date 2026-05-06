import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useSettings } from "@/store/settingsStore";

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Use red styling for destructive actions */
  destructive?: boolean;
}

interface ConfirmCtx {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const Ctx = createContext<ConfirmCtx | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const t = useSettings((s) => s.t);
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<((v: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setOpts(options);
      setResolver(() => resolve);
    });
  }, []);

  const close = (result: boolean) => {
    resolver?.(result);
    setResolver(null);
    setOpts(null);
  };

  return (
    <Ctx.Provider value={{ confirm }}>
      {children}
      {opts && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-[6px]"
            onClick={() => close(false)}
          />
          <div className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-bg-soft/90 backdrop-blur-xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Top glow */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-violet/50 to-transparent" />
            
            <button
              onClick={() => close(false)}
              className="absolute top-4 right-4 h-8 w-8 grid place-items-center rounded-xl text-muted hover:text-white hover:bg-white/[0.08] transition-all"
              aria-label="close"
            >
              <X size={16} />
            </button>
            <div className="p-7">
              <div className="flex flex-col items-center text-center gap-4">
                <div
                  className={`h-14 w-14 grid place-items-center rounded-2xl shrink-0 ${
                    opts.destructive
                      ? "bg-red-500/20 border border-red-500/30 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.15)]"
                      : "bg-brand-violet/20 border border-brand-violet/30 text-brand-cyan shadow-[0_0_20px_rgba(139,92,246,0.15)]"
                  }`}
                >
                  <AlertTriangle size={24} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-white tracking-tight">{opts.title}</h3>
                  {opts.message && (
                    <p className="text-xs text-muted leading-relaxed px-2">
                      {opts.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-8 flex flex-col gap-2">
                <button
                  onClick={() => close(true)}
                  className={`btn h-11 rounded-xl text-sm font-semibold transition-all ${
                    opts.destructive
                      ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20"
                      : "btn-primary shadow-lg shadow-brand-violet/20"
                  }`}
                >
                  {opts.confirmLabel ?? t("btn.delete")}
                </button>
                <button 
                  onClick={() => close(false)} 
                  className="btn-ghost h-10 text-xs text-muted hover:text-white transition-colors"
                >
                  {opts.cancelLabel ?? t("btn.cancel")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useConfirm(): ConfirmCtx["confirm"] {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Fallback when provider not mounted (e.g. tests). Still better than alert spam.
    return async (opts) => window.confirm(`${opts.title}${opts.message ? `\n\n${opts.message}` : ""}`);
  }
  return ctx.confirm;
}

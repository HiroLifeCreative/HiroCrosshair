import { Power, RotateCcw } from "lucide-react";
import { useCrosshairStore } from "@/store/crosshairStore";
import { useSettings } from "@/store/settingsStore";
import { CrosshairSVG } from "@/features/crosshair/renderer";

export function PreviewPanel() {
  const config = useCrosshairStore((s) => s.config);
  const overlayEnabled = useCrosshairStore((s) => s.overlayEnabled);
  const toggleOverlay = useCrosshairStore((s) => s.toggleOverlay);
  const resetConfig = useCrosshairStore((s) => s.resetConfig);
  const t = useSettings((s) => s.t);

  return (
    <section className="panel">
      <header className="panel-header">
        <div className="flex items-center gap-2">
          <span className="font-display tracking-wider text-sm text-white/90">
            {t("preview.title").toUpperCase()}
          </span>
          <span className={`chip ${overlayEnabled ? "!text-emerald-300 !border-emerald-400/40" : ""}`}>
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                overlayEnabled ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-muted"
              }`}
            />
            {overlayEnabled ? t("preview.overlay_on") : t("preview.overlay_off")}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button className="btn-icon" onClick={resetConfig} title={t("btn.reset")}>
            <RotateCcw size={15} />
          </button>
          <button
            onClick={toggleOverlay}
            className={`btn ${
              overlayEnabled
                ? "bg-emerald-500/15 border border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/25"
                : "btn-primary"
            }`}
          >
            <Power size={14} />
            {overlayEnabled ? t("preview.deactivate") : t("preview.activate")}
          </button>
        </div>
      </header>
      <div className="relative h-[360px] overflow-hidden rounded-b-2xl">
        {/* Game-like backdrop */}
        <div className="absolute inset-0 bg-[#0a0c1a]" />
        <div className="absolute inset-0 bg-grid-faint [background-size:32px_32px] opacity-40" />
        <div className="absolute inset-0 bg-radial-violet" />
        <div className="absolute inset-0 flex items-center justify-center">
          <CrosshairSVG config={config} size={Math.max(120, (config.size + config.gap) * 6)} />
        </div>
        {/* Corner brackets */}
        {[
          "top-4 left-4 border-t border-l",
          "top-4 right-4 border-t border-r",
          "bottom-4 left-4 border-b border-l",
          "bottom-4 right-4 border-b border-r",
        ].map((c, i) => (
          <div
            key={i}
            className={`absolute h-6 w-6 border-brand-violet/40 ${c}`}
          />
        ))}
      </div>
    </section>
  );
}

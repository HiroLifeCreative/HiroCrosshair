import { useEffect, useState } from "react";
import { CrosshairSVG } from "@/features/crosshair/renderer";
import { DEFAULT_CROSSHAIR, type CrosshairConfig } from "@/types/crosshair";
import { subscribeConfig } from "@/lib/tauri";

export function OverlayWindow() {
  const [config, setConfig] = useState<CrosshairConfig>(DEFAULT_CROSSHAIR);
  const [enabled, setEnabled] = useState(true);
  const [dim, setDim] = useState({ enabled: false, amount: 0.3 });

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    subscribeConfig((p) => {
      setConfig(p.config);
      setEnabled(p.overlayEnabled);
      setDim({ 
        enabled: p.dimBackground ?? false, 
        amount: p.dimAmount ?? 0.3 
      });
    }).then((un) => (cleanup = un));

    // --- GLOBAL LISTENERS (Always active in Overlay) ---
    import("@tauri-apps/api/event").then((event) => {
      event.listen("hiro:tray-toggle", () => {
        setEnabled(prev => !prev);
      });
      event.listen<string>("hiro:select-game", (ev) => {
        console.log("[overlay] remote game select:", ev.payload);
        // The overlay will get the new config via subscribeConfig from the main store
        // but if the main store is closed, we might need a more direct way or
        // ensure the main process manages the state.
      });
    });

    return () => cleanup?.();
  }, []);

  if (!enabled) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        background: dim.enabled ? `rgba(0,0,0,${dim.amount})` : "rgba(0,0,0,0.001)",
        transition: "background 0.2s ease",
      }}
    >
      <CrosshairSVG config={config} />
    </div>
  );
}

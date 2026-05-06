import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Crosshair } from "lucide-react";
import { useCrosshairStore } from "@/store/crosshairStore";
import { useSettings } from "@/store/settingsStore";
import { useGamesStore } from "@/store/gamesStore";
import { ControlsPanel } from "@/components/editor/ControlsPanel";
import { PreviewPanel } from "@/components/editor/PreviewPanel";
import { PresetPanel } from "@/components/editor/PresetPanel";
import { Titlebar } from "@/components/layout/Titlebar";
import { SettingsModal, useSyncAutostart } from "@/components/settings/SettingsModal";
import { GamesManager } from "@/components/games/GamesManager";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
import {
  getAppVersion,
  onHotkey,
  registerHotkeys,
  setOverlayMonitor,
  type HotkeyBinding,
} from "@/lib/tauri";
import * as event from "@tauri-apps/api/event";
import { useDebounce } from "@/lib/hooks";
import { getLastUpdateCheckMs, setLastUpdateCheckMs } from "@/lib/storage";

export function EditorWindow() {
  const hydrate = useCrosshairStore((s) => s.hydrate);
  const hydrated = useCrosshairStore((s) => s.hydrated);
  const overlayEnabled = useCrosshairStore((s) => s.overlayEnabled);
  const toggleOverlay = useCrosshairStore((s) => s.toggleOverlay);
  const setConfig = useCrosshairStore((s) => s.setConfig);
  const config = useCrosshairStore((s) => s.config);

  const hydrateSettings = useSettings((s) => s.hydrate);
  const settingsHydrated = useSettings((s) => s.hydrated);
  const accelerator = useSettings((s) => s.toggleOverlayHotkey);
  const startOverlay = useSettings((s) => s.startOverlay);
  const t = useSettings((s) => s.t);

  const hydrateGames = useGamesStore((s) => s.hydrate);
  const gamesHydrated = useGamesStore((s) => s.hydrated);
  const games = useGamesStore((s) => s.games);
  const activeGameId = useGamesStore((s) => s.activeGameId);
  const updateOverlayConfig = useGamesStore((s) => s.updateOverlayConfig);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [gamesOpen, setGamesOpen] = useState(false);
  const [version, setVersion] = useState("0.1.0");

  useSyncAutostart();

  // The active game and overlay (if any).
  const activeGame = useMemo(
    () => games.find((g) => g.id === activeGameId) ?? null,
    [games, activeGameId],
  );
  const activeOverlay = useMemo(() => {
    if (!activeGame) return null;
    return activeGame.overlays.find((o) => o.id === activeGame.activeOverlayId) ?? null;
  }, [activeGame]);

  useEffect(() => {
    hydrateSettings();
    hydrateGames();
    void hydrate();
    void getAppVersion().then(setVersion).catch(() => {});
  }, [hydrate, hydrateSettings, hydrateGames]);

  // ---- Auto-check for updates (daily) ----
  useEffect(() => {
    if (!settingsHydrated) return;
    const last = getLastUpdateCheckMs();
    const now = Date.now();
    if (last && now - last < 24 * 60 * 60 * 1000) return;
    setLastUpdateCheckMs(now);
    const channel = useSettings.getState().updateChannel;
    void import("@tauri-apps/api/core")
      .then(({ invoke }) => invoke("updater_check", { channel }))
      .catch(() => {});
  }, [settingsHydrated]);

  // ---- Hotkey registration with debounce to prevent "Already Registered" errors ----
  const bindings = useMemo(() => {
    if (!settingsHydrated || !gamesHydrated) return null;
    const list: HotkeyBinding[] = [];
    const valid = (s: string) => s && s.trim() && s !== "*";

    if (valid(accelerator)) {
      list.push({ accelerator: accelerator.trim(), id: "toggle", action: "toggle-overlay" });
    }
    if (activeGame) {
      for (const ov of activeGame.overlays) {
        if (!valid(ov.hotkey)) continue;
        if (ov.hotkey.trim() === (accelerator || "").trim()) continue;
        list.push({ accelerator: ov.hotkey.trim(), id: ov.id, action: "select-overlay" });
      }
    }
    // Deduplicate accelerators (favoring toggle)
    const seen = new Set<string>();
    return list.filter(b => {
      if (seen.has(b.accelerator)) return false;
      seen.add(b.accelerator);
      return true;
    });
  }, [accelerator, activeGame, settingsHydrated, gamesHydrated]);

  const debouncedBindings = useDebounce(bindings, 400);

  useEffect(() => {
    if (!debouncedBindings) return;
    console.log("[hotkeys] registering bindings:", debouncedBindings);
    void registerHotkeys(debouncedBindings).catch((e) => {
      console.warn("[hotkeys] register failed:", e);
    });
  }, [debouncedBindings]);

  // ---- Listen for hotkey events: mount once, read fresh state from stores ----
  useEffect(() => {
    const handleAction = (id: string, action: string) => {
      if (action === "toggle-overlay") {
        useCrosshairStore.getState().toggleOverlay();
        return;
      }
      if (action === "select-overlay") {
        const gs = useGamesStore.getState();
        const game = gs.games.find((g) => g.id === gs.activeGameId);
        if (!game) return;
        const ov = game.overlays.find((o) => o.id === id);
        if (!ov) return;
        gs.setActiveOverlay(game.id, ov.id);
        useCrosshairStore.getState().setConfig(ov.config);
        if (!useCrosshairStore.getState().overlayEnabled) {
          useCrosshairStore.getState().toggleOverlay();
        }
      }
    };

    const cleanupPromises: Promise<() => void>[] = [];

    // KB Hotkeys
    cleanupPromises.push(onHotkey((e) => {
      console.log("[hotkey:kb] event", e);
      handleAction(e.id, e.action);
    }));

    // Mouse Hotkeys
    cleanupPromises.push(event.listen<string>("hiro:mouse-hotkey", (ev) => {
      const accelerator = ev.payload;
      const accel = useSettings.getState().toggleOverlayHotkey;
      if (accel === accelerator) {
        handleAction("toggle", "toggle-overlay");
        return;
      }
      const gs = useGamesStore.getState();
      const game = gs.games.find((g) => g.id === gs.activeGameId);
      if (game) {
        const ov = game.overlays.find(o => o.hotkey === accelerator);
        if (ov) handleAction(ov.id, "select-overlay");
      }
    }));

    // Tray/Remote Toggle
    cleanupPromises.push(event.listen("hiro:tray-toggle", () => {
      console.log("[event] hiro:tray-toggle received");
      useCrosshairStore.getState().toggleOverlay();
    }));

    // Remote Select Game
    cleanupPromises.push(event.listen<string>("hiro:select-game", (ev) => {
      console.log("[remote] hiro:select-game:", ev.payload);
      // Backend emits empty string when deactivating current game.
      useGamesStore.getState().setActiveGame(ev.payload ? ev.payload : null);
    }));

    cleanupPromises.push(event.listen<string>("hiro:apply-preset", (ev) => {
      console.log("[remote] hiro:apply-preset:", ev.payload);
      useCrosshairStore.getState().applyPreset(ev.payload);
    }));

    // Remote Select Overlay
    cleanupPromises.push(event.listen<[string, string]>("hiro:select-overlay", (ev) => {
      const [gameId, overlayId] = ev.payload;
      console.log("[remote] hiro:select-overlay:", gameId, overlayId);
      useGamesStore.getState().setActiveOverlay(gameId, overlayId);
    }));

    return () => {
      cleanupPromises.forEach(p => p.then(un => un()));
    };
  }, []);

  // ---- Monitor Selection ----
  const overlayMonitor = useSettings((s) => s.overlayMonitor);
  useEffect(() => {
    if (settingsHydrated && overlayMonitor) {
      void setOverlayMonitor(overlayMonitor);
    }
  }, [settingsHydrated, overlayMonitor]);

  // ---- Apply "Start with overlay enabled" once after hydration ----
  const initialOverlayApplied = useRef(false);
  useEffect(() => {
    if (
      hydrated &&
      settingsHydrated &&
      !initialOverlayApplied.current &&
      startOverlay &&
      !overlayEnabled
    ) {
      initialOverlayApplied.current = true;
      toggleOverlay();
    }
  }, [hydrated, settingsHydrated, startOverlay, overlayEnabled, toggleOverlay]);

  // ---- Load active overlay's config into the editor when it changes ----
  const loadingRef = useRef<string>("");
  const loadedKeyRef = useRef<string>("");
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    if (!gamesHydrated) return;
    if (!activeGame || !activeOverlay) {
      loadedKeyRef.current = "";
      setSynced(true);
      return;
    }
    const key = `${activeGame.id}:${activeOverlay.id}`;
    if (loadedKeyRef.current === key) {
      setSynced(true);
      return;
    }
    loadedKeyRef.current = key;
    loadingRef.current = key;
    setConfig(activeOverlay.config);
    setSynced(true);
  }, [activeGame, activeOverlay, setConfig, gamesHydrated]);

  // ---- Sync editor edits back into the active overlay's stored config ----
  useEffect(() => {
    if (!activeGame || !activeOverlay) return;
    const key = `${activeGame.id}:${activeOverlay.id}`;
    if (loadingRef.current === key) {
      loadingRef.current = "";
      return;
    }
    const currentSerialized = JSON.stringify(activeOverlay.config);
    const nextSerialized = JSON.stringify(config);
    if (currentSerialized === nextSerialized) return;

    updateOverlayConfig(activeGame.id, activeOverlay.id, config);
  }, [config, activeGame?.id, activeOverlay?.id, updateOverlayConfig]);

  if (!hydrated || !settingsHydrated || !gamesHydrated || !synced) {
    return (
      <div className="h-screen grid place-items-center bg-bg relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-radial-violet opacity-30" />
        <div className="flex flex-col items-center gap-4 animate-pulse">
           <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-brand-violet to-brand-purple shadow-glow grid place-items-center">
             <Crosshair size={24} className="text-white" />
           </div>
           <div className="font-display tracking-[0.2em] text-[10px] text-muted">CARGANDO STUDIO...</div>
        </div>
      </div>
    );
  }

  return (
    <ConfirmProvider>
    <div className="relative h-screen w-full bg-bg overflow-hidden flex flex-col">
      <div className="pointer-events-none absolute inset-0 bg-radial-violet" />
      <div className="pointer-events-none absolute inset-0 bg-grid-faint [background-size:48px_48px] opacity-[0.07]" />

      <Titlebar
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenGames={() => setGamesOpen(true)}
        version={version}
      />

      {activeGame && activeOverlay && (
        <div className="relative z-10 flex items-center justify-between gap-3 px-5 py-2 border-b border-line/60 bg-gradient-to-r from-brand-violet/10 via-brand-violet/5 to-transparent">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-base">{activeGame.icon ?? "🎮"}</span>
            <span className="text-muted">{t("games.editing_indicator", { game: activeGame.name, overlay: activeOverlay.name })}</span>
            <kbd className="ml-1 px-1.5 py-0.5 text-[10px] font-mono rounded bg-bg-soft border border-line/70 text-white/80">
              {activeOverlay.hotkey || "—"}
            </kbd>
          </div>
          <button
            onClick={() => useGamesStore.getState().setActiveGame(null)}
            className="btn-ghost text-xs"
          >
            <ArrowLeft size={12} />
            {t("games.exit_editing")}
          </button>
        </div>
      )}

      <main className="relative z-10 flex-1 overflow-y-auto">
        <div className="grid grid-cols-12 gap-5 p-5 max-w-[1400px] mx-auto">
          <div className="col-span-12 lg:col-span-5 space-y-5">
            <PreviewPanel />
            <PresetPanel />
          </div>
          <div className="col-span-12 lg:col-span-7">
            <ControlsPanel />
          </div>
        </div>
      </main>

      <footer className="relative z-10 px-5 py-2 text-[11px] text-muted border-t border-line/60 flex items-center justify-between">
        <span>{t("settings.about.copyright", { y: new Date().getFullYear() })}</span>
        <span className="font-mono">Status: {t("app.status_ready")}</span>
      </footer>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        version={version}
      />
      <GamesManager open={gamesOpen} onClose={() => setGamesOpen(false)} />
    </div>
    </ConfirmProvider>
  );
}

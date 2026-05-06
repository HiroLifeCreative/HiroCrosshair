import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { DEFAULT_CROSSHAIR, type CrosshairConfig, type Preset } from "@/types/crosshair";
import { loadState, saveState } from "@/lib/storage";
import { broadcastConfig } from "@/lib/tauri";
import { useGamesStore } from "./gamesStore";

interface CrosshairState {
  config: CrosshairConfig;
  presets: Preset[];
  activePresetId: string | null;
  overlayEnabled: boolean;
  hydrated: boolean;

  hydrate: () => Promise<void>;
  setConfig: (patch: Partial<CrosshairConfig>) => void;
  resetConfig: () => void;
  toggleOverlay: () => void;

  // Presets
  savePreset: (name?: string) => void;
  applyPreset: (id: string) => void;
  duplicatePreset: (id: string) => void;
  renamePreset: (id: string, name: string) => void;
  deletePreset: (id: string) => void;
  exportPresets: () => string;
  importPresets: (json: string) => void;
}

const newId = () =>
  `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const useCrosshairStore = create<CrosshairState>((set, get) => {
  // Persist + broadcast on every relevant change
  const persistAndBroadcast = () => {
    const { config, presets, activePresetId, overlayEnabled } = get();
    void saveState({ config, presets, activePresetId, overlayEnabled });
    
    // Get window settings from active overlay if any
    const active = useGamesStore.getState().getActiveOverlay();
    void broadcastConfig({ 
      config, 
      overlayEnabled,
      ignoreClicks: active?.overlay.ignoreClicks,
      dimBackground: active?.overlay.dimBackground,
      dimAmount: active?.overlay.dimAmount,
    });

    // Sync presets to Rust for Stream Deck
    import("@tauri-apps/api/core").then(({ invoke }) => {
      void invoke("sync_presets", { 
        presets: presets.map(p => ({ id: p.id, name: p.name }))
      });
    });
  };

  return {
    config: { ...DEFAULT_CROSSHAIR },
    presets: [],
    activePresetId: null,
    overlayEnabled: false,
    hydrated: false,

    hydrate: async () => {
      const s = await loadState();
      if (s) {
        // Migrate older presets that may lack the newer FX/per-element fields.
        const migrate = (c: Partial<CrosshairConfig> | undefined): CrosshairConfig => ({
          ...DEFAULT_CROSSHAIR,
          ...(c ?? {}),
        });
        set({
          config: migrate(s.config),
          presets: (s.presets ?? []).map((p) => ({ ...p, config: migrate(p.config) })),
          activePresetId: s.activePresetId ?? null,
          overlayEnabled: s.overlayEnabled ?? false,
          hydrated: true,
        });
      } else {
        set({ hydrated: true });
      }
      void broadcastConfig({
        config: get().config,
        overlayEnabled: get().overlayEnabled,
      });
    },

    setConfig: (patch) => {
      set((s) => ({ config: { ...s.config, ...patch } }));
      persistAndBroadcast();
    },

    resetConfig: () => {
      set({ config: { ...DEFAULT_CROSSHAIR } });
      persistAndBroadcast();
    },

    toggleOverlay: () => {
      const current = get().overlayEnabled;
      console.log("[store] toggleOverlay called. Current:", current, "-> Next:", !current);
      set((s) => ({ overlayEnabled: !s.overlayEnabled }));
      persistAndBroadcast();
    },

    savePreset: (name) => {
      const id = newId();
      const now = Date.now();
      const preset: Preset = {
        id,
        name: name?.trim() || `Preset ${get().presets.length + 1}`,
        createdAt: now,
        updatedAt: now,
        config: { ...get().config },
      };
      set((s) => ({ presets: [...s.presets, preset], activePresetId: id }));
      invoke("set_active_preset", { id }).catch(console.error);
      persistAndBroadcast();
    },

    applyPreset: (id) => {
      const p = get().presets.find((x) => x.id === id);
      if (!p) return;
      set({ config: { ...p.config }, activePresetId: id });
      invoke("set_active_preset", { id }).catch(console.error);
      persistAndBroadcast();
    },

    duplicatePreset: (id) => {
      const p = get().presets.find((x) => x.id === id);
      if (!p) return;
      const copy: Preset = {
        ...p,
        id: newId(),
        name: `${p.name} copy`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        config: { ...p.config },
      };
      set((s) => ({ presets: [...s.presets, copy] }));
      persistAndBroadcast();
    },

    renamePreset: (id, name) => {
      set((s) => ({
        presets: s.presets.map((p) =>
          p.id === id ? { ...p, name, updatedAt: Date.now() } : p,
        ),
      }));
      persistAndBroadcast();
    },

    deletePreset: (id) => {
      set((s) => ({
        presets: s.presets.filter((p) => p.id !== id),
        activePresetId: s.activePresetId === id ? null : s.activePresetId,
      }));
      persistAndBroadcast();
    },

    exportPresets: () => JSON.stringify(get().presets, null, 2),

    importPresets: (json) => {
      try {
        const data = JSON.parse(json) as Preset[];
        if (!Array.isArray(data)) return;
        const valid = data.filter(
          (p) => p && typeof p.id === "string" && p.config,
        );
        set((s) => ({ presets: [...s.presets, ...valid] }));
        persistAndBroadcast();
      } catch {
        /* ignore */
      }
    },
  };
});

import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { DEFAULT_CROSSHAIR, type CrosshairConfig, type Game, type GameOverlay } from "@/types/crosshair";
import { getGameCover } from "@/lib/gameArt";

const STORAGE_KEY = "hirocrosshair.games.v1";

interface GamesState {
  games: Game[];
  /** Currently selected game (whose hotkeys are active). */
  activeGameId: string | null;
  hydrated: boolean;

  hydrate: () => void;
  persist: () => void;

  addGame: (g: Omit<Game, "id" | "overlays" | "activeOverlayId" | "createdAt"> & { overlays?: GameOverlay[] }) => string;
  setGameCover: (id: string, coverUrl: string | null) => void;
  removeGame: (id: string) => void;
  renameGame: (id: string, name: string) => void;
  setActiveGame: (id: string | null) => void;

  addOverlay: (gameId: string, overlay?: Partial<GameOverlay>) => string;
  removeOverlay: (gameId: string, overlayId: string) => void;
  updateOverlay: (gameId: string, overlayId: string, patch: Partial<GameOverlay>) => void;
  updateOverlayConfig: (gameId: string, overlayId: string, patch: Partial<CrosshairConfig>) => void;
  setOverlayHotkey: (gameId: string, overlayId: string, hotkey: string) => void;
  setActiveOverlay: (gameId: string, overlayId: string | null) => void;

  /** Returns the currently active overlay (across active game). */
  getActiveOverlay: () => { game: Game; overlay: GameOverlay } | null;
}

const newId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const defaultOverlay = (name: string, hotkey: string): GameOverlay => ({
  id: newId("ov"),
  name,
  hotkey,
  config: { ...DEFAULT_CROSSHAIR },
  ignoreClicks: true,
  dimBackground: false,
  dimAmount: 0.3,
});

const seedOverlays = (): GameOverlay[] => [
  defaultOverlay("Slot 1", "1"),
  defaultOverlay("Slot 2", "2"),
  defaultOverlay("Slot 3", "3"),
];

export const useGamesStore = create<GamesState>((set, get) => ({
  games: [],
  activeGameId: null,
  hydrated: false,

  hydrate: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as { games: Game[]; activeGameId: string | null };
        // Migrate overlay configs that pre-date FX/per-element fields.
        const games = (data.games ?? []).map((g) => ({
          ...g,
          overlays: g.overlays.map((ov) => ({
            ...ov,
            config: { ...DEFAULT_CROSSHAIR, ...(ov.config ?? {}) },
            ignoreClicks: ov.ignoreClicks ?? true,
            dimBackground: ov.dimBackground ?? false,
            dimAmount: ov.dimAmount ?? 0.3,
          })),
        }));
        set({
          games,
          activeGameId: data.activeGameId ?? null,
          hydrated: true,
        });
        invoke("sync_games", { games: games.map(g => ({ id: g.id, name: g.name })) }).catch(console.error);
        if (data.activeGameId) {
            invoke("set_active_game", { id: data.activeGameId }).catch(console.error);
        }
        return;
      }
    } catch {
      /* ignore */
    }
    set({ hydrated: true });
  },

  persist: () => {
    const { games, activeGameId } = get();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ games, activeGameId }));
      invoke("sync_games", { games: games.map(g => ({ id: g.id, name: g.name })) }).catch(console.error);
      invoke("set_active_game", { id: activeGameId || "" }).catch(console.error);
    } catch {
      /* ignore */
    }
  },

  addGame: (g) => {
    const id = newId("g");
    const overlays = g.overlays ?? seedOverlays();
    const game: Game = {
      id,
      name: g.name,
      platform: g.platform,
      installDir: g.installDir,
      exeName: g.exeName,
      icon: g.icon,
      coverUrl: g.coverUrl ?? null,
      overlays,
      activeOverlayId: overlays[0]?.id ?? null,
      createdAt: Date.now(),
    };
    set((s) => ({ games: [...s.games, game] }));
    get().persist();
    // Auto-resolve cover art in the background
    if (!game.coverUrl) {
      void getGameCover(game.name).then((url) => {
        if (url) get().setGameCover(id, url);
      });
    }
    return id;
  },

  setGameCover: (id, coverUrl) => {
    set((s) => ({ games: s.games.map((g) => (g.id === id ? { ...g, coverUrl } : g)) }));
    get().persist();
  },

  removeGame: (id) => {
    set((s) => ({
      games: s.games.filter((g) => g.id !== id),
      activeGameId: s.activeGameId === id ? null : s.activeGameId,
    }));
    get().persist();
  },

  renameGame: (id, name) => {
    set((s) => ({
      games: s.games.map((g) => (g.id === id ? { ...g, name } : g)),
    }));
    get().persist();
  },

  setActiveGame: (id) => {
    set({ activeGameId: id });
    get().persist();
  },

  addOverlay: (gameId, overlay) => {
    const id = newId("ov");
    set((s) => ({
      games: s.games.map((g) => {
        if (g.id !== gameId) return g;
        const slot = g.overlays.length + 1;
        const ov: GameOverlay = {
          id,
          name: overlay?.name ?? `Slot ${slot}`,
          hotkey: overlay?.hotkey ?? `${slot}`,
          ignoreClicks: overlay?.ignoreClicks ?? true,
          config: overlay?.config ?? { ...DEFAULT_CROSSHAIR },
        };
        return {
          ...g,
          overlays: [...g.overlays, ov],
          activeOverlayId: g.activeOverlayId ?? id,
        };
      }),
    }));
    get().persist();
    return id;
  },

  removeOverlay: (gameId, overlayId) => {
    set((s) => ({
      games: s.games.map((g) => {
        if (g.id !== gameId) return g;
        const overlays = g.overlays.filter((o) => o.id !== overlayId);
        return {
          ...g,
          overlays,
          activeOverlayId:
            g.activeOverlayId === overlayId
              ? overlays[0]?.id ?? null
              : g.activeOverlayId,
        };
      }),
    }));
    get().persist();
  },

  updateOverlay: (gameId, overlayId, patch) => {
    set((s) => ({
      games: s.games.map((g) =>
        g.id !== gameId
          ? g
          : {
              ...g,
              overlays: g.overlays.map((o) =>
                o.id === overlayId ? { ...o, ...patch } : o,
              ),
            },
      ),
    }));
    get().persist();
  },

  updateOverlayConfig: (gameId, overlayId, patch) => {
    set((s) => ({
      games: s.games.map((g) =>
        g.id !== gameId
          ? g
          : {
              ...g,
              overlays: g.overlays.map((o) =>
                o.id === overlayId
                  ? { ...o, config: { ...o.config, ...patch } }
                  : o,
              ),
            },
      ),
    }));
    get().persist();
  },

  setOverlayHotkey: (gameId, overlayId, hotkey) => {
    get().updateOverlay(gameId, overlayId, { hotkey });
  },

  setActiveOverlay: (gameId, overlayId) => {
    set((s) => ({
      games: s.games.map((g) =>
        g.id === gameId ? { ...g, activeOverlayId: overlayId } : g,
      ),
    }));
    get().persist();
  },

  getActiveOverlay: () => {
    const { games, activeGameId } = get();
    if (!activeGameId) return null;
    const game = games.find((g) => g.id === activeGameId);
    if (!game) return null;
    const overlay = game.overlays.find((o) => o.id === game.activeOverlayId);
    if (!overlay) return null;
    return { game, overlay };
  },
}));

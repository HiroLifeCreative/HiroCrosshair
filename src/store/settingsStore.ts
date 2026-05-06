import { create } from "zustand";
import type { Locale } from "@/lib/i18n";
import { translate } from "@/lib/i18n";

const KEY = "hiro-crosshair:settings:v1";

export interface AppSettings {
  locale: Locale;
  autostart: boolean;
  startMinimized: boolean;
  startOverlay: boolean;
  toggleOverlayHotkey: string; // e.g. "Alt+X"
  updateChannel: "stable" | "beta";
  overlayMonitor: string | null;
}

const DEFAULT_SETTINGS: AppSettings = {
  locale: "es",
  autostart: false,
  startMinimized: false,
  startOverlay: false,
  toggleOverlayHotkey: "Alt+X",
  updateChannel: "stable",
  overlayMonitor: null,
};

interface SettingsState extends AppSettings {
  hydrated: boolean;
  hydrate: () => void;
  set: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

function load(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function save(s: AppSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export const useSettings = create<SettingsState>((setStore, get) => ({
  ...DEFAULT_SETTINGS,
  hydrated: false,
  hydrate: () => {
    const loaded = load();
    setStore({ ...loaded, hydrated: true });
  },
  set: (key, value) => {
    setStore({ [key]: value } as Partial<SettingsState>);
    const { hydrated: _h, hydrate: _hf, set: _s, t: _t, ...rest } = get();
    save(rest as AppSettings);
  },
  t: (key, vars) => translate(get().locale, key, vars),
}));

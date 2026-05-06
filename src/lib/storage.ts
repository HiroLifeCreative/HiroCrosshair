import type { CrosshairConfig, Preset } from "@/types/crosshair";

export interface PersistedState {
  config: CrosshairConfig;
  presets: Preset[];
  activePresetId: string | null;
  overlayEnabled: boolean;
}

const KEY = "hiro-crosshair:state:v1";
const UPDATES_LAST_CHECK_KEY = "hiro-crosshair:updates:lastCheck:v1";

/**
 * Storage layer. Currently uses localStorage for simplicity.
 * Can be swapped to Tauri Store plugin without changing callers.
 */
export async function loadState(): Promise<PersistedState | null> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}

export async function saveState(state: PersistedState): Promise<void> {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* quota / unavailable */
  }
}

export function getLastUpdateCheckMs(): number | null {
  try {
    const raw = localStorage.getItem(UPDATES_LAST_CHECK_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function setLastUpdateCheckMs(ms: number): void {
  try {
    localStorage.setItem(UPDATES_LAST_CHECK_KEY, String(ms));
  } catch {
    /* ignore */
  }
}

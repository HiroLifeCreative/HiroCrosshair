import type { CrosshairConfig } from "@/types/crosshair";

export interface BroadcastPayload {
  config: CrosshairConfig;
  overlayEnabled: boolean;
  ignoreClicks?: boolean;
  dimBackground?: boolean;
  dimAmount?: number;
}

export interface MonitorInfo {
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  is_primary: boolean;
}

const EVENT = "hiro:crosshair-update";

const isTauri = (): boolean =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/**
 * Send the latest crosshair config to the overlay window.
 * Tauri: emits global event + invokes a Rust command to toggle the overlay window.
 * Browser fallback: BroadcastChannel (useful for `npm run dev` without Tauri).
 */
export async function broadcastConfig(payload: BroadcastPayload): Promise<void> {
  if (isTauri()) {
    try {
      const event = await import("@tauri-apps/api/event");
      await event.emit(EVENT, payload);
      const core = await import("@tauri-apps/api/core");
      await core.invoke("set_overlay_visible", { 
        visible: payload.overlayEnabled,
        ignoreClicks: payload.ignoreClicks ?? true,
      }).catch(() => {});
    } catch (e) {
      console.warn("[tauri] broadcastConfig failed:", e);
    }
    return;
  }
  try {
    const ch = new BroadcastChannel(EVENT);
    ch.postMessage(payload);
    ch.close();
  } catch {
    /* ignore */
  }
}

export async function subscribeConfig(
  cb: (p: BroadcastPayload) => void,
): Promise<() => void> {
  if (isTauri()) {
    const event = await import("@tauri-apps/api/event");
    const unlisten = await event.listen<BroadcastPayload>(EVENT, (e) =>
      cb(e.payload),
    );
    return unlisten;
  }
  const ch = new BroadcastChannel(EVENT);
  ch.onmessage = (e: MessageEvent<BroadcastPayload>) => cb(e.data);
  return () => ch.close();
}

// ---------- Window controls (custom titlebar) ----------

export async function minimizeWindow(): Promise<void> {
  if (!isTauri()) return;
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().minimize();
}

export async function toggleMaximizeWindow(): Promise<void> {
  if (!isTauri()) return;
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().toggleMaximize();
}

export async function closeWindow(): Promise<void> {
  if (!isTauri()) return;
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().close();
}

export async function hideWindow(): Promise<void> {
  if (!isTauri()) return;
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().hide();
}

export async function showWindow(): Promise<void> {
  if (!isTauri()) return;
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().show();
  await getCurrentWindow().setFocus();
}

export async function exitApp(): Promise<void> {
  if (!isTauri()) return;
  const { exit } = await import("@tauri-apps/plugin-process");
  await exit(0);
}

// ---------- Tauri commands ----------

export interface DetectedGame {
  name: string;
  platform: string;
  install_dir: string;
  icon: string | null;
}

export async function getAvailableMonitors(): Promise<MonitorInfo[]> {
  if (!isTauri()) return [];
  const core = await import("@tauri-apps/api/core");
  return await core.invoke<MonitorInfo[]>("get_available_monitors");
}

export async function setOverlayMonitor(monitorName: string): Promise<void> {
  if (!isTauri()) return;
  const core = await import("@tauri-apps/api/core");
  return await core.invoke("set_overlay_monitor", { monitorName });
}

export async function getAppVersion(): Promise<string> {
  if (!isTauri()) return "0.1.0-dev";
  const core = await import("@tauri-apps/api/core");
  return await core.invoke<string>("get_app_version");
}

export async function scanInstalledGames(): Promise<DetectedGame[]> {
  if (!isTauri()) return [];
  const core = await import("@tauri-apps/api/core");
  return await core.invoke<DetectedGame[]>("scan_installed_games");
}

export interface HotkeyBinding {
  accelerator: string;
  id: string;
  /** "toggle-overlay" | "select-overlay" */
  action: string;
}

export interface HotkeyEvent {
  accelerator: string;
  id: string;
  action: string;
}

export async function registerHotkeys(bindings: HotkeyBinding[]): Promise<void> {
  if (!isTauri()) return;
  const core = await import("@tauri-apps/api/core");
  await core.invoke("register_hotkeys", { bindings });
}

export async function registerOverlayHotkey(accelerator: string): Promise<void> {
  if (!isTauri()) return;
  const core = await import("@tauri-apps/api/core");
  await core.invoke("register_overlay_hotkey", { accelerator });
}

export async function onHotkey(cb: (e: HotkeyEvent) => void): Promise<() => void> {
  if (!isTauri()) return () => {};
  const event = await import("@tauri-apps/api/event");
  return await event.listen<HotkeyEvent>("hiro:hotkey", (e) => cb(e.payload));
}

/** @deprecated use onHotkey */
export async function onOverlayHotkey(cb: () => void): Promise<() => void> {
  return onHotkey((e) => {
    if (e.action === "toggle-overlay") cb();
  });
}

// ---------- Autostart ----------

export async function setAutostart(enabled: boolean): Promise<void> {
  if (!isTauri()) return;
  const auto = await import("@tauri-apps/plugin-autostart");
  if (enabled) await auto.enable();
  else await auto.disable();
}

export async function isAutostartEnabled(): Promise<boolean> {
  if (!isTauri()) return false;
  const auto = await import("@tauri-apps/plugin-autostart");
  return await auto.isEnabled();
}

// ---------- Opener (external URLs) ----------

export async function openExternal(url: string): Promise<void> {
  if (!isTauri()) {
    window.open(url, "_blank");
    return;
  }
  const opener = await import("@tauri-apps/plugin-opener");
  await opener.openUrl(url);
}

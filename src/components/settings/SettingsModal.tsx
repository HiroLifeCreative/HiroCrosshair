import { useEffect, useState } from "react";
import {
  Sliders,
  Keyboard,
  Gamepad2,
  Download,
  Plug,
  Info,
  Check,
  Loader2,
  ExternalLink,
  Search,
  RefreshCcw,
  Shield,
  Star,
  Zap,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Toggle } from "@/components/ui/Toggle";
import { LOCALES, type Locale } from "@/lib/i18n";
import { useSettings } from "@/store/settingsStore";
import {
  getAppVersion,
  scanInstalledGames,
  setAutostart,
  isAutostartEnabled,
  openExternal,
  getAvailableMonitors,
  setOverlayMonitor,
  type DetectedGame,
  type MonitorInfo,
} from "@/lib/tauri";
import { recordHotkey } from "@/lib/hotkeys";

type Tab = "general" | "hotkeys" | "games" | "updates" | "integrations" | "about" | "premium";

interface Props {
  open: boolean;
  onClose: () => void;
  version: string;
}

export function SettingsModal({ open, onClose, version }: Props) {
  const t = useSettings((s) => s.t);
  const [tab, setTab] = useState<Tab>("general");

  const tabs: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: "general", icon: <Sliders size={15} />, label: t("settings.tab.general") },
    { id: "hotkeys", icon: <Keyboard size={15} />, label: t("settings.tab.hotkeys") },
    { id: "games", icon: <Gamepad2 size={15} />, label: t("settings.tab.games") },
    { id: "updates", icon: <Download size={15} />, label: t("settings.tab.updates") },
    { id: "integrations", icon: <Plug size={15} />, label: t("settings.tab.integrations") },
    { id: "premium", icon: <Shield size={15} className="text-amber-400" />, label: t("settings.tab.premium") },
    { id: "about", icon: <Info size={15} />, label: t("settings.tab.about") },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("settings.title")}
      subtitle={t("settings.subtitle")}
      size="xl"
    >
      <aside className="w-56 shrink-0 border-r border-line/60 bg-bg/40 p-3 overflow-y-auto">
        <ul className="space-y-1">
          {tabs.map((tt) => (
            <li key={tt.id}>
              <button
                onClick={() => setTab(tt.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  tab === tt.id
                    ? "bg-gradient-to-r from-brand-violet/25 to-brand-purple/15 text-white border border-brand-violet/40"
                    : "text-white/70 hover:text-white hover:bg-white/[0.04] border border-transparent"
                }`}
              >
                <span
                  className={
                    tab === tt.id ? "text-brand-cyan" : "text-muted"
                  }
                >
                  {tt.icon}
                </span>
                {tt.label}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="flex-1 overflow-y-auto p-6">
        {tab === "general" && <GeneralTab />}
        {tab === "hotkeys" && <HotkeysTab />}
        {tab === "games" && <GamesTab />}
        {tab === "updates" && <UpdatesTab version={version} />}
        {tab === "integrations" && <IntegrationsTab />}
        {tab === "premium" && <PremiumTab />}
        {tab === "about" && <AboutTab version={version} />}
      </section>
    </Modal>
  );
}

// ---------- TABS ----------

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-white/95">{title}</h3>
        {description && <p className="text-xs text-muted mt-0.5">{description}</p>}
      </div>
      <div className="rounded-xl border border-line/70 bg-bg-soft/60 divide-y divide-line/50">
        {children}
      </div>
    </div>
  );
}

function Row({
  title,
  description,
  control,
}: {
  title: string;
  description?: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5">
      <div>
        <div className="text-sm text-white/90">{title}</div>
        {description && <div className="text-xs text-muted mt-0.5">{description}</div>}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

function GeneralTab() {
  const t = useSettings((s) => s.t);
  const locale = useSettings((s) => s.locale);
  const autostart = useSettings((s) => s.autostart);
  const startMinimized = useSettings((s) => s.startMinimized);
  const startOverlay = useSettings((s) => s.startOverlay);
  const overlayMonitor = useSettings((s) => s.overlayMonitor);
  const setSetting = useSettings((s) => s.set);
  const [monitors, setMonitors] = useState<MonitorInfo[]>([]);

  useEffect(() => {
    void getAvailableMonitors().then(setMonitors);
  }, []);

  const handleMonitorChange = async (name: string) => {
    setSetting("overlayMonitor", name);
    await setOverlayMonitor(name);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Section title={t("settings.general.monitor")} description={t("settings.general.monitor_desc")}>
         <div className="px-4 py-3 space-y-2">
            {monitors.map((m) => (
              <button
                key={m.name}
                onClick={() => handleMonitorChange(m.name)}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm transition-all ${
                  overlayMonitor === m.name || (overlayMonitor === null && m.is_primary)
                    ? "border-brand-violet/60 bg-brand-violet/10 text-white shadow-glow-sm"
                    : "border-line/70 text-white/70 hover:border-brand-violet/40 hover:bg-white/[0.02]"
                }`}
              >
                <div className="flex flex-col items-start">
                   <div className="font-semibold flex items-center gap-2">
                     {m.name.replace(/^\\\\\.\\\\/, "").replace("DISPLAY", "Monitor ")}
                     {m.is_primary && <span className="text-[10px] uppercase tracking-wider bg-brand-cyan/20 text-brand-cyan px-1.5 py-0.5 rounded-md">Primary</span>}
                   </div>
                   <div className="text-[10px] text-muted">{m.width}x{m.height} at {m.x},{m.y}</div>
                </div>
                {(overlayMonitor === m.name || (overlayMonitor === null && m.is_primary)) && <Check size={14} className="text-brand-cyan" />}
              </button>
            ))}
         </div>
      </Section>

      <Section title={t("settings.general.language")} description={t("settings.general.language_desc")}>
        <div className="px-4 py-3 grid grid-cols-3 gap-2">
          {LOCALES.map((l) => (
            <button
              key={l.id}
              onClick={() => setSetting("locale", l.id as Locale)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                locale === l.id
                  ? "border-brand-violet/60 bg-brand-violet/10 text-white"
                  : "border-line/70 text-white/75 hover:border-brand-violet/40"
              }`}
            >
              <span className="text-base">{l.flag}</span>
              <span>{l.label}</span>
              {locale === l.id && (
                <Check size={13} className="ml-auto text-brand-cyan" />
              )}
            </button>
          ))}
        </div>
      </Section>

      <Section title={t("settings.general.startup")}>
        <Row
          title={t("settings.general.autostart")}
          description={t("settings.general.autostart_desc")}
          control={
            <Toggle
              label=""
              checked={autostart}
              onChange={async (v) => {
                setSetting("autostart", v);
                try {
                  await setAutostart(v);
                } catch (e) {
                  console.warn(e);
                }
              }}
            />
          }
        />
        <Row
          title={t("settings.general.start_minimized")}
          description={t("settings.general.start_minimized_desc")}
          control={
            <Toggle
              label=""
              checked={startMinimized}
              onChange={(v) => setSetting("startMinimized", v)}
            />
          }
        />
        <Row
          title={t("settings.general.start_overlay")}
          description={t("settings.general.start_overlay_desc")}
          control={
            <Toggle
              label=""
              checked={startOverlay}
              onChange={(v) => setSetting("startOverlay", v)}
            />
          }
        />
      </Section>
    </div>
  );
}

function HotkeysTab() {
  const t = useSettings((s) => s.t);
  const accelerator = useSettings((s) => s.toggleOverlayHotkey);
  const setSetting = useSettings((s) => s.set);
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    if (!recording) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      const acc = recordHotkey(e);
      if (acc) {
        setSetting("toggleOverlayHotkey", acc);
        setRecording(false);
      }
    };
    const onMouse = (e: MouseEvent) => {
      // Middle (1) or Side buttons (3, 4)
      if (e.button === 1 || e.button === 3 || e.button === 4) {
        e.preventDefault();
        const acc = recordHotkey(e);
        if (acc) {
          setSetting("toggleOverlayHotkey", acc);
          setRecording(false);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onMouse);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onMouse);
    };
  }, [recording, setSetting]);

  return (
    <div className="space-y-6 max-w-2xl">
      <Section title={t("settings.tab.hotkeys")}>
        <Row
          title={t("settings.hotkeys.toggle_overlay")}
          description={t("settings.hotkeys.toggle_overlay_desc")}
          control={
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRecording(true)}
                className={`min-w-[140px] h-9 px-3 rounded-lg border text-sm font-mono transition-colors ${
                  recording
                    ? "border-brand-cyan/70 bg-brand-cyan/10 text-brand-cyan animate-pulse"
                    : "border-line/70 bg-bg-soft text-white/85 hover:border-brand-violet/50"
                }`}
              >
                {recording ? t("settings.hotkeys.record") : accelerator || "—"}
              </button>
              <button
                onClick={() => setSetting("toggleOverlayHotkey", "")}
                className="btn-ghost h-9 text-xs"
              >
                {t("settings.hotkeys.clear")}
              </button>
            </div>
          }
        />
      </Section>
    </div>
  );
}

function GamesTab() {
  const t = useSettings((s) => s.t);
  const [games, setGames] = useState<DetectedGame[]>([]);
  const [loading, setLoading] = useState(false);

  const scan = async () => {
    setLoading(true);
    try {
      const result = await scanInstalledGames();
      setGames(result);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white/95">{t("settings.tab.games")}</h3>
          <p className="text-xs text-muted mt-0.5">
            {games.length > 0
              ? t("settings.games.detected", { n: games.length })
              : t("settings.games.empty")}
          </p>
        </div>
        <button onClick={scan} className="btn-primary text-sm" disabled={loading}>
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              {t("settings.games.scanning")}
            </>
          ) : (
            <>
              <Search size={14} />
              {t("settings.games.scan")}
            </>
          )}
        </button>
      </div>

      {games.length > 0 && (
        <div className="rounded-xl border border-line/70 bg-bg-soft/60 divide-y divide-line/50 max-h-[420px] overflow-y-auto">
          {games.map((g, i) => (
            <div key={`${g.name}-${i}`} className="px-4 py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm text-white/95 truncate">{g.name}</div>
                <div className="text-xs text-muted truncate font-mono">{g.install_dir}</div>
              </div>
              <span
                className={`chip shrink-0 ${
                  g.platform === "Steam"
                    ? "!text-brand-cyan !border-brand-cyan/30"
                    : "!text-brand-lilac !border-brand-violet/30"
                }`}
              >
                {g.platform}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UpdatesTab({ version }: { version: string }) {
  const t = useSettings((s) => s.t);
  const channel = useSettings((s) => s.updateChannel);
  const setSetting = useSettings((s) => s.set);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [available, setAvailable] = useState<null | {
    version: string;
    date?: string;
    body?: string;
  }>(null);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState<null | { downloaded: number; total?: number }>(null);

  const check = async () => {
    setChecking(true);
    setResult(null);
    setAvailable(null);
    setProgress(null);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const update = await invoke<{
        version: string;
        date?: string | null;
        body?: string | null;
      } | null>("updater_check", { channel });

      if (!update) {
        setResult(t("settings.updates.up_to_date"));
        return;
      }
      setAvailable({ version: update.version, date: update.date ?? undefined, body: update.body ?? undefined });
      setResult(null);
    } catch (e) {
      setResult(String((e as any)?.message ?? e ?? "Update check failed"));
    } finally {
      setChecking(false);
    }
  };

  const downloadAndInstall = async () => {
    setInstalling(true);
    setProgress(null);
    setResult(null);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("updater_download_and_install", { channel });
    } catch (e) {
      setResult(String((e as any)?.message ?? e ?? "Install failed"));
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Section title={t("settings.tab.updates")}>
        <Row
          title={t("settings.updates.current")}
          control={<span className="font-mono text-sm text-white/90">v{version}</span>}
        />
        <Row
          title={t("settings.updates.channel")}
          control={
            <div className="flex items-center gap-1 rounded-lg border border-line/70 p-0.5">
              {(["stable", "beta"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setSetting("updateChannel", c)}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    channel === c
                      ? "bg-brand-violet text-white"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  {t(`settings.updates.channel.${c}`)}
                </button>
              ))}
            </div>
          }
        />

        {available && (
          <div className="rounded-xl border border-line/70 bg-bg-soft/60 px-4 py-3 text-xs text-white/80">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-white/90 font-medium">
                  Update available: <span className="font-mono">v{available.version}</span>
                </div>
                {available.date && (
                  <div className="text-[11px] text-muted mt-0.5">Published: {available.date}</div>
                )}
              </div>
              <button
                onClick={() => void downloadAndInstall()}
                className="btn-primary text-sm shrink-0"
                disabled={installing || checking}
              >
                {installing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Installing…
                  </>
                ) : (
                  <>
                    <Download size={14} />
                    Download & Install
                  </>
                )}
              </button>
            </div>
            {available.body && (
              <div className="mt-2 text-[11px] text-white/70 whitespace-pre-wrap max-h-28 overflow-y-auto">
                {available.body}
              </div>
            )}
            {progress && (
              <div className="mt-3 text-[11px] text-muted">
                Downloaded {Math.round(progress.downloaded / 1024)} KB
                {progress.total ? ` / ${Math.round(progress.total / 1024)} KB` : ""}
              </div>
            )}
          </div>
        )}

        <Row
          title={t("settings.updates.check")}
          description={result ?? undefined}
          control={
            <button onClick={check} className="btn-primary text-sm" disabled={checking}>
              {checking ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {t("settings.updates.checking")}
                </>
              ) : (
                <>
                  <RefreshCcw size={14} />
                  {t("settings.updates.check")}
                </>
              )}
            </button>
          }
        />
      </Section>
    </div>
  );
}

function IntegrationsTab() {
  const t = useSettings((s) => s.t);
  return (
    <div className="space-y-6 max-w-2xl">
      <Section title={t("settings.tab.integrations")}>
        <div className="px-4 py-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 grid place-items-center rounded-xl bg-gradient-to-br from-brand-violet/20 to-brand-cyan/10 border border-line/60 shrink-0">
              <Plug size={20} className="text-brand-cyan" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-white">
                {t("settings.integrations.streamdeck")}
              </div>
              <p className="text-xs text-muted mt-1">
                {t("settings.integrations.streamdeck_desc")}
              </p>
              <p className="text-[11px] text-muted/80 mt-2">
                {t("settings.integrations.install_desc")}
              </p>
              <button
                onClick={() =>
                  void openExternal(
                    "https://marketplace.elgato.com/products/stream-deck",
                  )
                }
                className="btn-primary text-sm mt-3"
              >
                <ExternalLink size={14} />
                {t("settings.integrations.install")}
              </button>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

function PremiumTab() {
  const t = useSettings((s) => s.t);
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-bg-soft to-brand-violet/5 p-8 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4">
          <Star className="text-amber-400 animate-pulse" size={24} />
        </div>
        <h2 className="text-xl font-bold text-white glow-text mb-2">{t("premium.title")}</h2>
        <p className="text-sm text-muted mb-6">{t("premium.subtitle")}</p>
        
        <div className="grid grid-cols-2 gap-4 text-left">
          <PremiumFeature icon={<Zap size={14} />} title="Auto-detect game" desc="Switches overlay automatically" />
          <PremiumFeature icon={<Shield size={14} />} title="Cloud Sync" desc="Backup your presets" />
        </div>

        <button className="btn-primary mt-8 !bg-amber-500 !text-black !font-bold hover:!bg-amber-400 w-full max-w-xs mx-auto">
          {t("premium.subscribe")}
        </button>
      </div>
    </div>
  );
}

function PremiumFeature({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="p-3 rounded-xl border border-white/5 bg-white/[0.02] flex items-start gap-3">
      <div className="h-7 w-7 rounded-lg bg-amber-500/10 border border-amber-500/20 grid place-items-center text-amber-400 shrink-0">
        {icon}
      </div>
      <div>
        <div className="text-xs font-semibold text-white/90">{title}</div>
        <div className="text-[10px] text-muted leading-tight mt-0.5">{desc}</div>
      </div>
    </div>
  );
}

function AboutTab({ version }: { version: string }) {
  const t = useSettings((s) => s.t);
  return (
    <div className="space-y-5 max-w-2xl">
      <div className="rounded-2xl border border-line/70 bg-gradient-to-br from-brand-violet/10 via-bg-soft to-brand-cyan/5 p-8 text-center relative">
        <div className="absolute top-2 right-4 text-[10px] font-mono text-muted/30 select-none">
          Handcrafted with precision
        </div>
        <div className="font-display tracking-[0.22em] text-base text-white glow-text">
          HIRO<span className="text-brand-cyan">CROSSHAIR</span>
        </div>
        <div className="text-xs text-muted mt-2">{t("settings.about.tagline")}</div>
        <div className="mt-4 inline-flex items-center gap-2 chip">
          <span className="font-mono text-xs">v{version}</span>
        </div>
      </div>

      <div className="rounded-xl border border-line/70 bg-bg-soft/60 divide-y divide-line/50">
        <div className="px-4 py-3.5 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm text-white/90">{t("settings.about.company")}</div>
            <div className="text-xs text-muted mt-0.5">{t("settings.about.developer")}</div>
          </div>
          <div className="h-9 w-9 grid place-items-center rounded-lg bg-gradient-to-br from-brand-violet to-brand-purple shadow-glow text-white font-display tracking-wider text-xs">
            H
          </div>
        </div>
        <button
          onClick={() => void openExternal("https://hirolifestudio.com")}
          className="w-full px-4 py-3.5 flex items-center justify-between gap-4 hover:bg-white/[0.03] transition-colors text-left"
        >
          <div>
            <div className="text-sm text-white/90">Website</div>
            <div className="text-xs text-brand-cyan font-mono mt-0.5">{t("settings.about.website")}</div>
          </div>
          <ExternalLink size={14} className="text-muted" />
        </button>
        <button
          onClick={() => void openExternal("https://instagram.com/SoyNelsonHerrera")}
          className="w-full px-4 py-3.5 flex items-center justify-between gap-4 hover:bg-white/[0.03] transition-colors text-left"
        >
          <div>
            <div className="text-sm text-white/90">Instagram (Developer)</div>
            <div className="text-xs text-muted font-mono mt-0.5">{t("settings.about.social_dev")}</div>
          </div>
          <ExternalLink size={14} className="text-muted" />
        </button>
      </div>

      <div className="text-[11px] text-muted/70 text-center">
        {t("settings.about.copyright", { y: new Date().getFullYear() })}
      </div>
    </div>
  );
}

// auto-load autostart on mount: ensure settings reflect actual OS state
export function useSyncAutostart() {
  const setSetting = useSettings((s) => s.set);
  useEffect(() => {
    void isAutostartEnabled()
      .then((v) => setSetting("autostart", v))
      .catch(() => {});
  }, [setSetting]);
}

// Re-export getAppVersion so caller in EditorWindow can use it.
export { getAppVersion };

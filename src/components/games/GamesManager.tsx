import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Loader2,
  Gamepad2,
  Trash2,
  Power,
  Crosshair as CrosshairIcon,
  Edit2,
  Check,
  RefreshCw,
  Info,
  X,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Toggle } from "@/components/ui/Toggle";
import { Slider } from "@/components/ui/Slider";
import { useGamesStore } from "@/store/gamesStore";
import { useSettings } from "@/store/settingsStore";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { CrosshairSVG } from "@/features/crosshair/renderer";
import { scanInstalledGames, type DetectedGame } from "@/lib/tauri";
import { getGameCover } from "@/lib/gameArt";
import { recordHotkey } from "@/lib/hotkeys";
import type { Game, GameOverlay } from "@/types/crosshair";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function GamesManager({ open, onClose }: Props) {
  const t = useSettings((s) => s.t);
  const games = useGamesStore((s) => s.games);
  const activeGameId = useGamesStore((s) => s.activeGameId);
  const setActiveGame = useGamesStore((s) => s.setActiveGame);
  const removeGame = useGamesStore((s) => s.removeGame);
  const addGame = useGamesStore((s) => s.addGame);

  const confirm = useConfirm();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => games.find((g) => g.id === selectedId) ?? null,
    [games, selectedId],
  );

  // Auto-pick first game when modal opens
  useEffect(() => {
    if (open && !selectedId && games.length > 0) {
      setSelectedId(activeGameId ?? games[0].id);
    }
  }, [open, games, selectedId, activeGameId]);

  // Keep the modal selection in sync with the active game (e.g. Stream Deck / tray actions)
  useEffect(() => {
    if (!open) return;
    if (!activeGameId) return;
    if (selectedId === activeGameId) return;
    setSelectedId(activeGameId);
  }, [open, activeGameId, selectedId]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("games.title")}
      subtitle={t("games.subtitle")}
      size="xl"
    >
      <aside className="w-72 shrink-0 border-r border-line/60 bg-bg/40 flex flex-col">
        <div className="p-3 border-b border-line/40">
          <NewGameInline />
        </div>
        <div className="p-3 border-b border-line/40">
          <ScanButton />
        </div>
        <ul className="flex-1 overflow-y-auto p-2 space-y-1">
          {games.length === 0 && (
            <li className="text-xs text-muted text-center py-6 px-3">
              {t("games.empty_list")}
            </li>
          )}
          {games.map((g) => {
            const isSelected = selectedId === g.id;
            const isActive = activeGameId === g.id;
            return (
              <li key={g.id}>
                <button
                  onClick={() => setSelectedId(g.id)}
                  className={`group w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors border ${
                    isSelected
                      ? "bg-gradient-to-r from-brand-violet/25 to-brand-purple/15 border-brand-violet/40 text-white"
                      : "border-transparent text-white/75 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <GameAvatar game={g} size={28} />
                  <span className="flex-1 truncate text-left">{g.name}</span>
                  {isActive && (
                    <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] shrink-0" />
                  )}
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      const ok = await confirm({
                        title: t("games.confirm_delete", { name: g.name }),
                        message: t("games.confirm_delete_desc"),
                        destructive: true,
                        confirmLabel: t("btn.delete"),
                      });
                      if (ok) {
                        if (selectedId === g.id) setSelectedId(null);
                        if (activeGameId === g.id) setActiveGame(null);
                        removeGame(g.id);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 h-6 w-6 grid place-items-center rounded text-muted hover:text-red-400 hover:bg-red-500/10 transition"
                    title={t("btn.delete")}
                  >
                    <Trash2 size={12} />
                  </button>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <section className="flex-1 overflow-y-auto">
        {selected ? (
          <GameDetail game={selected} />
        ) : (
          <EmptyState onAdd={() => addGame({ name: t("games.new_default_name"), platform: "Manual", icon: "🎯" })} />
        )}
      </section>
    </Modal>
  );
}

// ----- Sidebar bits -----

function NewGameInline() {
  const t = useSettings((s) => s.t);
  const addGame = useGamesStore((s) => s.addGame);
  const [name, setName] = useState("");

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    addGame({ name: trimmed, platform: "Manual", icon: "🎯" });
    setName("");
  };

  return (
    <div className="flex items-center gap-1.5">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        placeholder={t("games.add_placeholder")}
        className="flex-1 h-8 px-2.5 bg-bg-soft border border-line/70 rounded-md text-xs text-white placeholder:text-muted focus:outline-none focus:border-brand-violet/60"
      />
      <button
        onClick={submit}
        disabled={!name.trim()}
        className="btn-primary !px-2.5 !h-8 disabled:opacity-50"
        title={t("games.add")}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

function ScanButton() {
  const t = useSettings((s) => s.t);
  const games = useGamesStore((s) => s.games);
  const addGame = useGamesStore((s) => s.addGame);
  const [scanning, setScanning] = useState(false);
  const [found, setFound] = useState<DetectedGame[] | null>(null);

  const scan = async () => {
    setScanning(true);
    try {
      const result = await scanInstalledGames();
      setFound(result);
    } finally {
      setScanning(false);
    }
  };

  const importGame = (g: DetectedGame) => {
    if (games.some((x) => x.name === g.name)) return;
    addGame({
      name: g.name,
      platform: g.platform,
      installDir: g.install_dir,
      icon: g.platform === "Steam" ? "🟦" : "🟪",
    });
  };

  return (
    <div className="space-y-2">
      <button
        onClick={scan}
        disabled={scanning}
        className="btn-ghost w-full !justify-center text-xs"
      >
        {scanning ? (
          <>
            <Loader2 size={13} className="animate-spin" />
            {t("settings.games.scanning")}
          </>
        ) : (
          <>
            <Search size={13} />
            {t("settings.games.scan")}
          </>
        )}
      </button>
      {found && found.length > 0 && (
        <div className="rounded-md border border-line/60 bg-bg-soft/80 max-h-40 overflow-y-auto">
          {found.map((g, i) => {
            const already = games.some((x) => x.name === g.name);
            return (
              <button
                key={`${g.name}-${i}`}
                disabled={already}
                onClick={() => importGame(g)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-left hover:bg-white/[0.05] transition disabled:opacity-40"
              >
                <span className="text-xs">{g.platform === "Steam" ? "🟦" : "🟪"}</span>
                <span className="flex-1 truncate text-white/85">{g.name}</span>
                {already ? (
                  <Check size={12} className="text-emerald-400 shrink-0" />
                ) : (
                  <Plus size={12} className="text-muted shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ----- Detail panel -----

function EmptyState({ onAdd }: { onAdd: () => void }) {
  const t = useSettings((s) => s.t);
  return (
    <div className="h-full grid place-items-center p-8">
      <div className="text-center max-w-sm">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-violet/30 to-brand-cyan/10 border border-line/60 mb-4">
          <Gamepad2 size={26} className="text-brand-cyan" />
        </div>
        <h3 className="text-base font-semibold text-white">{t("games.empty_title")}</h3>
        <p className="text-xs text-muted mt-2">{t("games.empty_desc")}</p>
        <button onClick={onAdd} className="btn-primary mt-4 text-sm">
          <Plus size={14} />
          {t("games.add_first")}
        </button>
      </div>
    </div>
  );
}

function GameDetail({ game }: { game: Game }) {
  const t = useSettings((s) => s.t);
  const activeGameId = useGamesStore((s) => s.activeGameId);
  const setActiveGame = useGamesStore((s) => s.setActiveGame);
  const renameGame = useGamesStore((s) => s.renameGame);
  const addOverlay = useGamesStore((s) => s.addOverlay);
  const isActive = activeGameId === game.id;

  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(game.name);

  useEffect(() => {
    setDraftName(game.name);
  }, [game.id, game.name]);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <GameAvatar game={game} size={48} className="!rounded-xl" />
          {/* refresh cover */}
          <RefreshCoverBtn game={game} />
          <div className="min-w-0 flex-1">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      renameGame(game.id, draftName.trim() || game.name);
                      setEditingName(false);
                    }
                    if (e.key === "Escape") {
                      setDraftName(game.name);
                      setEditingName(false);
                    }
                  }}
                  className="bg-bg-soft border border-line/70 rounded-md px-2.5 py-1 text-base font-semibold text-white focus:outline-none focus:border-brand-violet/60"
                />
                <button
                  onClick={() => {
                    renameGame(game.id, draftName.trim() || game.name);
                    setEditingName(false);
                  }}
                  className="btn-icon h-7 w-7"
                >
                  <Check size={13} />
                </button>
                <button
                  onClick={() => {
                    setDraftName(game.name);
                    setEditingName(false);
                  }}
                  className="btn-icon h-7 w-7"
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-white truncate">{game.name}</h2>
                <button
                  onClick={() => setEditingName(true)}
                  className="text-muted hover:text-white transition"
                  title={t("games.rename")}
                >
                  <Edit2 size={13} />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 mt-1">
              <span className="chip">{game.platform}</span>
              {game.installDir && (
                <span className="text-[10px] text-muted/80 font-mono truncate" title={game.installDir}>
                  {game.installDir}
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => setActiveGame(isActive ? null : game.id)}
          className={`btn ${
            isActive
              ? "bg-emerald-500/15 border border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/25"
              : "btn-primary"
          }`}
          title={t("games.activate_desc")}
        >
          <Power size={14} />
          {isActive ? t("games.active") : t("games.activate")}
        </button>
      </div>

      {/* Help banner */}
      <div className="rounded-xl border border-brand-violet/30 bg-brand-violet/5 px-4 py-3 text-xs text-white/75">
        <div className="font-medium text-white/95 mb-1">{t("games.how_works")}</div>
        <p>{t("games.how_works_desc")}</p>
      </div>

      {/* Overlays */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white/95">
            {t("games.overlays")} <span className="text-muted">({game.overlays.length})</span>
          </h3>
          <button
            onClick={() => addOverlay(game.id)}
            className="btn-ghost text-xs"
          >
            <Plus size={13} />
            {t("games.add_overlay")}
          </button>
        </div>

        <ul className="space-y-2">
          {game.overlays.map((o) => (
            <OverlayRow key={o.id} game={game} overlay={o} />
          ))}
        </ul>
      </div>
    </div>
  );
}

function OverlayRow({ game, overlay }: { game: Game; overlay: GameOverlay }) {
  const t = useSettings((s) => s.t);
  const confirm = useConfirm();
  const updateOverlay = useGamesStore((s) => s.updateOverlay);
  const removeOverlay = useGamesStore((s) => s.removeOverlay);
  const setActiveOverlay = useGamesStore((s) => s.setActiveOverlay);
  const isActive = game.activeOverlayId === overlay.id;

  const setActiveGame = useGamesStore((s) => s.setActiveGame);
  const activeGameId = useGamesStore((s) => s.activeGameId);

  const [recording, setRecording] = useState(false);
  const [name, setName] = useState(overlay.name);

  useEffect(() => setName(overlay.name), [overlay.name]);

  // Hotkey recording
  useEffect(() => {
    if (!recording) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      const acc = recordHotkey(e);
      if (acc) {
        updateOverlay(game.id, overlay.id, { hotkey: acc });
        setRecording(false);
      }
    };
    const onMouse = (e: MouseEvent) => {
      if (e.button === 1 || e.button === 3 || e.button === 4) {
        e.preventDefault();
        const acc = recordHotkey(e);
        if (acc) {
          updateOverlay(game.id, overlay.id, { hotkey: acc });
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
  }, [recording, game.id, overlay.id, updateOverlay]);

  const editInMain = () => {
    // Activate the game (so its hotkeys are registered) and select this overlay.
    // EditorWindow's load effect will atomically load `overlay.config` into the editor
    // without flashing the default crosshair.
    if (activeGameId !== game.id) setActiveGame(game.id);
    setActiveOverlay(game.id, overlay.id);
  };

  return (
    <li
      className={`rounded-xl border transition-colors ${
        isActive
          ? "border-brand-violet/60 bg-gradient-to-br from-brand-violet/10 to-brand-purple/10"
          : "border-line/70 bg-bg-soft/60"
      }`}
    >
      <div className="flex items-center gap-3 p-3">
        {/* Preview */}
        <div className="h-14 w-14 grid place-items-center rounded-lg bg-[#0a0c1a] border border-line/60 shrink-0">
          <CrosshairSVG config={overlay.config} size={42} />
        </div>

        {/* Name + hotkey */}
        <div className="flex-1 min-w-0 space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              if (name.trim() && name !== overlay.name) {
                updateOverlay(game.id, overlay.id, { name: name.trim() });
              } else {
                setName(overlay.name);
              }
            }}
            className="w-full bg-transparent border-0 px-0 py-0 text-sm font-medium text-white focus:outline-none"
          />
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-muted">
              {t("games.hotkey")}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setRecording(true)}
                className={`min-w-[80px] h-7 px-2 rounded-md border text-[10px] font-mono transition-colors ${
                  recording
                    ? "border-brand-cyan/70 bg-brand-cyan/10 text-brand-cyan animate-pulse"
                    : "border-line/70 bg-bg/80 text-white/70 hover:border-brand-violet/50 hover:text-white"
                }`}
              >
                {recording ? t("settings.hotkeys.record") : overlay.hotkey || "—"}
              </button>
              {overlay.hotkey && (
                <button
                  onClick={() => updateOverlay(game.id, overlay.id, { hotkey: "" })}
                  className="h-7 w-7 grid place-items-center rounded-md border border-line/70 text-muted hover:text-red-400 hover:border-red-400/50 hover:bg-red-400/10 transition-colors"
                  title="Clear Hotkey"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
          
          {/* Window management settings */}
          <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-line/30">
            <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors group/tip">
              <Toggle
                label={t("games.ignore_clicks")}
                checked={overlay.ignoreClicks ?? false}
                onChange={(v) => updateOverlay(game.id, overlay.id, { ignoreClicks: v })}
                size="sm"
              />
              <div title={t("games.ignore_clicks_desc")} className="cursor-help">
                <Info size={12} className="text-muted/40 group-hover/tip:text-brand-violet transition-colors" />
              </div>
            </div>

            <div className="flex flex-col gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
              <div className="flex items-center justify-between">
                <Toggle
                  label={t("games.dim_background")}
                  checked={overlay.dimBackground ?? false}
                  onChange={(v) => updateOverlay(game.id, overlay.id, { dimBackground: v })}
                  size="sm"
                />
              </div>
              {overlay.dimBackground && (
                <div className="px-1 pb-1">
                  <Slider
                    label=""
                    value={Math.round((overlay.dimAmount ?? 0.3) * 100)}
                    min={0}
                    max={100}
                    onChange={(v) => updateOverlay(game.id, overlay.id, { dimAmount: v / 100 })}
                    unit="%"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isActive && (
            <span className="chip !text-emerald-300 !border-emerald-400/40">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              {t("games.active_overlay")}
            </span>
          )}
          <button
            onClick={editInMain}
            className="btn-ghost text-xs"
            title={t("games.edit_overlay")}
          >
            <CrosshairIcon size={13} />
            {t("games.edit")}
          </button>
          <button
            onClick={async () => {
              const ok = await confirm({
                title: t("games.confirm_delete_overlay", { name: overlay.name }),
                destructive: true,
                confirmLabel: t("btn.delete"),
              });
              if (ok) removeOverlay(game.id, overlay.id);
            }}
            className="btn-icon h-8 w-8 hover:!border-red-500/60 hover:text-red-400"
            title={t("btn.delete")}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </li>
  );
}

// ----- Avatars -----

function GameAvatar({
  game,
  size = 28,
  className = "",
}: {
  game: Game;
  size?: number;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);
  const showImg = game.coverUrl && !errored;
  return (
    <div
      className={`grid place-items-center rounded-md bg-bg-soft border border-line/70 shrink-0 overflow-hidden relative ${className}`}
      style={{ height: size, width: size }}
    >
      {showImg ? (
        <img
          src={game.coverUrl ?? undefined}
          alt={game.name}
          loading="lazy"
          onError={() => setErrored(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <span style={{ fontSize: Math.round(size * 0.5) }}>
          {game.icon ?? "🎮"}
        </span>
      )}
    </div>
  );
}

function RefreshCoverBtn({ game }: { game: Game }) {
  const t = useSettings((s) => s.t);
  const setGameCover = useGamesStore((s) => s.setGameCover);
  const [loading, setLoading] = useState(false);
  const refresh = async () => {
    setLoading(true);
    try {
      const url = await getGameCover(game.name);
      setGameCover(game.id, url);
    } finally {
      setLoading(false);
    }
  };
  return (
    <button
      onClick={refresh}
      disabled={loading}
      title={t("games.refresh_cover")}
      className="btn-icon h-7 w-7 -ml-1 mt-0.5"
    >
      {loading ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
    </button>
  );
}

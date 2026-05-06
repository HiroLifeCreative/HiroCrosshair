import { Crosshair, Minus, Square, X, Settings2, Gamepad2 } from "lucide-react";
import { minimizeWindow, toggleMaximizeWindow } from "@/lib/tauri";
import { useSettings } from "@/store/settingsStore";
import { useGamesStore } from "@/store/gamesStore";
import { useState } from "react";
import { ExitConfirmationModal } from "./ExitConfirmationModal";

interface Props {
  onOpenSettings: () => void;
  onOpenGames: () => void;
  version: string;
}

export function Titlebar({ onOpenSettings, onOpenGames, version }: Props) {
  const t = useSettings((s) => s.t);
  const activeGameId = useGamesStore((s) => s.activeGameId);
  const activeGame = useGamesStore((s) =>
    s.games.find((g) => g.id === s.activeGameId),
  );
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  return (
    <div
      data-tauri-drag-region
      className="relative h-11 flex items-center justify-between px-3 select-none border-b border-line/60 bg-gradient-to-r from-bg-soft/90 via-bg/80 to-bg-soft/90 backdrop-blur-md"
    >
      {/* Left: brand */}
      <div data-tauri-drag-region className="flex items-center gap-2.5 pl-1.5">
        <div className="relative h-7 w-7 grid place-items-center rounded-lg bg-gradient-to-br from-brand-violet to-brand-purple shadow-glow">
          <Crosshair size={15} className="text-white" />
        </div>
        <div className="leading-none">
          <div className="font-display tracking-[0.18em] text-[12px] text-white glow-text">
            HIRO<span className="text-brand-cyan">CROSSHAIR</span>
          </div>
          <div className="text-[9px] uppercase tracking-[0.22em] text-muted mt-0.5">
            {t("app.tagline")}
          </div>
        </div>
      </div>

      {/* Center: drag handle visual */}
      <div data-tauri-drag-region className="flex-1 h-full" />

      {/* Right: actions + window controls */}
      <div className="flex items-center gap-1">
        <span className="chip mr-1 hidden sm:inline-flex">
          {t("app.version_label", { v: version })}
        </span>
        <button
          onClick={onOpenGames}
          className={`h-8 px-2.5 rounded-md inline-flex items-center gap-1.5 text-xs transition-colors ${
            activeGameId
              ? "text-emerald-200 bg-emerald-500/10 border border-emerald-400/30 hover:bg-emerald-500/20"
              : "text-white/75 hover:text-white hover:bg-white/[0.06]"
          }`}
          title={t("btn.games")}
        >
          <Gamepad2 size={14} />
          {activeGame ? (
            <>
              <span className="text-[10px]">{activeGame.icon ?? "🎮"}</span>
              <span className="max-w-[120px] truncate">{activeGame.name}</span>
            </>
          ) : (
            <span>{t("btn.games")}</span>
          )}
        </button>
        <button
          onClick={onOpenSettings}
          className="h-8 px-2.5 rounded-md inline-flex items-center gap-1.5 text-xs text-white/75 hover:text-white hover:bg-white/[0.06] transition-colors"
          title={t("btn.settings")}
        >
          <Settings2 size={14} />
          {t("btn.settings")}
        </button>
        <div className="ml-2 flex items-center">
          <TitlebarBtn onClick={() => void minimizeWindow()} tooltip="Minimize">
            <Minus size={14} />
          </TitlebarBtn>
          <TitlebarBtn onClick={() => void toggleMaximizeWindow()} tooltip="Maximize">
            <Square size={11} />
          </TitlebarBtn>
          <TitlebarBtn
            onClick={() => setIsExitModalOpen(true)}
            tooltip="Close"
            danger
          >
            <X size={14} />
          </TitlebarBtn>
        </div>
      </div>
      <ExitConfirmationModal 
        isOpen={isExitModalOpen} 
        onClose={() => setIsExitModalOpen(false)} 
      />
    </div>
  );
}

function TitlebarBtn({
  onClick,
  children,
  danger,
  tooltip,
}: {
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
  tooltip: string;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      className={`h-8 w-10 grid place-items-center text-white/70 transition-colors ${
        danger
          ? "hover:bg-red-500/80 hover:text-white"
          : "hover:bg-white/[0.08] hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

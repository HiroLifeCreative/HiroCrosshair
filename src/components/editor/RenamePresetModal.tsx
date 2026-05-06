import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { useCrosshairStore } from "@/store/crosshairStore";
import { useSettings } from "@/store/settingsStore";

interface Props {
  open: boolean;
  onClose: () => void;
  presetId: string | null;
  currentName: string;
}

export function RenamePresetModal({ open, onClose, presetId, currentName }: Props) {
  const t = useSettings((s) => s.t);
  const [name, setName] = useState(currentName);
  const renamePreset = useCrosshairStore((s) => s.renamePreset);

  useEffect(() => {
    setName(currentName);
  }, [currentName, open]);

  const handleSave = () => {
    if (presetId && name.trim()) {
      renamePreset(presetId, name.trim());
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("presets.rename_title")}
      subtitle={t("presets.rename_subtitle")}
      size="sm"
    >
      <div className="p-6 space-y-4 w-full">
        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-wider text-muted font-medium ml-1">
            {t("presets.rename_label")}
          </label>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder={t("presets.rename_placeholder")}
            className="w-full bg-bg-soft/50 border border-line/70 rounded-xl px-4 py-3 text-sm text-white focus:border-brand-violet/60 focus:ring-1 focus:ring-brand-violet/20 transition-all outline-none"
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-line/70 text-sm text-white/70 hover:bg-white/[0.03] transition-colors"
          >
            {t("btn.cancel")}
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-violet to-brand-purple text-sm text-white font-semibold shadow-glow-sm hover:shadow-glow transition-all disabled:opacity-50 disabled:shadow-none"
          >
            {t("btn.save")}
          </button>
        </div>
      </div>
    </Modal>
  );
}

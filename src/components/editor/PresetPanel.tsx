import { useRef, useState } from "react";
import { Copy, Download, Plus, Trash2, Upload, Check } from "lucide-react";
import { useCrosshairStore } from "@/store/crosshairStore";
import { useSettings } from "@/store/settingsStore";
import { CrosshairSVG } from "@/features/crosshair/renderer";
import { RenamePresetModal } from "./RenamePresetModal";

export function PresetPanel() {
  const [renameData, setRenameData] = useState<{ id: string; name: string } | null>(null);
  const t = useSettings((s) => s.t);
  const presets = useCrosshairStore((s) => s.presets);
  const activeId = useCrosshairStore((s) => s.activePresetId);
  const savePreset = useCrosshairStore((s) => s.savePreset);
  const applyPreset = useCrosshairStore((s) => s.applyPreset);
  const duplicatePreset = useCrosshairStore((s) => s.duplicatePreset);
  const deletePreset = useCrosshairStore((s) => s.deletePreset);
  const exportPresets = useCrosshairStore((s) => s.exportPresets);
  const importPresets = useCrosshairStore((s) => s.importPresets);

  const fileRef = useRef<HTMLInputElement | null>(null);

  const onExport = () => {
    const json = exportPresets();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hirocrosshair-presets-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => importPresets(String(reader.result ?? ""));
    reader.readAsText(file);
  };

  return (
    <section className="panel">
      <header className="panel-header">
        <div className="flex items-center gap-2">
          <span className="font-display tracking-wider text-sm text-white/90">{t("presets.title").toUpperCase()}</span>
          <span className="chip">{presets.length}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button className="btn-icon" title={t("presets.import")} onClick={() => fileRef.current?.click()}>
            <Upload size={15} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImportFile(f);
              e.target.value = "";
            }}
          />
          <button className="btn-icon" title={t("presets.export")} onClick={onExport}>
            <Download size={15} />
          </button>
          <button
            className="btn-primary text-xs"
            onClick={() => savePreset()}
            title={t("presets.save")}
          >
            <Plus size={14} /> {t("presets.save")}
          </button>
        </div>
      </header>

      <div className="p-3 max-h-[420px] overflow-y-auto">
        {presets.length === 0 ? (
          <div className="text-center py-10 text-muted text-sm">
            {t("presets.empty")}
            <br />
            {t("presets.empty_hint")}
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-2">
            {presets.map((p) => {
              const active = p.id === activeId;
              return (
                <li
                  key={p.id}
                  className={`group relative rounded-xl border p-3 transition-colors cursor-pointer ${
                    active
                      ? "border-brand-violet/60 bg-gradient-to-br from-brand-violet/10 to-brand-purple/10"
                      : "border-line/70 bg-bg-soft/60 hover:border-brand-violet/40"
                  }`}
                  onClick={() => applyPreset(p.id)}
                >
                  <div className="flex items-center justify-between">
                    <div 
                      className="text-xs font-medium text-white/85 truncate pr-2 hover:text-brand-violet cursor-text"
                      title="Click para renombrar"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenameData({ id: p.id, name: p.name });
                      }}
                    >
                      {p.name}
                    </div>
                    {active && (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-violet text-white">
                        <Check size={12} />
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-center my-3 h-16">
                    <CrosshairSVG config={p.config} size={56} />
                  </div>
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      className="btn-icon h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicatePreset(p.id);
                      }}
                      title="Duplicar"
                    >
                      <Copy size={12} />
                    </button>
                    <button
                      className="btn-icon h-7 w-7 hover:!border-red-500/60"
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePreset(p.id);
                      }}
                      title="Eliminar"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <RenamePresetModal
        open={!!renameData}
        onClose={() => setRenameData(null)}
        presetId={renameData?.id ?? null}
        currentName={renameData?.name ?? ""}
      />
    </section>
  );
}

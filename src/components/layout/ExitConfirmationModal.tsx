import React from "react";
import { LogOut, ArrowDownToLine } from "lucide-react";
import { hideWindow, exitApp } from "@/lib/tauri";
import { Modal } from "@/components/ui/Modal";

interface ExitConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExitConfirmationModal: React.FC<ExitConfirmationModalProps> = ({ isOpen, onClose }) => {
  const handleMinimize = async () => {
    await hideWindow();
    onClose();
  };

  const handleExit = async () => {
    await exitApp();
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Salir de la aplicación"
      subtitle="Elige cómo deseas cerrar la ventana principal"
      size="md"
    >
      <div className="flex flex-col w-full p-6 space-y-4">
        <div className="flex flex-col gap-3">
          <button
            onClick={handleMinimize}
            className="group flex items-center gap-4 w-full p-4 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-brand-violet/40 rounded-xl transition-all"
          >
            <div className="p-3 rounded-lg bg-brand-violet/20 text-brand-cyan group-hover:scale-110 transition-transform">
              <ArrowDownToLine size={24} />
            </div>
            <div className="text-left">
              <div className="font-bold text-white tracking-wide">Minimizar a la Bandeja</div>
              <div className="text-xs text-muted">La mira seguirá activa y lista para usar</div>
            </div>
          </button>

          <button
            onClick={handleExit}
            className="group flex items-center gap-4 w-full p-4 bg-red-500/5 hover:bg-red-500/15 border border-red-500/10 hover:border-red-500/40 rounded-xl transition-all"
          >
            <div className="p-3 rounded-lg bg-red-500/20 text-red-400 group-hover:scale-110 transition-transform">
              <LogOut size={24} />
            </div>
            <div className="text-left">
              <div className="font-bold text-red-400 tracking-wide">Cerrar Completamente</div>
              <div className="text-xs text-red-400/50">Se detendrán todos los procesos y hotkeys</div>
            </div>
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2 text-xs text-muted hover:text-white transition-colors uppercase tracking-[0.2em] font-bold"
        >
          Cancelar
        </button>
      </div>
    </Modal>
  );
};

import { X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

const sizes = {
  xs: "max-w-xs",
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
};

export function Modal({ open, onClose, title, subtitle, children, size = "lg" }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={(val) => !val && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm animate-in fade-in duration-300" />
        <div className="fixed inset-0 z-[101] flex items-center justify-center p-6 pointer-events-none">
          <Dialog.Content 
            className={`relative w-full ${sizes[size]} max-h-[85vh] flex flex-col rounded-2xl border border-line/80 bg-bg-soft shadow-[0_30px_80px_rgba(0,0,0,0.6),0_0_0_1px_rgba(139,92,246,0.18)] pointer-events-auto focus:outline-none animate-in zoom-in-95 duration-200`}
          >
            {/* Glow border accent */}
            <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br from-brand-violet/20 via-transparent to-brand-cyan/10 opacity-60 blur-sm" />
            
            <div className="relative">
              {(title || subtitle) && (
                <header className="flex items-start justify-between px-6 py-4 border-b border-line/60">
                  <div>
                    {title && (
                      <Dialog.Title className="font-display tracking-[0.16em] text-sm text-white">
                        {title.toUpperCase()}
                      </Dialog.Title>
                    )}
                    {subtitle && (
                      <Dialog.Description className="text-xs text-muted mt-1">
                        {subtitle}
                      </Dialog.Description>
                    )}
                  </div>
                  <Dialog.Close className="h-8 w-8 grid place-items-center rounded-lg text-white/60 hover:text-white hover:bg-white/[0.08] transition">
                    <X size={16} />
                  </Dialog.Close>
                </header>
              )}
            </div>
            <div className="relative flex-1 overflow-hidden flex">{children}</div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

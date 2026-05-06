interface Props {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  size?: "sm" | "md";
}

export function Toggle({ label, checked, onChange, size = "md" }: Props) {
  const isSm = size === "sm";
  
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none group">
      <div 
        className="relative"
        onClick={(e) => {
          e.preventDefault();
          onChange(!checked);
        }}
      >
        <div
          className={`relative transition-all duration-300 ease-out rounded-full border ${
            isSm ? "h-4 w-8" : "h-6 w-11"
          } ${
            checked 
              ? "bg-brand-violet/20 border-brand-violet/50 shadow-[0_0_12px_rgba(139,92,246,0.3)]" 
              : "bg-white/5 border-white/10 group-hover:border-white/20"
          }`}
        />
        <div
          className={`absolute top-1/2 -translate-y-1/2 transition-all duration-300 cubic-bezier(0.34, 1.56, 0.64, 1) rounded-full shadow-lg ${
            isSm ? "h-2.5 w-2.5" : "h-4 w-4"
          } ${
            checked 
              ? `bg-brand-cyan shadow-[0_0_8px_rgba(34,211,238,0.6)] ${isSm ? "translate-x-[1.15rem]" : "translate-x-[1.55rem]"}` 
              : `bg-white/40 translate-x-[0.2rem]`
          }`}
        />
      </div>
      {label && (
        <span className={`font-medium transition-colors ${
          isSm ? "text-[10px] uppercase tracking-wider" : "text-sm"
        } ${checked ? "text-white" : "text-muted group-hover:text-white/80"}`}>
          {label}
        </span>
      )}
    </label>
  );
}

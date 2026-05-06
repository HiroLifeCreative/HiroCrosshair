interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

const SWATCHES = [
  "#22d3ee", "#3b82f6", "#6366f1", "#8b5cf6", "#a78bfa", "#7c3aed",
  "#22c55e", "#eab308", "#f97316", "#ef4444", "#ec4899", "#ffffff",
];

export function ColorField({ label, value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="label">{label}</span>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="input w-24 font-mono text-xs uppercase"
            spellCheck={false}
          />
          <label
            className="relative h-7 w-7 rounded-md border border-line/70 cursor-pointer overflow-hidden"
            style={{ background: value }}
          >
            <input
              type="color"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </label>
        </div>
      </div>
      <div className="grid grid-cols-12 gap-1.5">
        {SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={`h-5 rounded-md border transition-transform hover:scale-110 ${
              value.toLowerCase() === c.toLowerCase()
                ? "border-white/80 ring-1 ring-brand-violet"
                : "border-line/60"
            }`}
            style={{ background: c }}
            aria-label={c}
          />
        ))}
      </div>
    </div>
  );
}

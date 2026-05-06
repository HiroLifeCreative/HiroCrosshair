import { useMemo } from "react";

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}

export function Slider({ label, value, min, max, step = 1, unit, onChange }: Props) {
  const pct = useMemo(
    () => ((value - min) / (max - min)) * 100,
    [value, min, max],
  );
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="label">{label}</span>
        <span className="text-xs font-mono text-white/85 tabular-nums">
          {value}
          {unit ?? ""}
        </span>
      </div>
      <input
        type="range"
        className="slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ ["--val" as never]: `${pct}%` }}
      />
    </div>
  );
}

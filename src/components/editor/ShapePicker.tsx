import type { CrosshairShape } from "@/types/crosshair";

const SHAPES: { id: CrosshairShape; label: string }[] = [
  { id: "cross", label: "Cross" },
  { id: "cross-dot", label: "Cross + Dot" },
  { id: "cross-circle", label: "Cross + Circle" },
  { id: "dot", label: "Dot" },
  { id: "circle", label: "Circle" },
  { id: "t-shape", label: "T-Shape" },
  { id: "x-shape", label: "X-Shape" },
];

interface Props {
  value: CrosshairShape;
  onChange: (s: CrosshairShape) => void;
}

export function ShapePicker({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <span className="label">Tipo de mira</span>
      <div className="grid grid-cols-2 gap-2">
        {SHAPES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange(s.id)}
            className={`btn justify-start ${
              value === s.id
                ? "bg-gradient-to-br from-brand-violet/30 to-brand-purple/20 border-brand-violet/60 text-white"
                : "bg-white/[0.03] border-line/70 text-white/75 hover:bg-white/[0.06]"
            } border`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

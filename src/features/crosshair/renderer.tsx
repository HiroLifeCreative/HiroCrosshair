import { useId } from "react";
import type { CrosshairConfig } from "@/types/crosshair";

interface Props {
  config: CrosshairConfig;
  /** Render area in px (square). Defaults to fit content. */
  size?: number;
}

/**
 * SVG-based crosshair renderer. Pure, deterministic, real-time updates.
 * Rendered identically in editor preview and overlay window.
 */
export function CrosshairSVG({ config, size }: Props) {
  const filterId = useId();
  const {
    shape,
    color,
    opacity,
    size: arm,
    thickness,
    gap,
    rotation,
    roundedCaps,
    linesOpacity,
    dotEnabled,
    dotSize,
    dotColor,
    dotOpacity,
    dotRounded,
    outlineEnabled,
    outlineThickness,
    outlineColor,
    outlineOpacity,
    circleEnabled,
    circleRadius,
    circleThickness,
    circleOpacity,
    circleDashed,
    glowEnabled,
    glowSize,
    glowColor,
    glowOpacity,
    shadowEnabled,
    shadowOffsetX,
    shadowOffsetY,
    shadowBlur,
    shadowColor,
    shadowOpacity,
  } = config;

  // Compute viewport size to fit everything
  const maxExtent = Math.max(
    arm + gap,
    circleEnabled ? circleRadius + circleThickness : 0,
    dotEnabled ? dotSize : 0,
  );
  const fxPad = Math.max(
    glowEnabled ? glowSize * 2 : 0,
    shadowEnabled ? Math.abs(shadowOffsetX) + Math.abs(shadowOffsetY) + shadowBlur * 2 : 0,
  );
  const pad = (outlineEnabled ? outlineThickness : 0) + 4 + fxPad;
  const vb = Math.ceil((maxExtent + pad) * 2);
  const cx = vb / 2;
  const cy = vb / 2;
  const renderSize = size ?? vb;

  const showCross =
    shape === "cross" ||
    shape === "cross-dot" ||
    shape === "cross-circle" ||
    shape === "t-shape";
  const showX = shape === "x-shape";
  const showCircle = circleEnabled || shape === "circle" || shape === "cross-circle";
  const showDot = dotEnabled || shape === "dot" || shape === "cross-dot";
  const showTopArm = showCross && shape !== "t-shape";
  const showBottomArm = showCross;
  const showHArms = showCross;

  const cap = roundedCaps ? ("round" as const) : ("butt" as const);

  const armSegments = () => {
    const segs: { x1: number; y1: number; x2: number; y2: number }[] = [];
    if (showTopArm) segs.push({ x1: cx, y1: cy - gap, x2: cx, y2: cy - gap - arm });
    if (showBottomArm) segs.push({ x1: cx, y1: cy + gap, x2: cx, y2: cy + gap + arm });
    if (showHArms) {
      segs.push({ x1: cx - gap, y1: cy, x2: cx - gap - arm, y2: cy });
      segs.push({ x1: cx + gap, y1: cy, x2: cx + gap + arm, y2: cy });
    }
    if (showX) {
      const d = Math.SQRT1_2;
      segs.push({ x1: cx - gap * d, y1: cy - gap * d, x2: cx - (gap + arm) * d, y2: cy - (gap + arm) * d });
      segs.push({ x1: cx + gap * d, y1: cy - gap * d, x2: cx + (gap + arm) * d, y2: cy - (gap + arm) * d });
      segs.push({ x1: cx - gap * d, y1: cy + gap * d, x2: cx - (gap + arm) * d, y2: cy + (gap + arm) * d });
      segs.push({ x1: cx + gap * d, y1: cy + gap * d, x2: cx + (gap + arm) * d, y2: cy + (gap + arm) * d });
    }
    return segs;
  };

  const segs = armSegments();
  const dashArray = circleDashed
    ? `${Math.max(2, circleThickness * 2)} ${Math.max(2, circleThickness * 2)}`
    : undefined;

  const filterUrl = (() => {
    const ids: string[] = [];
    if (shadowEnabled) ids.push("shadow");
    if (glowEnabled) ids.push("glow");
    return ids.length > 0 ? `url(#${filterId}-${ids[0]})` : undefined;
  })();

  return (
    <svg
      width={renderSize}
      height={renderSize}
      viewBox={`0 0 ${vb} ${vb}`}
      style={{ opacity, overflow: "visible" }}
      shapeRendering="geometricPrecision"
    >
      <defs>
        {shadowEnabled && (
          <filter id={`${filterId}-shadow`} x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow
              dx={shadowOffsetX}
              dy={shadowOffsetY}
              stdDeviation={shadowBlur}
              floodColor={shadowColor}
              floodOpacity={shadowOpacity}
            />
            {glowEnabled && (
              <feDropShadow
                dx="0"
                dy="0"
                stdDeviation={glowSize}
                floodColor={glowColor}
                floodOpacity={glowOpacity}
              />
            )}
          </filter>
        )}
        {!shadowEnabled && glowEnabled && (
          <filter id={`${filterId}-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow
              dx="0"
              dy="0"
              stdDeviation={glowSize}
              floodColor={glowColor}
              floodOpacity={glowOpacity}
            />
          </filter>
        )}
      </defs>

      <g transform={`rotate(${rotation} ${cx} ${cy})`} filter={filterUrl}>
        {/* Outline pass */}
        {outlineEnabled && (
          <g
            stroke={outlineColor}
            strokeWidth={thickness + outlineThickness * 2}
            strokeLinecap={cap}
            fill="none"
            opacity={outlineOpacity}
          >
            {segs.map((s, i) => (
              <line key={`o-${i}`} {...s} />
            ))}
            {showCircle && (
              <circle
                cx={cx}
                cy={cy}
                r={circleRadius}
                fill="none"
                strokeWidth={circleThickness + outlineThickness * 2}
                strokeDasharray={dashArray}
              />
            )}
            {showDot &&
              (dotRounded ? (
                <rect
                  x={cx - dotSize / 2 - outlineThickness}
                  y={cy - dotSize / 2 - outlineThickness}
                  width={dotSize + outlineThickness * 2}
                  height={dotSize + outlineThickness * 2}
                  rx={(dotSize + outlineThickness * 2) / 2.4}
                  ry={(dotSize + outlineThickness * 2) / 2.4}
                  fill={outlineColor}
                />
              ) : (
                <circle
                  cx={cx}
                  cy={cy}
                  r={dotSize / 2 + outlineThickness}
                  fill={outlineColor}
                  stroke="none"
                />
              ))}
          </g>
        )}

        {/* Main lines */}
        <g
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap={cap}
          fill="none"
          opacity={linesOpacity}
        >
          {segs.map((s, i) => (
            <line key={`m-${i}`} {...s} />
          ))}
        </g>

        {/* Circle */}
        {showCircle && (
          <circle
            cx={cx}
            cy={cy}
            r={circleRadius}
            stroke={color}
            strokeWidth={circleThickness}
            fill="none"
            strokeLinecap={cap}
            strokeDasharray={dashArray}
            opacity={circleOpacity}
          />
        )}

        {/* Dot */}
        {showDot &&
          (dotRounded ? (
            <rect
              x={cx - dotSize / 2}
              y={cy - dotSize / 2}
              width={dotSize}
              height={dotSize}
              rx={dotSize / 2.4}
              ry={dotSize / 2.4}
              fill={dotColor}
              opacity={dotOpacity}
            />
          ) : (
            <circle cx={cx} cy={cy} r={dotSize / 2} fill={dotColor} opacity={dotOpacity} />
          ))}
      </g>
    </svg>
  );
}

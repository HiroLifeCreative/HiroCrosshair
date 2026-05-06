export type CrosshairShape =
  | "cross"
  | "dot"
  | "circle"
  | "cross-dot"
  | "cross-circle"
  | "t-shape"
  | "x-shape";

export interface CrosshairConfig {
  shape: CrosshairShape;
  color: string;          // hex e.g. "#22d3ee"
  opacity: number;        // 0..1 (master opacity)
  size: number;           // length of each arm in px
  thickness: number;      // stroke width in px
  gap: number;            // separation from center in px
  rotation: number;       // degrees 0..360
  /** Round stroke caps (px-rounded ends) */
  roundedCaps: boolean;
  /** Per-element opacity multiplier (0..1) */
  linesOpacity: number;
  // Center dot
  dotEnabled: boolean;
  dotSize: number;        // px
  dotColor: string;
  dotOpacity: number;
  /** dot rendered as rounded square instead of circle */
  dotRounded: boolean;
  // Outline (stroke around lines/dot/circle)
  outlineEnabled: boolean;
  outlineThickness: number;
  outlineColor: string;
  outlineOpacity: number;
  // Circle
  circleEnabled: boolean;
  circleRadius: number;
  circleThickness: number;
  circleOpacity: number;
  /** dashed circle */
  circleDashed: boolean;
  // Glow / shadow
  glowEnabled: boolean;
  glowSize: number;       // px blur radius
  glowColor: string;
  glowOpacity: number;
  shadowEnabled: boolean;
  shadowOffsetX: number;  // px
  shadowOffsetY: number;
  shadowBlur: number;
  shadowColor: string;
  shadowOpacity: number;
}

export interface Preset {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  config: CrosshairConfig;
}

/** A single overlay inside a game profile, bound to a hotkey. */
export interface GameOverlay {
  id: string;
  name: string;
  /** Accelerator string, e.g. "1", "Alt+2", "F3" */
  hotkey: string;
  config: CrosshairConfig;
  // Window management
  ignoreClicks?: boolean;
  dimBackground?: boolean;
  dimAmount?: number; // 0..1
}

export interface Game {
  id: string;
  name: string;
  /** "Steam" | "Epic" | "Manual" */
  platform: string;
  installDir?: string;
  /** Optional executable name (e.g. "valorant.exe") for future auto-detection */
  exeName?: string;
  /** User-chosen icon emoji or letter (e.g. "🎯") */
  icon?: string;
  /** Cover image URL (auto-resolved from FreeToGame on add). */
  coverUrl?: string | null;
  overlays: GameOverlay[];
  /** Currently active overlay id within this game */
  activeOverlayId: string | null;
  createdAt: number;
}

export const DEFAULT_CROSSHAIR: CrosshairConfig = {
  shape: "cross-dot",
  color: "#22d3ee",
  opacity: 1,
  size: 10,
  thickness: 2,
  gap: 4,
  rotation: 0,
  roundedCaps: false,
  linesOpacity: 1,
  dotEnabled: true,
  dotSize: 2,
  dotColor: "#22d3ee",
  dotOpacity: 1,
  dotRounded: false,
  outlineEnabled: true,
  outlineThickness: 1,
  outlineColor: "#000000",
  outlineOpacity: 1,
  circleEnabled: false,
  circleRadius: 16,
  circleThickness: 1,
  circleOpacity: 1,
  circleDashed: false,
  glowEnabled: false,
  glowSize: 6,
  glowColor: "#22d3ee",
  glowOpacity: 0.7,
  shadowEnabled: false,
  shadowOffsetX: 0,
  shadowOffsetY: 1,
  shadowBlur: 2,
  shadowColor: "#000000",
  shadowOpacity: 0.6,
};

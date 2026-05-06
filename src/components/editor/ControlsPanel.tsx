import { useCrosshairStore } from "@/store/crosshairStore";
import { useSettings } from "@/store/settingsStore";
import { Slider } from "@/components/ui/Slider";
import { Toggle } from "@/components/ui/Toggle";
import { ColorField } from "@/components/ui/ColorField";
import { ShapePicker } from "./ShapePicker";

export function ControlsPanel() {
  const config = useCrosshairStore((s) => s.config);
  const setConfig = useCrosshairStore((s) => s.setConfig);
  const t = useSettings((s) => s.t);

  return (
    <section className="panel">
      <header className="panel-header">
        <span className="font-display tracking-wider text-sm text-white/90">
          {t("editor.title").toUpperCase()}
        </span>
        <span className="chip">{t("editor.live")}</span>
      </header>

      <div className="p-5 space-y-6">
        <ShapePicker
          value={config.shape}
          onChange={(shape) => setConfig({ shape })}
        />

        <div className="divider" />

        <ColorField
          label={t("editor.color")}
          value={config.color}
          onChange={(color) => setConfig({ color })}
        />

        <div className="grid grid-cols-2 gap-x-5 gap-y-4">
          <Slider
            label={t("editor.size")}
            value={config.size}
            min={0}
            max={40}
            onChange={(size) => setConfig({ size })}
            unit="px"
          />
          <Slider
            label={t("editor.thickness")}
            value={config.thickness}
            min={1}
            max={10}
            onChange={(thickness) => setConfig({ thickness })}
            unit="px"
          />
          <Slider
            label={t("editor.gap")}
            value={config.gap}
            min={0}
            max={30}
            onChange={(gap) => setConfig({ gap })}
            unit="px"
          />
          <Slider
            label={t("editor.opacity")}
            value={Math.round(config.opacity * 100)}
            min={10}
            max={100}
            onChange={(v) => setConfig({ opacity: v / 100 })}
            unit="%"
          />
          <Slider
            label={t("editor.lines_opacity")}
            value={Math.round(config.linesOpacity * 100)}
            min={0}
            max={100}
            onChange={(v) => setConfig({ linesOpacity: v / 100 })}
            unit="%"
          />
          <Slider
            label={t("editor.rotation")}
            value={config.rotation}
            min={0}
            max={360}
            onChange={(rotation) => setConfig({ rotation })}
            unit="°"
          />
        </div>

        <Toggle
          label={t("editor.rounded_caps")}
          checked={config.roundedCaps}
          onChange={(roundedCaps) => setConfig({ roundedCaps })}
        />

        <div className="divider" />

        {/* Punto central */}
        <div className="space-y-3">
          <Toggle
            label={t("editor.dot")}
            checked={config.dotEnabled}
            onChange={(dotEnabled) => setConfig({ dotEnabled })}
          />
          {config.dotEnabled && (
            <div className="space-y-4 pl-1">
              <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                <Slider
                  label={t("editor.dot_size")}
                  value={config.dotSize}
                  min={1}
                  max={10}
                  onChange={(dotSize) => setConfig({ dotSize })}
                  unit="px"
                />
                <ColorField
                  label={t("editor.dot_color")}
                  value={config.dotColor}
                  onChange={(dotColor) => setConfig({ dotColor })}
                />
                <Slider
                  label={t("editor.dot_opacity")}
                  value={Math.round(config.dotOpacity * 100)}
                  min={0}
                  max={100}
                  onChange={(v) => setConfig({ dotOpacity: v / 100 })}
                  unit="%"
                />
              </div>
              <Toggle
                label={t("editor.dot_rounded")}
                checked={config.dotRounded}
                onChange={(dotRounded) => setConfig({ dotRounded })}
              />
            </div>
          )}
        </div>

        <div className="divider" />

        {/* Contorno */}
        <div className="space-y-3">
          <Toggle
            label={t("editor.outline")}
            checked={config.outlineEnabled}
            onChange={(outlineEnabled) => setConfig({ outlineEnabled })}
          />
          {config.outlineEnabled && (
            <div className="grid grid-cols-2 gap-x-5 gap-y-4 pl-1">
              <Slider
                label={t("editor.outline_thickness")}
                value={config.outlineThickness}
                min={1}
                max={5}
                onChange={(outlineThickness) => setConfig({ outlineThickness })}
                unit="px"
              />
              <ColorField
                label={t("editor.outline_color")}
                value={config.outlineColor}
                onChange={(outlineColor) => setConfig({ outlineColor })}
              />
              <Slider
                label={t("editor.outline_opacity")}
                value={Math.round(config.outlineOpacity * 100)}
                min={0}
                max={100}
                onChange={(v) => setConfig({ outlineOpacity: v / 100 })}
                unit="%"
              />
            </div>
          )}
        </div>

        <div className="divider" />

        {/* Círculo */}
        <div className="space-y-3">
          <Toggle
            label={t("editor.circle")}
            checked={config.circleEnabled}
            onChange={(circleEnabled) => setConfig({ circleEnabled })}
          />
          {config.circleEnabled && (
            <div className="space-y-4 pl-1">
              <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                <Slider
                  label={t("editor.circle_radius")}
                  value={config.circleRadius}
                  min={4}
                  max={60}
                  onChange={(circleRadius) => setConfig({ circleRadius })}
                  unit="px"
                />
                <Slider
                  label={t("editor.circle_thickness")}
                  value={config.circleThickness}
                  min={1}
                  max={6}
                  onChange={(circleThickness) => setConfig({ circleThickness })}
                  unit="px"
                />
                <Slider
                  label={t("editor.circle_opacity")}
                  value={Math.round(config.circleOpacity * 100)}
                  min={0}
                  max={100}
                  onChange={(v) => setConfig({ circleOpacity: v / 100 })}
                  unit="%"
                />
              </div>
              <Toggle
                label={t("editor.circle_dashed")}
                checked={config.circleDashed}
                onChange={(circleDashed) => setConfig({ circleDashed })}
              />
            </div>
          )}
        </div>

        <div className="divider" />

        {/* Effects: glow + shadow */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-display tracking-wider text-xs text-white/80 uppercase">
              {t("editor.section_fx")}
            </span>
          </div>

          <div className="space-y-3">
            <Toggle
              label={t("editor.glow")}
              checked={config.glowEnabled}
              onChange={(glowEnabled) => setConfig({ glowEnabled })}
            />
            {config.glowEnabled && (
              <div className="grid grid-cols-2 gap-x-5 gap-y-4 pl-1">
                <Slider
                  label={t("editor.glow_size")}
                  value={config.glowSize}
                  min={1}
                  max={30}
                  onChange={(glowSize) => setConfig({ glowSize })}
                  unit="px"
                />
                <ColorField
                  label={t("editor.glow_color")}
                  value={config.glowColor}
                  onChange={(glowColor) => setConfig({ glowColor })}
                />
                <Slider
                  label={t("editor.glow_opacity")}
                  value={Math.round(config.glowOpacity * 100)}
                  min={0}
                  max={100}
                  onChange={(v) => setConfig({ glowOpacity: v / 100 })}
                  unit="%"
                />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Toggle
              label={t("editor.shadow")}
              checked={config.shadowEnabled}
              onChange={(shadowEnabled) => setConfig({ shadowEnabled })}
            />
            {config.shadowEnabled && (
              <div className="grid grid-cols-2 gap-x-5 gap-y-4 pl-1">
                <Slider
                  label={t("editor.shadow_x")}
                  value={config.shadowOffsetX}
                  min={-10}
                  max={10}
                  onChange={(shadowOffsetX) => setConfig({ shadowOffsetX })}
                  unit="px"
                />
                <Slider
                  label={t("editor.shadow_y")}
                  value={config.shadowOffsetY}
                  min={-10}
                  max={10}
                  onChange={(shadowOffsetY) => setConfig({ shadowOffsetY })}
                  unit="px"
                />
                <Slider
                  label={t("editor.shadow_blur")}
                  value={config.shadowBlur}
                  min={0}
                  max={20}
                  onChange={(shadowBlur) => setConfig({ shadowBlur })}
                  unit="px"
                />
                <ColorField
                  label={t("editor.shadow_color")}
                  value={config.shadowColor}
                  onChange={(shadowColor) => setConfig({ shadowColor })}
                />
                <Slider
                  label={t("editor.shadow_opacity")}
                  value={Math.round(config.shadowOpacity * 100)}
                  min={0}
                  max={100}
                  onChange={(v) => setConfig({ shadowOpacity: v / 100 })}
                  unit="%"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

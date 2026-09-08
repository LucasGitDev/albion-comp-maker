"use client";

import { useCallback, useId, useRef, useState } from "react";
import { THEME_PRESET_NAMES, type NamedThemePreset } from "@/components/build-card/theme-presets";
import type { BuildCardTheme } from "@/components/build-card/types";
import {
  BG_BLUR_MAX,
  BG_BLUR_MIN,
  BG_DARKEN_MAX,
  BG_DARKEN_MIN,
  BG_MAX_UPLOAD_BYTES,
  BG_SCALE_MAX,
  BG_SCALE_MIN,
} from "@/lib/validation-constants";

/**
 * ACM-014 theme panel (doc-007, simplified against decision-019's leaner
 * `BuildCardTheme` shape — see the implementation notes on this task for the
 * deviations from the full doc-007 spec: no per-user accent override inside
 * the theme, no responsive rail/slide-over/sheet split, no `custom` preset
 * flow, no keyboard-shortcut announce region. Those are tracked as an
 * explicit follow-up rather than silently dropped).
 *
 * Always a sibling of `#capture-root`, never a descendant (decision-010):
 * this component renders nothing inside the card, only controls next to it.
 */

const PRESET_LABELS: Readonly<Record<NamedThemePreset, string>> = {
  "dark-purple": "Roxo escuro",
  gold: "Dourado",
  blood: "Sangue",
  ice: "Gelo",
};

export type ThemePanelProps = {
  theme: BuildCardTheme;
  onChange: (theme: BuildCardTheme) => void;
};

type UploadState = { kind: "idle" } | { kind: "uploading" } | { kind: "error"; message: string };

async function uploadBackground(file: File): Promise<string> {
  const formData = new FormData();
  formData.set("file", file);
  const response = await fetch("/api/background", { method: "POST", body: formData });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Não deu para enviar a imagem.");
  }
  const body = (await response.json()) as { id: string };
  return body.id;
}

export function ThemePanel({ theme, onChange }: ThemePanelProps): React.JSX.Element {
  const [upload, setUpload] = useState<UploadState>({ kind: "idle" });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const titleId = useId();

  const handlePresetClick = useCallback(
    (preset: NamedThemePreset) => {
      onChange({ ...theme, preset });
    },
    [theme, onChange]
  );

  const handleFileSelected = useCallback(
    async (fileList: FileList | null) => {
      const file = fileList?.[0];
      if (!file) return;

      if (file.size > BG_MAX_UPLOAD_BYTES) {
        setUpload({ kind: "error", message: "Essa imagem é maior que 4 MB." });
        return;
      }

      setUpload({ kind: "uploading" });
      try {
        const imageId = await uploadBackground(file);
        onChange({
          ...theme,
          background: { imageId, blur: 0, darken: 0.4, scale: 1 },
        });
        setUpload({ kind: "idle" });
      } catch (error) {
        setUpload({ kind: "error", message: error instanceof Error ? error.message : "Não deu para enviar a imagem." });
      }
    },
    [theme, onChange]
  );

  const handleRemoveBackground = useCallback(() => {
    onChange({ ...theme, background: null });
  }, [theme, onChange]);

  const background = theme.background;

  return (
    <aside aria-labelledby={titleId} className="flex w-80 shrink-0 flex-col gap-6 rounded-lg border border-[var(--color-border)] p-4">
      <h2 id={titleId} className="text-sm font-semibold text-foreground">
        Aparência
      </h2>

      <section aria-label="Preset de tema">
        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/70">Preset</h3>
        <div role="radiogroup" aria-label="Preset de tema" className="grid grid-cols-2 gap-2">
          {THEME_PRESET_NAMES.map((preset) => (
            <button
              key={preset}
              type="button"
              role="radio"
              aria-checked={theme.preset === preset}
              onClick={() => handlePresetClick(preset)}
              className="flex flex-col items-start gap-1 rounded-md border border-[var(--color-border)] p-2 text-left text-xs font-medium text-foreground transition-colors duration-150 ease-out hover:border-[var(--color-accent)] data-[selected=true]:border-[var(--color-accent)]"
              data-selected={theme.preset === preset}
            >
              {PRESET_LABELS[preset]}
            </button>
          ))}
        </div>
      </section>

      <details open className="flex flex-col gap-3">
        <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/70">
          Fundo
        </summary>

        <div className="flex flex-col gap-3">
          {background ? (
            <div className="flex items-center justify-between gap-2 text-xs text-foreground">
              <span>Imagem de fundo aplicada.</span>
              <div className="flex gap-2">
                <button type="button" className="underline" onClick={() => fileInputRef.current?.click()}>
                  Trocar
                </button>
                <button type="button" className="underline" onClick={handleRemoveBackground}>
                  Remover
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-1 rounded-md border border-dashed border-[var(--color-icon-slot-empty)] p-4 text-center text-xs text-foreground/70"
            >
              <span>Arraste uma imagem ou clique</span>
              <span className="text-[11px]">JPEG, PNG ou WebP · até 4 MB</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => {
              void handleFileSelected(event.target.files);
              event.target.value = "";
            }}
          />
          {upload.kind === "uploading" && (
            <p role="status" aria-live="polite" className="text-xs text-foreground/70">
              Enviando imagem…
            </p>
          )}
          {upload.kind === "error" && (
            <p role="alert" className="text-xs text-[var(--color-icon-error-fg)]">
              {upload.message}
            </p>
          )}

          <LabeledSlider
            label="Desfoque do fundo"
            unit="px"
            min={BG_BLUR_MIN}
            max={BG_BLUR_MAX}
            step={1}
            value={background?.blur ?? BG_BLUR_MIN}
            disabled={!background}
            onChange={(blur) => background && onChange({ ...theme, background: { ...background, blur } })}
          />
          <LabeledSlider
            label="Escurecer o fundo"
            unit="%"
            min={BG_DARKEN_MIN * 100}
            max={BG_DARKEN_MAX * 100}
            step={5}
            value={(background?.darken ?? 0.4) * 100}
            disabled={!background}
            onChange={(percent) => background && onChange({ ...theme, background: { ...background, darken: percent / 100 } })}
          />
          <LabeledSlider
            label="Escala da imagem de fundo"
            unit="%"
            min={BG_SCALE_MIN * 100}
            max={BG_SCALE_MAX * 100}
            step={5}
            value={(background?.scale ?? 1) * 100}
            disabled={!background}
            onChange={(percent) => background && onChange({ ...theme, background: { ...background, scale: percent / 100 } })}
          />
        </div>
      </details>

      <details className="flex flex-col gap-3">
        <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/70">
          Conteúdo e formato
        </summary>
        <div className="flex flex-col gap-3">
          <label className="flex items-center justify-between text-xs text-foreground">
            <span>Mostrar nomes de item</span>
            <input
              type="checkbox"
              checked={theme.showItemNames}
              onChange={(event) => onChange({ ...theme, showItemNames: event.target.checked })}
            />
          </label>
          <label className="flex items-center justify-between text-xs text-foreground">
            <span>Mostrar nomes de habilidade</span>
            <input
              type="checkbox"
              checked={theme.showSpellNames}
              onChange={(event) => onChange({ ...theme, showSpellNames: event.target.checked })}
            />
          </label>

          <fieldset>
            <legend className="mb-1 text-xs text-foreground">Proporção</legend>
            <div role="radiogroup" aria-label="Proporção do card" className="grid grid-cols-3 gap-1">
              {(
                [
                  { value: "square", label: "Quadrado" },
                  { value: "wide", label: "Largo" },
                  { value: "auto", label: "Automático" },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={theme.aspectRatio === option.value}
                  onClick={() => onChange({ ...theme, aspectRatio: option.value })}
                  className="rounded-md border border-[var(--color-border)] px-2 py-1 text-[11px] font-medium text-foreground data-[selected=true]:border-[var(--color-accent)]"
                  data-selected={theme.aspectRatio === option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="flex items-center justify-between text-xs text-foreground">
            <span>Fonte</span>
            <select
              value={theme.fontFamily}
              onChange={(event) => onChange({ ...theme, fontFamily: event.target.value as BuildCardTheme["fontFamily"] })}
              className="rounded-md border border-[var(--color-border)] bg-transparent px-2 py-1 text-xs"
            >
              <option value="sans">Sem serifa</option>
              <option value="mono">Monoespaçada</option>
            </select>
          </label>
        </div>
      </details>
    </aside>
  );
}

type LabeledSliderProps = {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
};

function LabeledSlider({ label, unit, min, max, step, value, disabled, onChange }: LabeledSliderProps): React.JSX.Element {
  const inputId = useId();
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs text-foreground">
        <label htmlFor={inputId}>{label}</label>
        <output htmlFor={inputId} style={{ fontVariantNumeric: "tabular-nums" }}>
          {Math.round(value)} {unit}
        </output>
      </div>
      <input
        id={inputId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full"
      />
    </div>
  );
}

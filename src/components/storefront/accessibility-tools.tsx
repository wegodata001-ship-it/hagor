"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useStoreI18n } from "@/components/storefront/store-i18n";

type TextScale = "sm" | "md" | "lg";
type AccessibilityPrefs = {
  textScale: TextScale;
  highContrast: boolean;
  grayscale: boolean;
  highlightLinks: boolean;
  readableFont: boolean;
  largeCursor: boolean;
  stopAnimations: boolean;
};

const STORAGE_KEY = "hagor_accessibility_prefs";

const DEFAULT_PREFS: AccessibilityPrefs = {
  textScale: "md",
  highContrast: false,
  grayscale: false,
  highlightLinks: false,
  readableFont: false,
  largeCursor: false,
  stopAnimations: false,
};

function readStoredPrefs(): AccessibilityPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<AccessibilityPrefs>;
    return {
      textScale: parsed.textScale === "sm" || parsed.textScale === "lg" ? parsed.textScale : "md",
      highContrast: !!parsed.highContrast,
      grayscale: !!parsed.grayscale,
      highlightLinks: !!parsed.highlightLinks,
      readableFont: !!parsed.readableFont,
      largeCursor: !!parsed.largeCursor,
      stopAnimations: !!parsed.stopAnimations,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function applyPrefsToDocument(prefs: AccessibilityPrefs) {
  const root = document.documentElement;
  root.dataset.a11yTextScale = prefs.textScale;
  root.dataset.a11yContrast = prefs.highContrast ? "high" : "normal";
  root.dataset.a11yGrayscale = prefs.grayscale ? "on" : "off";
  root.dataset.a11yHighlightLinks = prefs.highlightLinks ? "on" : "off";
  root.dataset.a11yReadableFont = prefs.readableFont ? "on" : "off";
  root.dataset.a11yLargeCursor = prefs.largeCursor ? "on" : "off";
  root.dataset.a11yStopAnimations = prefs.stopAnimations ? "on" : "off";
}

function focusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true");
}

function ToggleButton({
  label,
  active,
  onClick,
  stateLabel,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  stateLabel: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex items-center justify-between rounded-2xl border px-3 py-3 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hagor-gold ${
        active
          ? "border-hagor-gold/70 bg-hagor-gold/15 text-white"
          : "border-zinc-800 bg-zinc-900/80 text-zinc-200 hover:border-hagor-gold/40"
      }`}
    >
      <span>{label}</span>
      <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${active ? "bg-hagor-gold text-black" : "bg-zinc-800 text-zinc-400"}`}>
        {stateLabel}
      </span>
    </button>
  );
}

export function AccessibilityTools() {
  const { t, dir } = useStoreI18n();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<AccessibilityPrefs>(DEFAULT_PREFS);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = readStoredPrefs();
    setPrefs(stored);
    setMounted(true);
    applyPrefsToDocument(stored);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    applyPrefsToDocument(prefs);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // ignore
    }
  }, [mounted, prefs]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => closeRef.current?.focus(), 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        window.setTimeout(() => triggerRef.current?.focus(), 0);
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const items = focusableElements(panelRef.current);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const textButtons = useMemo(
    () => [
      { key: "sm" as const, label: t("a11yTextDecrease") },
      { key: "md" as const, label: t("a11yTextNormal") },
      { key: "lg" as const, label: t("a11yTextIncrease") },
    ],
    [t],
  );

  if (!mounted) return null;

  const stateLabel = (active: boolean) => (active ? t("a11yOn") : t("a11yOff"));

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("openAccessibility")}
        title={t("accessibilityShort")}
        className="fixed bottom-24 end-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full border border-hagor-gold/50 bg-black/90 text-2xl text-hagor-gold shadow-[0_0_28px_rgba(0,0,0,0.45)] backdrop-blur transition hover:border-hagor-gold hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hagor-gold md:bottom-6 md:end-6"
      >
        <span aria-hidden>♿</span>
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label={t("close")}
            onClick={() => {
              setOpen(false);
              window.setTimeout(() => triggerRef.current?.focus(), 0);
            }}
            className="fixed inset-0 z-[90] bg-black/60"
          />
          <div
            ref={panelRef}
            dir={dir}
            role="dialog"
            aria-modal="true"
            aria-labelledby="hagor-accessibility-title"
            aria-describedby="hagor-accessibility-desc"
            className="fixed inset-x-0 bottom-0 z-[100] max-h-[80vh] overflow-y-auto rounded-t-3xl border border-hagor-gold/20 bg-[#090909] p-4 text-white shadow-2xl md:bottom-6 md:end-6 md:start-auto md:w-[380px] md:rounded-3xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="hagor-accessibility-title" className="text-lg font-bold text-white">
                  {t("a11yTitle")}
                </h2>
                <p id="hagor-accessibility-desc" className="mt-1 text-sm leading-6 text-zinc-400">
                  {t("a11yDescription")}
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => {
                  setOpen(false);
                  window.setTimeout(() => triggerRef.current?.focus(), 0);
                }}
                aria-label={t("close")}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hagor-gold"
              >
                <span aria-hidden>&times;</span>
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              <div className="grid gap-2 sm:grid-cols-3">
                {textButtons.map((item) => {
                  const active = prefs.textScale === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setPrefs((prev) => ({ ...prev, textScale: item.key }))}
                      className={`rounded-2xl border px-3 py-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hagor-gold ${
                        active
                          ? "border-hagor-gold bg-hagor-gold/15 text-white"
                          : "border-zinc-800 bg-zinc-900/80 text-zinc-200 hover:border-hagor-gold/40"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <ToggleButton
                label={t("a11yHighContrast")}
                active={prefs.highContrast}
                stateLabel={stateLabel(prefs.highContrast)}
                onClick={() => setPrefs((prev) => ({ ...prev, highContrast: !prev.highContrast }))}
              />
              <ToggleButton
                label={t("a11yGrayscale")}
                active={prefs.grayscale}
                stateLabel={stateLabel(prefs.grayscale)}
                onClick={() => setPrefs((prev) => ({ ...prev, grayscale: !prev.grayscale }))}
              />
              <ToggleButton
                label={t("a11yHighlightLinks")}
                active={prefs.highlightLinks}
                stateLabel={stateLabel(prefs.highlightLinks)}
                onClick={() => setPrefs((prev) => ({ ...prev, highlightLinks: !prev.highlightLinks }))}
              />
              <ToggleButton
                label={t("a11yReadableFont")}
                active={prefs.readableFont}
                stateLabel={stateLabel(prefs.readableFont)}
                onClick={() => setPrefs((prev) => ({ ...prev, readableFont: !prev.readableFont }))}
              />
              <ToggleButton
                label={t("a11yLargeCursor")}
                active={prefs.largeCursor}
                stateLabel={stateLabel(prefs.largeCursor)}
                onClick={() => setPrefs((prev) => ({ ...prev, largeCursor: !prev.largeCursor }))}
              />
              <ToggleButton
                label={t("a11yStopAnimations")}
                active={prefs.stopAnimations}
                stateLabel={stateLabel(prefs.stopAnimations)}
                onClick={() => setPrefs((prev) => ({ ...prev, stopAnimations: !prev.stopAnimations }))}
              />
            </div>

            <button
              type="button"
              onClick={() => setPrefs(DEFAULT_PREFS)}
              className="mt-5 w-full rounded-2xl border border-hagor-gold/45 bg-gradient-to-r from-hagor-gold to-amber-700 px-4 py-3 text-sm font-semibold text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hagor-gold"
            >
              {t("a11yReset")}
            </button>
          </div>
        </>
      ) : null}
    </>
  );
}

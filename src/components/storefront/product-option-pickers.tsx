"use client";

import { useState } from "react";
import { HagourHandIcon, HagourNavIcon } from "@/components/storefront/hagour-icon";
import { useStoreI18n } from "@/components/storefront/store-i18n";
import {
  BELT_SIZE_TABLE,
  BUCKLE_LABELS,
  FREE_BUCKLE_OPTIONS,
  beltRowFromKey,
  beltRowKey,
  type BeltSelectedOptions,
  type BuckleType,
  type HandSide,
  type HolsterSelectedOptions,
  formatBeltSizeCard,
} from "@/lib/hagour-product-options";

const HAND_LABELS: Record<HandSide, Record<"he" | "ar" | "en", string>> = {
  RIGHT: { he: "יד ימין", ar: "يمين", en: "Right Hand" },
  LEFT: { he: "יד שמאל", ar: "شمال", en: "Left Hand" },
};

export function BeltProductOptions({
  selectedSizeKey,
  buckleType,
  fixedBuckleType = null,
  onSizeChange,
  onBuckleChange,
  error,
}: {
  selectedSizeKey: string | null;
  buckleType: BuckleType | null;
  fixedBuckleType?: BuckleType | null;
  onSizeChange: (opts: BeltSelectedOptions | null) => void;
  onBuckleChange: (type: BuckleType | null) => void;
  error?: string | null;
}) {
  const { lang, t } = useStoreI18n();
  const l = lang as "he" | "ar" | "en";
  const [guideOpen, setGuideOpen] = useState(false);
  const effectiveBuckle = fixedBuckleType ?? buckleType;

  const handleSize = (key: string) => {
    const row = beltRowFromKey(key);
    if (!row) return;
    const nextBuckle = fixedBuckleType ?? buckleType ?? "REGULAR";
    if (fixedBuckleType) onBuckleChange(fixedBuckleType);
    onSizeChange({
      type: "BELT",
      beltSize: row.beltSize,
      policePantsSize: row.policePantsSize,
      beltLengthCm: row.beltLengthCm,
      beltLengthInch: row.beltLengthInch,
      buckleType: nextBuckle,
    });
  };

  const handleBuckle = (type: BuckleType) => {
    if (fixedBuckleType) return;
    onBuckleChange(type);
    if (selectedSizeKey) {
      const row = beltRowFromKey(selectedSizeKey);
      if (row) {
        onSizeChange({
          type: "BELT",
          beltSize: row.beltSize,
          policePantsSize: row.policePantsSize,
          beltLengthCm: row.beltLengthCm,
          beltLengthInch: row.beltLengthInch,
          buckleType: type,
        });
      }
    }
  };

  return (
    <div className="mt-4 space-y-4">
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <label htmlFor="belt-size" className="text-sm font-semibold text-[#f7f7f7]">
            {t("chooseSize")}
          </label>
          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className="text-xs font-medium text-[#d3a20e] transition-colors duration-150 hover:underline"
          >
            {t("sizeGuide")}
          </button>
        </div>
        <select
          id="belt-size"
          value={selectedSizeKey ?? ""}
          onChange={(e) => handleSize(e.target.value)}
          className="ds-select h-11 w-full text-sm"
        >
          <option value="">{t("chooseSize")}</option>
          {BELT_SIZE_TABLE.map((row) => {
            const key = beltRowKey(row);
            return (
              <option key={key} value={key}>
                {formatBeltSizeCard(row, lang)}
              </option>
            );
          })}
        </select>
        {error ? <p className="mt-1.5 text-xs text-red-400">{error}</p> : null}
      </div>

      {fixedBuckleType ? (
        <p className="text-sm text-[#aaa]">
          {t("fixedBuckle")}: <span className="font-medium text-[#d3a20e]">{BUCKLE_LABELS[fixedBuckleType][l]}</span>
        </p>
      ) : selectedSizeKey ? (
        <div>
          <p className="mb-2 text-sm font-semibold text-[#f7f7f7]">{t("chooseBuckle")}</p>
          <div className="grid grid-cols-3 gap-2">
            {FREE_BUCKLE_OPTIONS.map((type) => {
              const selected = effectiveBuckle === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleBuckle(type)}
                  className={`rounded-xl border px-2 py-2.5 text-xs font-medium transition-colors duration-150 ${
                    selected
                      ? "border-[#d3a20e] bg-[#111113] text-white"
                      : "border-[rgba(212,160,23,0.18)] bg-[#0d0d0d] text-zinc-300 hover:border-[#d3a20e]/50"
                  }`}
                >
                  {BUCKLE_LABELS[type][l]}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {guideOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/75"
            onClick={() => setGuideOpen(false)}
            aria-label={t("close")}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="belt-size-guide-title"
            className="relative max-h-[85vh] w-full max-w-lg overflow-auto rounded-2xl border border-[rgba(212,160,23,0.18)] bg-[#111113] p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 id="belt-size-guide-title" className="text-base font-bold text-white">{t("sizeGuide")}</h3>
              <button
                type="button"
                onClick={() => setGuideOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700"
                aria-label={t("close")}
              >
                <HagourNavIcon name="close" />
              </button>
            </div>
            <table className="w-full text-xs text-zinc-300">
              <thead>
                <tr className="border-b border-zinc-800 text-[#aaa]">
                  <th className="px-2 py-2 text-start">{t("beltSizeCol")}</th>
                  <th className="px-2 py-2 text-start">{t("pantsSizeCol")}</th>
                  <th className="px-2 py-2 text-start">{t("lengthCmCol")}</th>
                  <th className="px-2 py-2 text-start">{t("lengthInchCol")}</th>
                </tr>
              </thead>
              <tbody>
                {BELT_SIZE_TABLE.map((row) => (
                  <tr key={beltRowKey(row)} className="border-b border-zinc-800/70">
                    <td className="px-2 py-1.5">{row.beltSize}</td>
                    <td className="px-2 py-1.5">{row.policePantsSize}</td>
                    <td className="px-2 py-1.5">{row.beltLengthCm}</td>
                    <td className="px-2 py-1.5">{row.beltLengthInch}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function HolsterProductOptions({
  handSide,
  onChange,
  error,
}: {
  handSide: HandSide | null;
  onChange: (opts: HolsterSelectedOptions | null) => void;
  error?: string | null;
}) {
  const { lang, t } = useStoreI18n();
  const l = lang as "he" | "ar" | "en";
  const sides: HandSide[] = ["RIGHT", "LEFT"];

  return (
    <div className="mt-4">
      <p className="mb-2 text-sm font-semibold text-[#f7f7f7]">{t("chooseSide")}</p>
      <div className="grid grid-cols-2 gap-2">
        {sides.map((side) => {
          const selected = handSide === side;
          return (
            <button
              key={side}
              type="button"
              onClick={() => onChange({ type: "HOLSTER", handSide: side })}
              className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition-colors duration-150 ${
                selected
                  ? "border-[#d3a20e] bg-[#111113] text-white"
                  : "border-[rgba(212,160,23,0.18)] bg-[#0d0d0d] text-zinc-200 hover:border-[#d3a20e]/50"
              }`}
            >
              <HagourHandIcon side={side} />
              {HAND_LABELS[side][l]}
            </button>
          );
        })}
      </div>
      {error ? <p className="mt-1.5 text-xs text-red-400">{error}</p> : null}
    </div>
  );
}

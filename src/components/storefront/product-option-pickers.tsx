"use client";

import { HagourHandIcon } from "@/components/storefront/hagour-icon";
import { useStoreI18n } from "@/components/storefront/store-i18n";
import {
  BELT_SIZE_TABLE,
  beltRowFromKey,
  beltRowKey,
  type BeltSelectedOptions,
  type BuckleType,
  type HandSide,
  type HolsterSelectedOptions,
  formatBeltSizeCard,
} from "@/lib/hagour-product-options";

const BUCKLE_OPTIONS: BuckleType[] = ["REGULAR", "TACTICAL", "QUICK_RELEASE"];

const BUCKLE_LABELS: Record<BuckleType, Record<"he" | "ar" | "en", string>> = {
  REGULAR: { he: "סגירה רגילה", ar: "إغلاق عادي", en: "Regular Buckle" },
  TACTICAL: { he: "סגירה טקטית", ar: "إغلاق تكتيكي", en: "Tactical Buckle" },
  QUICK_RELEASE: { he: "סגירה מהירה", ar: "إغلاق سريع", en: "Quick Release Buckle" },
};

const HAND_LABELS: Record<HandSide, Record<"he" | "ar" | "en", string>> = {
  RIGHT: { he: "יד ימין", ar: "يمين", en: "Right Hand" },
  LEFT: { he: "יד שמאל", ar: "شمال", en: "Left Hand" },
};

const TITLES = {
  chooseSize: { he: "בחר מידה", ar: "اختر المقاس", en: "Choose size" },
  chooseBuckle: { he: "בחר סוג סגירה", ar: "اختر نوع الإغلاق", en: "Choose buckle type" },
  chooseSide: { he: "בחר צד", ar: "اختر الجهة", en: "Choose side" },
  sizeTable: { he: "טבלת מידות", ar: "جدول المقاسات", en: "Size chart" },
  beltSize: { he: "מידת חגורה", ar: "مقاس الحزام", en: "Belt size" },
  pantsSize: { he: "מידת מכנס משטרתי", ar: "مقاس البنطال", en: "Police pants size" },
  lengthCm: { he: "אורך חגורה בס״מ", ar: "طول الحزام (سم)", en: "Belt length (cm)" },
  lengthInch: { he: "אורך חגורה באינץ׳", ar: "طول الحزام (بوصة)", en: "Belt length (in)" },
};

export function BeltProductOptions({
  selectedSizeKey,
  buckleType,
  onSizeChange,
  onBuckleChange,
}: {
  selectedSizeKey: string | null;
  buckleType: BuckleType | null;
  onSizeChange: (opts: BeltSelectedOptions | null) => void;
  onBuckleChange: (type: BuckleType | null) => void;
}) {
  const { lang } = useStoreI18n();
  const l = lang as "he" | "ar" | "en";

  const handleSize = (key: string) => {
    const row = beltRowFromKey(key);
    if (!row) return;
    onSizeChange({
      type: "BELT",
      beltSize: row.beltSize,
      policePantsSize: row.policePantsSize,
      beltLengthCm: row.beltLengthCm,
      beltLengthInch: row.beltLengthInch,
      buckleType: buckleType ?? "REGULAR",
    });
  };

  const handleBuckle = (type: BuckleType) => {
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
    <div className="mt-6 space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-zinc-100">{TITLES.chooseSize[l]}</h3>
        <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
          {BELT_SIZE_TABLE.map((row) => {
            const key = beltRowKey(row);
            const selected = selectedSizeKey === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleSize(key)}
                className={`w-full rounded-xl border px-3 py-2.5 text-start text-sm transition ${
                  selected
                    ? "border-hagor-gold bg-hagor-gold/10 text-white shadow-[0_0_0_1px_rgba(200,146,17,0.35)]"
                    : "border-zinc-700 bg-zinc-950/40 text-zinc-200 hover:border-hagor-gold/50"
                }`}
              >
                {formatBeltSizeCard(row, lang)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <p className="border-b border-zinc-800 bg-zinc-900/80 px-3 py-2 text-xs font-semibold text-zinc-300">
          {TITLES.sizeTable[l]}
        </p>
        <table className="w-full min-w-[420px] text-xs">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400">
              <th className="px-3 py-2 text-start">{TITLES.beltSize[l]}</th>
              <th className="px-3 py-2 text-start">{TITLES.pantsSize[l]}</th>
              <th className="px-3 py-2 text-start">{TITLES.lengthCm[l]}</th>
              <th className="px-3 py-2 text-start">{TITLES.lengthInch[l]}</th>
            </tr>
          </thead>
          <tbody>
            {BELT_SIZE_TABLE.map((row) => (
              <tr key={beltRowKey(row)} className="border-b border-zinc-800/70 text-zinc-300">
                <td className="px-3 py-1.5">{row.beltSize}</td>
                <td className="px-3 py-1.5">{row.policePantsSize}</td>
                <td className="px-3 py-1.5">{row.beltLengthCm}</td>
                <td className="px-3 py-1.5">{row.beltLengthInch}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedSizeKey ? (
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">{TITLES.chooseBuckle[l]}</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {BUCKLE_OPTIONS.map((type) => {
              const selected = buckleType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleBuckle(type)}
                  className={`rounded-xl border px-3 py-3 text-sm font-medium transition ${
                    selected
                      ? "border-hagor-gold bg-zinc-900 text-white shadow-[0_0_0_1px_rgba(200,146,17,0.35)]"
                      : "border-zinc-700 bg-zinc-950/40 text-zinc-200 hover:border-hagor-gold/50"
                  }`}
                >
                  {BUCKLE_LABELS[type][l]}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function HolsterProductOptions({
  handSide,
  onChange,
}: {
  handSide: HandSide | null;
  onChange: (opts: HolsterSelectedOptions | null) => void;
}) {
  const { lang } = useStoreI18n();
  const l = lang as "he" | "ar" | "en";
  const sides: HandSide[] = ["RIGHT", "LEFT"];

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-zinc-100">{TITLES.chooseSide[l]}</h3>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {sides.map((side) => {
          const selected = handSide === side;
          return (
            <button
              key={side}
              type="button"
              onClick={() => onChange({ type: "HOLSTER", handSide: side })}
              className={`flex flex-col items-center gap-2 rounded-xl border px-4 py-5 text-sm font-semibold transition ${
                selected
                  ? "border-hagor-gold bg-zinc-900 text-white shadow-[0_0_0_1px_rgba(200,146,17,0.35)]"
                  : "border-zinc-700 bg-zinc-950/40 text-zinc-200 hover:border-hagor-gold/50"
              }`}
            >
              <span className="hagour-icon-bg">
                <HagourHandIcon side={side} />
              </span>
              {HAND_LABELS[side][l]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

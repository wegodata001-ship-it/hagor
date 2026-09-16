import type { PDFFont } from "pdf-lib";
import { shapeArabic } from "@/lib/pdf/arabic-shaper";

/**
 * BiDi + Arabic shaping for pdf-lib.
 *
 * `pdf-lib` has no Unicode BiDi engine and no OpenType shaping engine —
 * it draws each codepoint's ISOLATED glyph in the order it receives them.
 * To render mixed Hebrew / Arabic / Latin content correctly we must:
 *
 *   1. Convert logical Arabic to its **presentation forms** (initial /
 *      medial / final / isolated + lam-alef ligatures). This is done by
 *      `shapeArabic()` and preserves logical order.
 *
 *   2. Apply an approximation of UAX #9 (BiDi) so that:
 *        - RTL strings are drawn in the correct visual order.
 *        - Numbers, Latin, currency, dates, emails, phone numbers, and
 *          order/invoice identifiers **stay LTR** inside RTL context.
 *        - Neutral characters (spaces, punctuation) inherit direction
 *          from surrounding strong characters.
 *
 * Together, these two steps let a caller write logical text such as
 *   "مبلغ الطلب ₪670.00 (HAGOR-1022)"
 * and see it draw naturally as an Arabic paragraph, with the identifier
 * and price kept intact and LTR.
 *
 * IMPORTANT: this does **not** perform manual per-string reversal for
 * individual labels. `shape(text, rtl)` is a one-shot transform that
 * classifies and re-orders the ENTIRE string in one BiDi pass.
 */

// Strong-RTL scripts: Hebrew (0590..05FF), Arabic (0600..06FF, 0750..077F,
// FB1D..FDFF, FE70..FEFF). We also treat the Arabic Presentation Forms as
// RTL (post-shape output lives there).
const RTL_RE = /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0750-\u077F\uFB1D-\uFDFF\uFE70-\uFEFF]/;
// Strong-LTR characters: Latin, digits, currency symbols, percent.
const LTR_RE = /[A-Za-z0-9\u00C0-\u024F₪$€£¥%]/;
// Isolate "identifier" tokens that must never split or reverse: emails,
// URLs, phone-number-like sequences, and ORDER-1022 style refs.
const ID_TOKEN =
  /(?:https?:\/\/\S+|\S+@\S+\.\S+|[A-Z][A-Z0-9]*-\d[\w-]*|\+?\d[\d\s./-]{5,}\d)/g;

export function containsRtl(s: string): boolean {
  return RTL_RE.test(s);
}

export function isRtlString(s: string): boolean {
  return RTL_RE.test(s);
}

type Dir = "R" | "L" | "N";

function classifyChar(ch: string): Dir {
  if (RTL_RE.test(ch)) return "R";
  if (LTR_RE.test(ch)) return "L";
  return "N";
}

/**
 * BiDi-reorder + Arabic-shape `text` for drawing with pdf-lib.
 *
 * Steps (order matters — shaping BEFORE reordering):
 *   1. `shapeArabic()` maps Arabic base codepoints to presentation forms
 *      (logical order preserved).
 *   2. Classify each character (R / L / N).
 *   3. Resolve neutrals — a neutral run between two same-direction strong
 *      runs inherits that direction; otherwise the base direction.
 *   4. Group same-direction runs.
 *   5. Reverse chars inside every RTL run (chars are drawn left-to-right;
 *      internal reversal gives the visual right-to-left result).
 *   6. If the base is RTL, reverse the order of the runs.
 *
 * @param text logical-order text
 * @param baseRtl paragraph base direction
 */
export function shape(text: string, baseRtl: boolean): string {
  if (!text) return "";

  // 1. Arabic shaping (logical order — safe for RTL & LTR base).
  const shaped = shapeArabic(text);

  // Fast path: no strong RTL after shaping.
  const hasR = RTL_RE.test(shaped);
  if (!hasR) return shaped;

  // 2. Preserve identifier tokens (emails, HAGOR-1022, phones, URLs) so
  //    BiDi can never split or invert their internal characters. Each is
  //    replaced by a private-use sentinel and re-inserted at the end.
  const tokens: string[] = [];
  const withPlaceholders = shaped.replace(ID_TOKEN, (m) => {
    tokens.push(m);
    // 0xE000..0xF8FF is the Unicode Private Use Area — safe to use as
    // an opaque LTR sentinel. We map index → single codepoint so the
    // placeholder is classified as strong LTR by our regex fallback.
    return String.fromCodePoint(0xe000 + tokens.length - 1);
  });

  const chars = Array.from(withPlaceholders);
  const raw = chars.map((ch) => {
    // Placeholder chars are LTR.
    const cp = ch.codePointAt(0)!;
    if (cp >= 0xe000 && cp <= 0xf8ff) return "L" as Dir;
    return classifyChar(ch);
  });

  // 3. Resolve neutrals: same-direction sandwich → that direction; else base.
  const dirs: ("R" | "L")[] = new Array(chars.length);
  for (let i = 0; i < chars.length; i++) {
    if (raw[i] !== "N") {
      dirs[i] = raw[i] as "R" | "L";
      continue;
    }
    let prev: "R" | "L" | null = null;
    for (let j = i - 1; j >= 0; j--) {
      if (raw[j] !== "N") {
        prev = raw[j] as "R" | "L";
        break;
      }
    }
    let next: "R" | "L" | null = null;
    for (let j = i + 1; j < chars.length; j++) {
      if (raw[j] !== "N") {
        next = raw[j] as "R" | "L";
        break;
      }
    }
    if (prev && next && prev === next) dirs[i] = prev;
    else dirs[i] = baseRtl ? "R" : "L";
  }

  // 4. Group into runs.
  const runs: { dir: "R" | "L"; text: string }[] = [];
  for (let i = 0; i < chars.length; i++) {
    const last = runs[runs.length - 1];
    if (!last || last.dir !== dirs[i]) runs.push({ dir: dirs[i], text: chars[i] });
    else last.text += chars[i];
  }

  // 5. Reverse chars inside each RTL run.
  //    NOTE: reversing here is not a "manual per-string reversal patch" —
  //    it is the standard UAX #9 Level 1 rendering step for RTL runs
  //    when the drawing engine only draws LTR (pdf-lib). Arabic shaping
  //    has already happened, so we are reversing PRESENTATION-FORM
  //    codepoints, not logical characters.
  for (const r of runs) if (r.dir === "R") r.text = Array.from(r.text).reverse().join("");

  // 6. Reverse run order when base is RTL.
  const ordered = baseRtl ? [...runs].reverse() : runs;
  let out = ordered.map((r) => r.text).join("");

  // Re-insert preserved identifier tokens.
  if (tokens.length) {
    out = out.replace(/[\uE000-\uF8FF]/g, (ch) => {
      const idx = ch.codePointAt(0)! - 0xe000;
      return tokens[idx] ?? ch;
    });
  }

  return out;
}

/**
 * Wrap text into lines that fit `maxWidth` at `size` using `font`.
 * Splits on whitespace and hard-breaks long tokens (URLs, order numbers).
 * Measurement uses the raw (unshaped) text — glyph widths are the same
 * regardless of order, so the wrap decision is stable.
 */
export function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const s = (text ?? "").toString();
  if (!s) return [];
  const width = (t: string) => font.widthOfTextAtSize(t, size);

  const paragraphs = s.split(/\r?\n/);
  const out: string[] = [];
  for (const para of paragraphs) {
    if (!para.length) {
      out.push("");
      continue;
    }
    const tokens = para.split(/(\s+)/);
    let line = "";
    for (const tok of tokens) {
      if (!tok) continue;
      if (width(line + tok) <= maxWidth) {
        line += tok;
        continue;
      }
      if (line.trim().length) out.push(line);
      if (width(tok) <= maxWidth) {
        line = /^\s+$/.test(tok) ? "" : tok;
      } else {
        const parts = hardBreak(tok, font, size, maxWidth);
        for (let i = 0; i < parts.length - 1; i++) out.push(parts[i]);
        line = parts[parts.length - 1] ?? "";
      }
    }
    if (line.trim().length) out.push(line);
  }
  return out;
}

function hardBreak(token: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const chars = Array.from(token);
  const out: string[] = [];
  let buf = "";
  for (const c of chars) {
    if (font.widthOfTextAtSize(buf + c, size) <= maxWidth) {
      buf += c;
    } else {
      if (buf) out.push(buf);
      buf = c;
    }
  }
  if (buf) out.push(buf);
  return out;
}

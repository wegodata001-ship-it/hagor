import type { PDFFont } from "pdf-lib";

/**
 * Lightweight BiDi shaping for pdf-lib.
 *
 * pdf-lib has no Unicode BiDi engine — it draws glyphs left-to-right in the
 * order given. This module reorders characters so that mixed Hebrew/Arabic
 * and English/numeric text displays correctly:
 *
 *   "מספר הזמנה: HAGOR-1021"  (logical, RTL base)
 *   →  "HAGOR-1021 :הנמזה רפסמ"  (visual, drawn L→R)
 *
 * Rules implemented (approximation of UAX #9 Levels 0/1):
 *   1. Classify each character as R (RTL), L (LTR/digit/currency), or N (neutral).
 *   2. Resolve neutrals: a neutral run between two same-direction strong runs
 *      inherits that direction; otherwise it inherits the base direction.
 *   3. Group consecutive same-direction chars into runs.
 *   4. Reverse the char order within every RTL run.
 *   5. If base direction is RTL, reverse the order of the runs.
 *
 * Currency symbols (₪ $ € £ ¥) are classified as LTR so "₪1.00" and "$5"
 * never get split from their number and never appear reversed.
 */

const RTL_RE = /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0750-\u077F\uFB1D-\uFDFF\uFE70-\uFEFF]/;
const LTR_RE = /[A-Za-z0-9\u00C0-\u024F₪$€£¥%]/;

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
 * Bidi-shape text for pdf-lib. Handles mixed HE/AR + Latin/numbers/currency.
 *
 * @param text logical-order text
 * @param baseRtl paragraph base direction
 */
export function shape(text: string, baseRtl: boolean): string {
  if (!text) return "";

  const hasR = RTL_RE.test(text);
  // Fast path: nothing to reorder.
  if (!hasR) return text;

  const chars = Array.from(text);
  const raw = chars.map(classifyChar);

  // Resolve neutrals: same-direction sandwich → that direction; else base.
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

  // Group into runs.
  const runs: { dir: "R" | "L"; text: string }[] = [];
  for (let i = 0; i < chars.length; i++) {
    const last = runs[runs.length - 1];
    if (!last || last.dir !== dirs[i]) runs.push({ dir: dirs[i], text: chars[i] });
    else last.text += chars[i];
  }

  // Reverse chars inside each RTL run.
  for (const r of runs) if (r.dir === "R") r.text = Array.from(r.text).reverse().join("");

  // Reverse run order when base is RTL.
  const ordered = baseRtl ? [...runs].reverse() : runs;
  return ordered.map((r) => r.text).join("");
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

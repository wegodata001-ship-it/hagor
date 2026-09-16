/**
 * Arabic shaper for pdf-lib.
 *
 * WHY THIS EXISTS
 * ---------------
 * `pdf-lib` draws each Unicode codepoint's ISOLATED glyph — it has no
 * OpenType shaping engine, so `GSUB`/`GPOS` tables are ignored. When we
 * pass logical Arabic codepoints (U+0600..U+06FF) straight to the drawing
 * layer, the output looks disconnected: every letter is drawn in its
 * standalone form even in the middle of a word.
 *
 * This module converts logical Arabic text into its **presentation form**
 * codepoints (U+FE70..U+FEFF for basic + Extended-B and lam-alef ligatures)
 * based on the joining context of each character, so `pdf-lib` — which
 * knows nothing about shaping — draws the right glyph.
 *
 * It also handles:
 *   • Non-joining letters (alef/dal/reh/waw family).
 *   • Combining marks / harakat (transparent for joining, kept with base).
 *   • lam+alef → ligature (isolated FEFB / final FEFC and their variants).
 *
 * IT DOES NOT:
 *   • Do BiDi reordering — that is `bidi.ts`'s job. This module preserves
 *     logical character order.
 *   • Touch Hebrew text — Hebrew has no joining behaviour.
 *
 * Result: `shapeArabic("تأكيد الطلب")` yields the same glyph sequence a
 * proper OpenType shaper would produce. When later reordered by our BiDi
 * layer, the sentence renders naturally connected on the page.
 */

// ─── Joining classes ────────────────────────────────────────────────────────
//
// `D` = dual joining  (joins on both sides — most Arabic letters)
// `R` = right joining (only joins with the previous letter — alef/dal/reh…)
// `L` = left joining  (rare — none in Modern Standard Arabic base letters)
// `U` = non-joining   (punctuation, standalone symbols)
// `T` = transparent   (combining marks; joining passes through them)
type JoinClass = "D" | "R" | "L" | "U" | "T";

// [isolated, final, initial, medial] — presentation-form codepoints.
// A `0` entry means "shape not defined; use the isolated form".
type ShapeTuple = [number, number, number, number];

// Data table for the Arabic base block (U+0600..U+06FF).
// Every entry lists joining class + the four presentation forms.
// Sources: Unicode Standard Annex #24 (script) and Standard Annex #14 tables.
const SHAPES: Record<number, { j: JoinClass; s: ShapeTuple }> = {
  // Hamza on its own – non-joining.
  0x0621: { j: "U", s: [0xfe80, 0, 0, 0] },
  // Alef with madda
  0x0622: { j: "R", s: [0xfe81, 0xfe82, 0, 0] },
  // Alef with hamza above
  0x0623: { j: "R", s: [0xfe83, 0xfe84, 0, 0] },
  // Waw with hamza above
  0x0624: { j: "R", s: [0xfe85, 0xfe86, 0, 0] },
  // Alef with hamza below
  0x0625: { j: "R", s: [0xfe87, 0xfe88, 0, 0] },
  // Yeh with hamza above
  0x0626: { j: "D", s: [0xfe89, 0xfe8a, 0xfe8b, 0xfe8c] },
  // Alef
  0x0627: { j: "R", s: [0xfe8d, 0xfe8e, 0, 0] },
  // Beh
  0x0628: { j: "D", s: [0xfe8f, 0xfe90, 0xfe91, 0xfe92] },
  // Teh marbuta
  0x0629: { j: "R", s: [0xfe93, 0xfe94, 0, 0] },
  // Teh
  0x062a: { j: "D", s: [0xfe95, 0xfe96, 0xfe97, 0xfe98] },
  // Theh
  0x062b: { j: "D", s: [0xfe99, 0xfe9a, 0xfe9b, 0xfe9c] },
  // Jeem
  0x062c: { j: "D", s: [0xfe9d, 0xfe9e, 0xfe9f, 0xfea0] },
  // Hah
  0x062d: { j: "D", s: [0xfea1, 0xfea2, 0xfea3, 0xfea4] },
  // Khah
  0x062e: { j: "D", s: [0xfea5, 0xfea6, 0xfea7, 0xfea8] },
  // Dal
  0x062f: { j: "R", s: [0xfea9, 0xfeaa, 0, 0] },
  // Thal
  0x0630: { j: "R", s: [0xfeab, 0xfeac, 0, 0] },
  // Reh
  0x0631: { j: "R", s: [0xfead, 0xfeae, 0, 0] },
  // Zain
  0x0632: { j: "R", s: [0xfeaf, 0xfeb0, 0, 0] },
  // Seen
  0x0633: { j: "D", s: [0xfeb1, 0xfeb2, 0xfeb3, 0xfeb4] },
  // Sheen
  0x0634: { j: "D", s: [0xfeb5, 0xfeb6, 0xfeb7, 0xfeb8] },
  // Sad
  0x0635: { j: "D", s: [0xfeb9, 0xfeba, 0xfebb, 0xfebc] },
  // Dad
  0x0636: { j: "D", s: [0xfebd, 0xfebe, 0xfebf, 0xfec0] },
  // Tah
  0x0637: { j: "D", s: [0xfec1, 0xfec2, 0xfec3, 0xfec4] },
  // Zah
  0x0638: { j: "D", s: [0xfec5, 0xfec6, 0xfec7, 0xfec8] },
  // Ain
  0x0639: { j: "D", s: [0xfec9, 0xfeca, 0xfecb, 0xfecc] },
  // Ghain
  0x063a: { j: "D", s: [0xfecd, 0xfece, 0xfecf, 0xfed0] },
  // Feh (with a two-form Persian variant)
  0x0641: { j: "D", s: [0xfed1, 0xfed2, 0xfed3, 0xfed4] },
  // Qaf
  0x0642: { j: "D", s: [0xfed5, 0xfed6, 0xfed7, 0xfed8] },
  // Kaf
  0x0643: { j: "D", s: [0xfed9, 0xfeda, 0xfedb, 0xfedc] },
  // Lam
  0x0644: { j: "D", s: [0xfedd, 0xfede, 0xfedf, 0xfee0] },
  // Meem
  0x0645: { j: "D", s: [0xfee1, 0xfee2, 0xfee3, 0xfee4] },
  // Noon
  0x0646: { j: "D", s: [0xfee5, 0xfee6, 0xfee7, 0xfee8] },
  // Heh
  0x0647: { j: "D", s: [0xfee9, 0xfeea, 0xfeeb, 0xfeec] },
  // Waw
  0x0648: { j: "R", s: [0xfeed, 0xfeee, 0, 0] },
  // Alef maqsura
  0x0649: { j: "D", s: [0xfeef, 0xfef0, 0xfbe8, 0xfbe9] },
  // Yeh
  0x064a: { j: "D", s: [0xfef1, 0xfef2, 0xfef3, 0xfef4] },
  // Tatweel — dual-joining pass-through.
  0x0640: { j: "D", s: [0x0640, 0x0640, 0x0640, 0x0640] },
  // Peh (Persian/Urdu) — dual joining.
  0x067e: { j: "D", s: [0xfb56, 0xfb57, 0xfb58, 0xfb59] },
  // Tcheh (Persian).
  0x0686: { j: "D", s: [0xfb7a, 0xfb7b, 0xfb7c, 0xfb7d] },
  // Jeh (Persian) — right-joining.
  0x0698: { j: "R", s: [0xfb8a, 0xfb8b, 0, 0] },
  // Keheh (Persian).
  0x06a9: { j: "D", s: [0xfb8e, 0xfb8f, 0xfb90, 0xfb91] },
  // Gaf (Persian).
  0x06af: { j: "D", s: [0xfb92, 0xfb93, 0xfb94, 0xfb95] },
  // Farsi Yeh.
  0x06cc: { j: "D", s: [0xfbfc, 0xfbfd, 0xfbfe, 0xfbff] },
};

/** Arabic combining marks (transparent for joining). */
function isTransparent(cp: number): boolean {
  // Diacritics + shaddas + tanwin + superscript alef, etc.
  if (cp >= 0x064b && cp <= 0x065f) return true;
  if (cp === 0x0670) return true; // superscript alef
  if (cp >= 0x06d6 && cp <= 0x06ed) return true;
  return false;
}

/** Lam-alef ligature — (lam followed by an alef variant). */
const LAM_ALEF: Record<number, [number, number]> = {
  // isolated FEFB / final FEFC — lam + alef
  0x0627: [0xfefb, 0xfefc],
  // alef with madda
  0x0622: [0xfef5, 0xfef6],
  // alef with hamza above
  0x0623: [0xfef7, 0xfef8],
  // alef with hamza below
  0x0625: [0xfef9, 0xfefa],
};

function joinClassOf(cp: number): JoinClass {
  if (isTransparent(cp)) return "T";
  const entry = SHAPES[cp];
  return entry?.j ?? "U";
}

/**
 * Convert one word's worth of logical Arabic into its presentation-form
 * sequence. Preserves order (logical → logical); only glyphs change and
 * lam-alef pairs are merged into a single ligature codepoint.
 */
export function shapeArabic(input: string): string {
  if (!input) return input;
  // Fast path: no Arabic block characters at all.
  let hasArabic = false;
  for (const ch of input) {
    const cp = ch.codePointAt(0)!;
    if ((cp >= 0x0600 && cp <= 0x06ff) || (cp >= 0x0750 && cp <= 0x077f)) {
      hasArabic = true;
      break;
    }
  }
  if (!hasArabic) return input;

  const cps: number[] = [];
  for (const ch of input) cps.push(ch.codePointAt(0)!);

  const jc = cps.map(joinClassOf);

  // Walk each character; look at "previous non-transparent" and
  // "next non-transparent" joining classes to decide the shape.
  const out: number[] = [];

  for (let i = 0; i < cps.length; i++) {
    const cp = cps[i];
    const cls = jc[i];

    // Non-Arabic or transparent → pass through.
    if (cls === "T" || !SHAPES[cp]) {
      out.push(cp);
      continue;
    }

    // Lam + alef ligature detection.
    if (cp === 0x0644 && i + 1 < cps.length) {
      // Skip transparents to find the next base.
      let k = i + 1;
      while (k < cps.length && jc[k] === "T") k++;
      const nextCp = k < cps.length ? cps[k] : -1;
      const ligMap = LAM_ALEF[nextCp];
      if (ligMap) {
        // Determine whether the lam has a preceding joining letter.
        let p = i - 1;
        while (p >= 0 && jc[p] === "T") p--;
        const prevCls = p >= 0 ? jc[p] : null;
        // A previous letter joins to the left (toward us) if it is
        // dual-joining or left-joining. (ZWJ/Join-Causing is not in our
        // shape table, so it never appears here.)
        const canJoinRight = prevCls === "D" || prevCls === "L";
        const ligCp = canJoinRight ? ligMap[1] /* final */ : ligMap[0] /* isolated */;
        out.push(ligCp);
        // Keep any transparents that appeared between lam and alef.
        for (let t = i + 1; t < k; t++) out.push(cps[t]);
        i = k; // consume alef
        continue;
      }
    }

    // Standard shape selection.
    let prev = i - 1;
    while (prev >= 0 && jc[prev] === "T") prev--;
    let next = i + 1;
    while (next < cps.length && jc[next] === "T") next++;

    const prevCls: JoinClass | null = prev >= 0 ? jc[prev] : null;
    const nextCls: JoinClass | null = next < cps.length ? jc[next] : null;

    // Does the previous letter allow joining on its left side?
    //   D / L can. R / U cannot (R only joins on its right side).
    const joinsRight = prevCls === "D" || prevCls === "L";

    // Does the next letter allow joining on its right side?
    //   D / R can. L / U cannot.
    const joinsLeft = nextCls === "D" || nextCls === "R";

    // Only shape if the current letter itself joins on that side.
    const cur = SHAPES[cp];
    const meJoinsRight = cur.j === "D" || cur.j === "R" || cur.j === "L";
    const meJoinsLeft = cur.j === "D" || cur.j === "L";

    const wantR = joinsRight && meJoinsRight;
    const wantL = joinsLeft && meJoinsLeft;

    let form: 0 | 1 | 2 | 3;
    if (wantR && wantL) form = 3; // medial
    else if (wantL) form = 2; // initial
    else if (wantR) form = 1; // final
    else form = 0; // isolated

    const glyph = cur.s[form] || cur.s[0];
    out.push(glyph);
  }

  return String.fromCodePoint(...out);
}

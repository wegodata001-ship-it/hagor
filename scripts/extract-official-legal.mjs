/**
 * One-shot extractor: Word XML → official HAGOUR legal HTML.
 * Does not rewrite wording. Reconstructs Word auto-numbering as visible text.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const xml = readFileSync(join(root, ".tmp-legal-docx", "word", "document.xml"), "utf8");

const DOC_TITLES = [
  "תקנון האתר ותנאי שימוש",
  "מדיניות פרטיות ועוגיות",
  "הצהרת נגישות",
  "מדיניות ביטול עסקה",
  "מדיניות החזרות והחלפות",
  "מדיניות משלוחים",
];

const SLUGS = [
  "terms",
  "privacy",
  "accessibility",
  "cancellation-policy",
  "returns-policy",
  "shipping-policy",
];

function decodeXml(s) {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function linkify(escaped) {
  return escaped
    .replace(
      /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
      '<a href="mailto:$1">$1</a>',
    )
    .replace(
      /(www\.hagor\.co\.il)/g,
      '<a href="https://www.hagor.co.il" rel="noopener noreferrer">$1</a>',
    );
}

function attr(block, name) {
  const m = block.match(new RegExp(`${name}="([^"]*)"`));
  return m ? m[1] : null;
}

function paraText(p) {
  const parts = [];
  const re = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g;
  let m;
  while ((m = re.exec(p))) parts.push(decodeXml(m[1]));
  return parts.join("");
}

function isBold(p) {
  return /<w:b\/>|<w:bCs\/>|<w:b w:val="true"|<w:bCs w:val="true"/.test(p) && !/<w:b w:val="false"/.test(p);
}

function isUnderline(p) {
  return /<w:u w:val="single"/.test(p);
}

function align(p) {
  const m = p.match(/<w:jc w:val="([^"]+)"/);
  return m ? m[1] : "start";
}

function fontSize(p) {
  const m = p.match(/<w:sz w:val="(\d+)"/);
  return m ? Number(m[1]) : 24;
}

function isList(p) {
  return /<w:numPr>/.test(p);
}

function listLevel(p) {
  const m = p.match(/<w:ilvl w:val="(\d+)"/);
  return m ? Number(m[1]) : 0;
}

function isPageBreakOnly(p) {
  return /<w:br w:type="page"/.test(p) && paraText(p).trim() === "";
}

const paraRe = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/g;
const paragraphs = xml.match(paraRe) ?? [];

const counters = { 0: 0, 1: 0 };
const rows = [];

for (const p of paragraphs) {
  if (isPageBreakOnly(p)) {
    rows.push({ kind: "break" });
    continue;
  }
  const text = paraText(p);
  if (!text.trim()) continue;

  if (isList(p)) {
    const lvl = listLevel(p);
    if (lvl === 0) {
      counters[0] += 1;
      counters[1] = 0;
    } else {
      if (counters[0] === 0) counters[0] = 1;
      counters[1] += 1;
    }
    const num = lvl === 0 ? `${counters[0]}.` : `${counters[0]}.${counters[1]}.`;
    rows.push({ kind: "item", level: lvl, num, text });
    continue;
  }

  const sz = fontSize(p);
  const bold = isBold(p);
  const und = isUnderline(p);
  const jc = align(p);

  if (jc === "center" && bold && sz >= 30 && DOC_TITLES.includes(text.trim())) {
    rows.push({ kind: "docTitle", text: text.trim() });
    continue;
  }
  if (jc === "center" && bold && sz >= 28 && text.trim() === "hagor by wael") {
    rows.push({ kind: "brand", text: text.trim() });
    continue;
  }
  if (jc === "center" && bold && /בריזינטים/.test(text)) {
    rows.push({ kind: "company", text: text.trim() });
    continue;
  }
  if (jc === "center" && text.trim().startsWith("ח.פ.")) {
    rows.push({ kind: "hp", text: text.trim() });
    continue;
  }
  if (jc === "center" && text.trim().startsWith("עודכן לאחרונה")) {
    rows.push({ kind: "updated", text: text.trim() });
    continue;
  }
  if (bold && und && /^\d+\.\s/.test(text.trim())) {
    rows.push({ kind: "heading", text: text.trim() });
    continue;
  }

  rows.push({ kind: "p", text, bold });
}

const docs = [];
let current = null;
let headingIndex = 0;

function flush() {
  if (current) docs.push(current);
}

for (const row of rows) {
  if (row.kind === "brand") {
    if (current && current.title) flush();
    current = {
      brand: row.text,
      company: "",
      hp: "",
      updated: "",
      title: "",
      body: [],
    };
    headingIndex = 0;
    continue;
  }
  if (!current) continue;
  if (row.kind === "company") current.company = row.text;
  else if (row.kind === "hp") current.hp = row.text;
  else if (row.kind === "updated") current.updated = row.text;
  else if (row.kind === "docTitle") current.title = row.text;
  else if (row.kind === "break") continue;
  else current.body.push(row);
}
flush();

if (docs.length !== 6) {
  console.error("Expected 6 documents, got", docs.length, docs.map((d) => d.title));
  process.exit(1);
}

function renderBody(body) {
  const out = [];
  for (const row of body) {
    if (row.kind === "heading") {
      headingIndex += 1;
      const id = `sec-${headingIndex}`;
      out.push(`<h2 id="${id}">${linkify(escapeHtml(row.text))}</h2>`);
    } else if (row.kind === "item") {
      const cls = row.level > 0 ? "legal-item legal-item--sub" : "legal-item";
      out.push(
        `<p class="${cls}"><span class="legal-num">${escapeHtml(row.num)}</span> ${linkify(escapeHtml(row.text))}</p>`,
      );
    } else if (row.kind === "p") {
      const inner = row.bold
        ? `<strong>${linkify(escapeHtml(row.text))}</strong>`
        : linkify(escapeHtml(row.text));
      out.push(`<p>${inner}</p>`);
    }
  }
  return out.join("\n");
}

const official = docs.map((doc, i) => {
  headingIndex = 0;
  const body = renderBody(doc.body);
  const html = [
    `<header class="legal-masthead">`,
    `  <p class="legal-brand">${escapeHtml(doc.brand)}</p>`,
    `  <p class="legal-company">${escapeHtml(doc.company)}</p>`,
    `  <p class="legal-hp">${escapeHtml(doc.hp)}</p>`,
    `  <p class="legal-updated">${escapeHtml(doc.updated)}</p>`,
    `  <h1>${escapeHtml(doc.title)}</h1>`,
    `</header>`,
    body,
  ].join("\n");

  const sourceText = [
    doc.brand,
    doc.company,
    doc.hp,
    doc.updated,
    doc.title,
    ...doc.body.map((r) =>
      r.kind === "item" ? `${r.num} ${r.text}` : r.text,
    ),
  ].join("\n");

  return {
    slug: SLUGS[i],
    title: doc.title,
    brand: doc.brand,
    company: doc.company,
    hp: doc.hp,
    updated: doc.updated,
    html,
    sourceText,
  };
});

const numbered = rows.filter((r) => r.kind === "item");
console.log("Documents:", official.map((d) => `${d.slug} — ${d.title}`).join("\n"));
console.log("Numbered items:", numbered.length);
console.log("First 8:", numbered.slice(0, 8).map((r) => `${r.num} ${r.text.slice(0, 40)}`));
console.log("Last 8:", numbered.slice(-8).map((r) => `${r.num} ${r.text.slice(0, 40)}`));
console.log("Nested sample:", numbered.filter((r) => r.level > 0).slice(0, 6).map((r) => `${r.num} ${r.text.slice(0, 50)}`));

const ts = `/** Auto-extracted from the official HAGOUR Word document. Do not rewrite. */
export type OfficialLegalSlug =
  | "terms"
  | "privacy"
  | "accessibility"
  | "cancellation-policy"
  | "returns-policy"
  | "shipping-policy";

export type OfficialLegalDoc = {
  slug: OfficialLegalSlug;
  title: string;
  brand: string;
  company: string;
  hp: string;
  updated: string;
  html: string;
  sourceText: string;
};

export const OFFICIAL_LEGAL_DOCS: OfficialLegalDoc[] = ${JSON.stringify(official, null, 2)};

export const OFFICIAL_LEGAL_BY_SLUG = Object.fromEntries(
  OFFICIAL_LEGAL_DOCS.map((d) => [d.slug, d]),
) as Record<OfficialLegalSlug, OfficialLegalDoc>;

export const OFFICIAL_LEGAL_SLUGS = OFFICIAL_LEGAL_DOCS.map((d) => d.slug);
`;

writeFileSync(join(root, "src", "lib", "hagour-official-legal.ts"), ts, "utf8");
writeFileSync(
  join(root, "scripts", ".official-legal-verify.json"),
  JSON.stringify(
    official.map((d) => ({ slug: d.slug, title: d.title, chars: d.sourceText.length, htmlChars: d.html.length })),
    null,
    2,
  ),
  "utf8",
);
console.log("Wrote src/lib/hagour-official-legal.ts");

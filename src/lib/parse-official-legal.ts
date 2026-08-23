export type LegalTocItem = { id: string; title: string };

export type ParsedOfficialLegal = {
  brand: string;
  company: string;
  hp: string;
  updated: string;
  title: string;
  bodyHtml: string;
  toc: LegalTocItem[];
};

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&").trim();
}

function pickClass(html: string, className: string): string {
  const re = new RegExp(`<p class="${className}">([\\s\\S]*?)<\\/p>`, "i");
  const m = html.match(re);
  return m ? stripTags(m[1]) : "";
}

export function extractLegalToc(html: string): LegalTocItem[] {
  const toc: LegalTocItem[] = [];
  const re = /<h2\b([^>]*)>([\s\S]*?)<\/h2>/gi;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(html))) {
    i += 1;
    const attrs = m[1] ?? "";
    const idMatch = attrs.match(/\bid="([^"]+)"/i);
    const title = stripTags(m[2] ?? "");
    if (!title) continue;
    toc.push({ id: idMatch?.[1] || `sec-${i}`, title });
  }
  return toc;
}

export function parseOfficialLegalHtml(html: string): ParsedOfficialLegal {
  const masthead = html.match(/<header class="legal-masthead">([\s\S]*?)<\/header>/i);
  const mastheadHtml = masthead?.[1] ?? "";
  const titleMatch = (mastheadHtml || html).match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  const bodyHtml = masthead
    ? html.replace(masthead[0], "").trim()
    : html.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/i, "").trim();

  return {
    brand: pickClass(mastheadHtml, "legal-brand"),
    company: pickClass(mastheadHtml, "legal-company"),
    hp: pickClass(mastheadHtml, "legal-hp"),
    updated: pickClass(mastheadHtml, "legal-updated"),
    title: titleMatch ? stripTags(titleMatch[1]) : "",
    bodyHtml,
    toc: extractLegalToc(bodyHtml || html),
  };
}

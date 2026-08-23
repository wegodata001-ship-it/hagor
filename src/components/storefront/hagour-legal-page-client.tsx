"use client";

import { useCallback, useMemo, useState } from "react";
import { Scale } from "lucide-react";
import { parseOfficialLegalHtml } from "@/lib/parse-official-legal";

export function HagourLegalPageClient({ html }: { html: string }) {
  const parsed = useMemo(() => parseOfficialLegalHtml(html), [html]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    setActiveId(id);
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div dir="rtl" className="hagour-legal-page">
      <header className="hagour-legal-hero">
        <div className="hagour-legal-hero__inner">
          <span className="hagour-legal-hero__icon" aria-hidden>
            <Scale strokeWidth={1.6} />
          </span>
          <p className="hagour-legal-hero__brand">{parsed.brand || "hagor by wael"}</p>
          <h1 className="hagour-legal-hero__title">{parsed.title}</h1>
          <p className="hagour-legal-hero__company">{parsed.company}</p>
          <p className="hagour-legal-hero__meta">{parsed.hp}</p>
          <p className="hagour-legal-hero__meta">{parsed.updated}</p>
        </div>
      </header>

      <div className="hagour-legal-wrap">
        <div className="hagour-legal-layout">
          {parsed.toc.length > 0 ? (
            <aside className="hagour-legal-sidebar" aria-label="תוכן עניינים">
              <p className="hagour-legal-sidebar__label">תוכן עניינים</p>
              <nav className="hagour-legal-sidebar__nav">
                {parsed.toc.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => scrollTo(item.id)}
                    className={`hagour-legal-sidebar__link${activeId === item.id ? " is-active" : ""}`}
                  >
                    {item.title}
                  </button>
                ))}
              </nav>
            </aside>
          ) : null}

          <article className="hagour-legal-article">
            <div
              className="hagour-legal-prose"
              dangerouslySetInnerHTML={{ __html: parsed.bodyHtml || html }}
            />
          </article>
        </div>
      </div>
    </div>
  );
}

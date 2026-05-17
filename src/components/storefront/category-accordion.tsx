"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStoreI18n } from "@/components/storefront/store-i18n";
import { pickLocalized } from "@/lib/localized";

export type CategoryAccordionItem = {
  id: string;
  parentId: string | null;
  name_he: string;
  name_ar: string;
  name_en: string;
};

type Node = CategoryAccordionItem & { children: Node[] };

function buildTree(items: CategoryAccordionItem[]): Node[] {
  const byId = new Map<string, Node>();
  for (const c of items) byId.set(c.id, { ...c, children: [] });
  const roots: Node[] = [];
  for (const c of items) {
    const node = byId.get(c.id)!;
    if (!c.parentId) {
      roots.push(node);
      continue;
    }
    const parent = byId.get(c.parentId);
    if (!parent) {
      roots.push(node);
      continue;
    }
    parent.children.push(node);
  }
  const sort = (arr: Node[]) => {
    arr.sort((a, b) => (a.name_en ?? "").localeCompare(b.name_en ?? ""));
    for (const n of arr) sort(n.children);
  };
  sort(roots);
  return roots;
}

function parentKey(parentId: string | null) {
  return parentId ?? "__root__";
}

export function CategoryAccordion({
  categories,
  selectedId,
  onNavigate,
  hrefForId,
  className,
  variant = "light",
}: {
  categories: CategoryAccordionItem[];
  selectedId?: string;
  onNavigate?: () => void;
  hrefForId?: (id: string) => string;
  className?: string;
  /** Dark zinc styling for drawer / store sidebar (default is light cards). */
  variant?: "light" | "dark";
}) {
  const { lang, dir } = useStoreI18n();
  const tree = useMemo(() => buildTree(categories), [categories]);

  // Only one open category per parent (accordion behavior), supports deep nesting.
  const [openByParent, setOpenByParent] = useState<Record<string, string | null>>(() => {
    if (!selectedId) return {};
    const byId = new Map(categories.map((c) => [c.id, c] as const));
    const next: Record<string, string | null> = {};
    let cur = byId.get(selectedId) ?? null;
    while (cur?.parentId) {
      next[parentKey(cur.parentId)] = cur.id;
      cur = byId.get(cur.parentId) ?? null;
    }
    if (cur) next[parentKey(null)] = cur.id;
    return next;
  });

  const rowBase =
    "group flex w-full items-center justify-between gap-3 rounded-xl border text-sm transition select-none motion-safe:active:scale-[0.99]";

  const Arrow = ({ open }: { open: boolean }) => (
    <span
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition ${
        variant === "dark"
          ? open
            ? "rotate-90 border-orange-400/45 bg-hagor-gold/15 text-hagor-gold/80"
            : "border-zinc-600 bg-zinc-950 text-zinc-400 group-hover:border-zinc-500"
          : open
            ? "rotate-90 border-blue-300 bg-blue-50 text-blue-700"
            : "border-slate-200 bg-white text-zinc-400 group-hover:border-slate-300"
      }`}
      aria-hidden="true"
    >
      ▶
    </span>
  );

  const renderNode = (n: Node, level: number, parentId: string | null) => {
    const hasChildren = n.children.length > 0;
    const key = parentKey(parentId);
    const openId = openByParent[key] ?? null;
    const open = openId === n.id;
    const active = selectedId === n.id;
    const label = pickLocalized(n, "name", lang);
    const indent = level * 14;

    const padLevel =
      variant === "dark"
        ? `min-h-[44px] px-3 ${level > 0 ? "py-3 text-[15px] leading-snug" : "py-2.5 text-sm"}`
        : "px-3 py-2.5";

    const commonRowClass =
      `${rowBase} ${padLevel} ` +
      (variant === "dark"
        ? open
          ? "border-hagor-gold/40 bg-zinc-800/75 text-white shadow-sm"
          : "border-zinc-700/85 bg-zinc-900/55 text-zinc-100 hover:border-zinc-600 hover:bg-zinc-800/90"
        : open
          ? "border-blue-200 bg-blue-50/70 text-slate-900 shadow-sm"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50") +
      (active && variant === "dark"
        ? " !border-blue-500 !bg-blue-600 !text-white shadow-md shadow-blue-950/30 ring-0"
        : active
          ? " ring-2 ring-blue-200"
          : "");

    return (
      <div key={n.id} style={dir === "rtl" ? { paddingRight: indent } : { paddingLeft: indent }}>
        {hasChildren ? (
          <>
            <button
              type="button"
              className={commonRowClass}
              onClick={() =>
                setOpenByParent((prev) => ({
                  ...prev,
                  [key]: prev[key] === n.id ? null : n.id,
                }))
              }
              aria-expanded={open}
            >
              <span
                className={`truncate ${
                  open ? (variant === "dark" ? "font-semibold text-white" : "font-semibold text-slate-900") : ""
                }`}
              >
                {label}
              </span>
              <Arrow open={open} />
            </button>

            {open ? (
              <div className={variant === "dark" ? "mt-2 space-y-2" : "mt-1 space-y-1"}>
                {n.children.map((ch) => renderNode(ch, level + 1, n.id))}
              </div>
            ) : null}
          </>
        ) : (
          <Link
            href={hrefForId ? hrefForId(n.id) : `/products?cat=${encodeURIComponent(n.id)}`}
            onClick={onNavigate}
            className={commonRowClass}
          >
            <span
              className={`truncate ${active ? (variant === "dark" ? "font-semibold text-white" : "font-semibold text-slate-900") : ""}`}
            >
              {label}
            </span>
            <span className={variant === "dark" ? "text-zinc-500" : "text-slate-300"}>↩</span>
          </Link>
        )}
      </div>
    );
  };

  return <div className={className ?? "space-y-2"}>{tree.map((n) => renderNode(n, 0, null))}</div>;
}


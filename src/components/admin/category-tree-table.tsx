"use client";

import { Fragment, useMemo, useState } from "react";
import { AssetImg } from "@/components/asset-img";

export type AdminCategoryTreeRow = {
  id: string;
  parentId: string | null;
  name_he: string;
  name_ar: string;
  name_en: string;
  description_he: string | null;
  description_ar: string | null;
  description_en: string | null;
  imageUrl: string | null;
  active: boolean;
  sortOrder: number;
  optionProfile: string | null;
};

export function CategoryTreeTable({
  categories,
  onEdit,
  onDelete,
  onAddChild,
  accordionMode = true,
}: {
  categories: AdminCategoryTreeRow[];
  onEdit: (cat: AdminCategoryTreeRow) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
  accordionMode?: boolean; // if true, opening one parent closes others
}) {
  const mains = useMemo(
    () => categories.filter((c) => c.parentId == null).sort((a, b) => a.sortOrder - b.sortOrder),
    [categories],
  );
  const childrenByParent = useMemo(() => {
    const map = new Map<string, AdminCategoryTreeRow[]>();
    for (const c of categories) {
      if (!c.parentId) continue;
      const list = map.get(c.parentId) ?? [];
      list.push(c);
      map.set(c.parentId, list);
    }
    for (const [, arr] of map) arr.sort((a, b) => a.sortOrder - b.sortOrder);
    return map;
  }, [categories]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleCategory = (id: string) => {
    setExpanded((prev) => {
      const next = accordionMode ? {} : { ...prev };
      next[id] = !prev[id];
      return next;
    });
  };

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <th className="w-10 px-3 py-3" aria-label="expand" />
            <th className="px-4 py-3">Image</th>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Active</th>
            <th className="px-4 py-3">Order</th>
            <th className="px-4 py-3 text-end">Actions</th>
          </tr>
        </thead>
        <tbody>
          {mains.map((m) => {
            const kids = childrenByParent.get(m.id) ?? [];
            const isOpen = !!expanded[m.id];
            return (
              <Fragment key={m.id}>
                <tr className="border-b border-slate-100 bg-white">
                  <td className="px-3 py-2 align-middle">
                    {kids.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => toggleCategory(m.id)}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg border text-slate-600 transition hover:bg-slate-50 ${
                          isOpen ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white"
                        }`}
                        aria-expanded={isOpen}
                        aria-label={isOpen ? "collapse" : "expand"}
                      >
                        <span className={`transition-transform ${isOpen ? "rotate-90" : ""}`}>▶</span>
                      </button>
                    ) : (
                      <span className="inline-block h-9 w-9" />
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <div className="h-12 w-12 overflow-hidden rounded-md border bg-slate-50">
                      <AssetImg path={m.imageUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{m.name_he}</span>
                      {kids.length > 0 ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{kids.length}</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-2">{m.active ? "Yes" : "No"}</td>
                  <td className="px-4 py-2">{m.sortOrder}</td>
                  <td className="px-4 py-2 text-end">
                    <button type="button" className="text-blue-600 hover:underline" onClick={() => onEdit(m)}>
                      Edit
                    </button>
                    <span className="mx-2 text-slate-300">|</span>
                    <button type="button" className="text-slate-700 hover:underline" onClick={() => onAddChild(m.id)}>
                      Add subcategory
                    </button>
                    <span className="mx-2 text-slate-300">|</span>
                    <button type="button" className="text-red-600 hover:underline" onClick={() => onDelete(m.id)}>
                      Delete
                    </button>
                  </td>
                </tr>

                {isOpen
                  ? kids.map((c) => (
                      <tr key={c.id} className="border-b border-slate-100 bg-slate-50/50">
                        <td className="px-3 py-2 align-middle">
                          <div className="flex justify-center">
                            <div className="h-6 w-px bg-slate-200" />
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <div className="h-10 w-10 overflow-hidden rounded-md border bg-white">
                            <AssetImg path={c.imageUrl} alt="" className="h-full w-full object-cover" />
                          </div>
                        </td>
                        <td className="px-4 py-2 font-medium text-slate-700">
                          <div className="flex items-center gap-2">
                            <span className="inline-block h-2 w-2 rounded-full bg-slate-300" />
                            <span className="text-slate-900">{c.name_he}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2">{c.active ? "Yes" : "No"}</td>
                        <td className="px-4 py-2">{c.sortOrder}</td>
                        <td className="px-4 py-2 text-end">
                          <button type="button" className="text-blue-600 hover:underline" onClick={() => onEdit(c)}>
                            Edit
                          </button>
                          <span className="mx-2 text-slate-300">|</span>
                          <button type="button" className="text-red-600 hover:underline" onClick={() => onDelete(c.id)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      {mains.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No categories</p> : null}
    </div>
  );
}


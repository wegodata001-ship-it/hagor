"use client";

import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { Editor } from "@tiptap/core";

function Toolbar({ editor, rtl }: { editor: Editor | null; rtl: boolean }) {
  if (!editor) return null;

  const btn =
    "rounded-lg px-2.5 py-1.5 text-xs font-medium transition hover:bg-white/10 disabled:opacity-40";
  const active = "bg-white/15 text-white";
  const idle = "text-slate-400";

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div
      className={`flex flex-wrap items-center gap-1 border-b border-white/10 bg-[#0a0f1a] px-2 py-2 ${rtl ? "flex-row-reverse" : ""}`}
    >
      <button
        type="button"
        className={`${btn} ${editor.isActive("bold") ? active : idle}`}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        B
      </button>
      <button
        type="button"
        className={`${btn} italic ${editor.isActive("italic") ? active : idle}`}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        I
      </button>
      <button
        type="button"
        className={`${btn} underline ${editor.isActive("underline") ? active : idle}`}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        U
      </button>
      <span className="mx-1 h-5 w-px bg-white/15" aria-hidden />
      <button
        type="button"
        className={`${btn} ${editor.isActive("heading", { level: 2 }) ? active : idle}`}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </button>
      <button
        type="button"
        className={`${btn} ${editor.isActive("heading", { level: 3 }) ? active : idle}`}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        H3
      </button>
      <span className="mx-1 h-5 w-px bg-white/15" aria-hidden />
      <button
        type="button"
        className={`${btn} ${editor.isActive("bulletList") ? active : idle}`}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        •
      </button>
      <button
        type="button"
        className={`${btn} ${editor.isActive("orderedList") ? active : idle}`}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1.
      </button>
      <button type="button" className={`${btn} ${editor.isActive("link") ? active : idle}`} onClick={setLink}>
        Link
      </button>
    </div>
  );
}

export function PolicyRichEditor({
  content,
  placeholder,
  dir,
  onChange,
}: {
  content: string;
  placeholder: string;
  dir: "rtl" | "ltr";
  onChange: (html: string) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-sky-400 underline underline-offset-2",
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    editorProps: {
      attributes: {
        class:
          "min-h-[min(420px,55vh)] max-h-[min(560px,65vh)] overflow-y-auto px-4 py-4 text-sm leading-relaxed text-slate-100 focus:outline-none [&_a]:text-sky-400 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-semibold [&_li]:my-1 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:ps-6 [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:ps-6",
      },
    },
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => onChange(ed.getHTML()),
  });

  if (!editor) {
    return (
      <div className="min-h-[320px] animate-pulse rounded-xl border border-white/10 bg-slate-900/80" aria-hidden />
    );
  }

  return (
    <div dir={dir} className="overflow-hidden rounded-xl border border-white/10 bg-[#0f172a] shadow-inner">
      <Toolbar editor={editor} rtl={dir === "rtl"} />
      <EditorContent editor={editor} />
    </div>
  );
}

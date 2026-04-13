"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import {
  $getRoot,
  $createParagraphNode,
  EditorState,
  FORMAT_TEXT_COMMAND,
  COMMAND_PRIORITY_LOW,
  KEY_MODIFIER_COMMAND,
  $getSelection,
  $isRangeSelection,
} from "lexical";
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  TRANSFORMERS,
} from "@lexical/markdown";
import { registerCodeHighlighting } from "@lexical/code";
import { mergeRegister } from "@lexical/utils";

const PLACEHOLDER = "Post text (optional)";

// ── Placeholder Plugin ─────────────────────────────────────────────────────

function PlaceholderPlugin() {
  const [editor] = useLexicalComposerContext();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      const el = ref.current;
      if (!el) return;
      editorState.read(() => {
        const root = $getRoot();
        const isEmpty =
          root.getTextContent().length === 0 &&
          root.getChildrenSize() === 1 &&
          root.getFirstChild()?.getTextContent() === "";
        el.style.display = isEmpty ? "block" : "none";
      });
    });
  }, [editor]);

  return (
    <div
      ref={ref}
      className="absolute top-3 left-0 text-base text-on-surface-variant/50 pointer-events-none select-none"
    >
      {PLACEHOLDER}
    </div>
  );
}

// ── Code Highlighting Plugin ───────────────────────────────────────────────

function CodeHighlightPlugin() {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return registerCodeHighlighting(editor);
  }, [editor]);
  return null;
}

// ── Change Handler ─────────────────────────────────────────────────────────

function ChangeHandler({ onChange }: { onChange: (markdown: string) => void }) {
  return (
    <OnChangePlugin
      onChange={(editorState: EditorState) => {
        editorState.read(() => {
          const md = $convertToMarkdownString(TRANSFORMERS);
          onChange(md);
        });
      }}
    />
  );
}

// ── Initial Value Plugin ───────────────────────────────────────────────────

function InitialValuePlugin({ markdown }: { markdown?: string }) {
  const [editor] = useLexicalComposerContext();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (markdown) {
      editor.update(() => {
        $convertFromMarkdownString(markdown, TRANSFORMERS);
      });
    }
  }, [editor, markdown]);

  return null;
}

// ── Toolbar ────────────────────────────────────────────────────────────────

function Toolbar({ extra }: { extra?: React.ReactNode }) {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;
        setIsBold(selection.hasFormat("bold"));
        setIsItalic(selection.hasFormat("italic"));
      });
    });
  }, [editor]);

  const formatText = useCallback(
    (format: "bold" | "italic") => {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
    },
    [editor],
  );

  const btn = (active: boolean, onClick: () => void, title: string, label: string, extraClass = "") => (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors text-sm ${extraClass} ${
        active
          ? "bg-primary/15 text-primary"
          : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex items-center gap-0.5 px-2 py-1 border-t border-surface-container-high">
      {btn(isBold, () => formatText("bold"), "Bold (Ctrl+B)", "B", "font-extrabold")}
      {btn(isItalic, () => formatText("italic"), "Italic (Ctrl+I)", "I", "font-bold italic")}
      {extra}
    </div>
  );
}

// ── Main Editor Component ──────────────────────────────────────────────────

export interface LexicalEditorRef {
  getMarkdown: () => string;
  clear: () => void;
  isEmpty: () => boolean;
}

export default function LexicalEditor({
  onChange,
  editorRef,
  initialMarkdown,
  bottomBarExtra,
}: {
  onChange: (markdown: string) => void;
  editorRef?: React.RefObject<LexicalEditorRef | null>;
  initialMarkdown?: string;
  bottomBarExtra?: React.ReactNode;
}) {
  const [editor] = useLexicalComposerContext();
  const [markdown, setMarkdown] = useState("");

  useEffect(() => {
    if (!editorRef) return;
    editorRef.current = {
      getMarkdown: () => markdown,
      clear: () => {
        editor.update(() => {
          $getRoot().clear();
          $getRoot().append($createParagraphNode());
        });
        setMarkdown("");
      },
      isEmpty: () => {
        let empty = true;
        editor.getEditorState().read(() => {
          const root = $getRoot();
          empty = root.getTextContent().trim().length === 0;
        });
        return empty;
      },
    };
  }, [editor, editorRef, markdown]);

  // Keyboard shortcuts
  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        KEY_MODIFIER_COMMAND,
        (payload) => {
          const event = payload as KeyboardEvent;
          if (event.key === "b" && (event.ctrlKey || event.metaKey)) {
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
            return true;
          }
          if (event.key === "i" && (event.ctrlKey || event.metaKey)) {
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic");
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor]);

  return (
    <>
      <InitialValuePlugin markdown={initialMarkdown} />

      <div className="relative py-3">
        <RichTextPlugin
          contentEditable={
            <ContentEditable className="w-full min-h-[10rem] bg-transparent outline-none text-base text-on-surface leading-relaxed" />
          }
          placeholder={<PlaceholderPlugin />}
          ErrorBoundary={LexicalErrorBoundary}
        />
      </div>

      <Toolbar extra={bottomBarExtra} />

      <HistoryPlugin />
      <ListPlugin />
      <MarkdownShortcutPlugin />
      <CodeHighlightPlugin />
      <ChangeHandler
        onChange={(md) => {
          setMarkdown(md);
          onChange(md);
        }}
      />
    </>
  );
}

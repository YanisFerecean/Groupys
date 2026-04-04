"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
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
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  COMMAND_PRIORITY_HIGH,
  $isTextNode,
} from "lexical";
import {
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
} from "@lexical/list";
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  TRANSFORMERS,
} from "@lexical/markdown";
import {
  $createHeadingNode,
  $createQuoteNode,
} from "@lexical/rich-text";
import { registerCodeHighlighting, $createCodeNode } from "@lexical/code";
import { $setBlocksType } from "@lexical/selection";
import { mergeRegister } from "@lexical/utils";
import { INSERT_HORIZONTAL_RULE_COMMAND } from "@lexical/react/LexicalHorizontalRuleNode";
import LexicalViewer from "@/components/ui/LexicalViewer";

const PLACEHOLDER = "Post text (optional)";

// ── Slash Command Types ────────────────────────────────────────────────────

interface SlashCommand {
  key: string;
  title: string;
  description: string;
  icon: string;
  keywords: string[];
  action: (editor: ReturnType<typeof useLexicalComposerContext>[0]) => void;
}

const SLASH_COMMANDS: SlashCommand[] = [
  {
    key: "text",
    title: "Text",
    description: "Just start writing with plain text.",
    icon: "text_fields",
    keywords: ["paragraph", "text", "plain"],
    action: (editor) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createParagraphNode());
        }
      });
    },
  },
  {
    key: "h1",
    title: "Heading 1",
    description: "Big section heading.",
    icon: "format_h1",
    keywords: ["h1", "heading1", "title", "big"],
    action: (editor) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createHeadingNode("h1"));
        }
      });
    },
  },
  {
    key: "h2",
    title: "Heading 2",
    description: "Medium section heading.",
    icon: "format_h2",
    keywords: ["h2", "heading2", "subtitle"],
    action: (editor) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createHeadingNode("h2"));
        }
      });
    },
  },
  {
    key: "h3",
    title: "Heading 3",
    description: "Small section heading.",
    icon: "format_h3",
    keywords: ["h3", "heading3", "subheading"],
    action: (editor) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createHeadingNode("h3"));
        }
      });
    },
  },
  {
    key: "bullet",
    title: "Bullet List",
    description: "Create a simple bulleted list.",
    icon: "format_list_bulleted",
    keywords: ["bullet", "list", "ul", "unordered"],
    action: (editor) => {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    },
  },
  {
    key: "numbered",
    title: "Numbered List",
    description: "Create a numbered list.",
    icon: "format_list_numbered",
    keywords: ["number", "ordered", "ol", "numbered"],
    action: (editor) => {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    },
  },
  {
    key: "quote",
    title: "Quote",
    description: "Capture a quote.",
    icon: "format_quote",
    keywords: ["quote", "blockquote", "citation", "cite"],
    action: (editor) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createQuoteNode());
        }
      });
    },
  },
  {
    key: "code",
    title: "Code Block",
    description: "Capture a code snippet.",
    icon: "code_blocks",
    keywords: ["code", "snippet", "pre", "codeblock"],
    action: (editor) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createCodeNode());
        }
      });
    },
  },
  {
    key: "divider",
    title: "Divider",
    description: "Visually divide blocks.",
    icon: "horizontal_rule",
    keywords: ["divider", "hr", "line", "separator", "rule"],
    action: (editor) => {
      editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined);
    },
  },
];

// ── Slash Command Menu ─────────────────────────────────────────────────────

function SlashCommandMenu({
  editor,
  onClose,
  position,
  query,
}: {
  editor: ReturnType<typeof useLexicalComposerContext>[0];
  onClose: () => void;
  position: { top: number; left: number };
  query: string;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const filteredCommands = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return SLASH_COMMANDS;
    return SLASH_COMMANDS.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(q) ||
        cmd.keywords.some((kw) => kw.includes(q)),
    );
  }, [query]);

  useEffect(() => {
    const selected = itemRefs.current[selectedIndex];
    if (selected) {
      selected.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const executeCommand = useCallback(
    (cmd: SlashCommand) => {
      editor.focus();
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const anchor = selection.anchor;
          const focus = selection.focus;
          const node = anchor.getNode();
          if ($isTextNode(node)) {
            const textContent = node.getTextContent();
            const slashIndex = textContent.lastIndexOf("/");
            if (slashIndex !== -1) {
              const beforeSlash = textContent.substring(0, slashIndex);
              const afterQuery = textContent.substring(focus.offset);
              node.setTextContent(beforeSlash + afterQuery);
              selection.anchor.set(anchor.key, beforeSlash.length, "text");
              selection.focus.set(anchor.key, beforeSlash.length, "text");
            }
          }
        }
      });
      cmd.action(editor);
      onClose();
    },
    [editor, onClose],
  );

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        KEY_ARROW_DOWN_COMMAND,
        () => {
          setSelectedIndex((prev) =>
            prev < filteredCommands.length - 1 ? prev + 1 : 0,
          );
          return true;
        },
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand(
        KEY_ARROW_UP_COMMAND,
        () => {
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredCommands.length - 1,
          );
          return true;
        },
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        (event) => {
          if (filteredCommands.length > 0) {
            event?.preventDefault();
            executeCommand(filteredCommands[selectedIndex]);
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand(
        KEY_ESCAPE_COMMAND,
        () => {
          onClose();
          return true;
        },
        COMMAND_PRIORITY_HIGH,
      ),
    );
  }, [editor, filteredCommands, selectedIndex, executeCommand, onClose]);

  if (filteredCommands.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="absolute z-50 w-72 max-h-80 overflow-y-auto bg-surface-container-lowest border border-surface-container-high rounded-xl shadow-xl py-1.5 animate-in fade-in slide-in-from-top-1 duration-150"
      style={{ top: position.top, left: position.left }}
    >
      <div className="px-3 py-1.5 text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">
        Basic blocks
      </div>
      {filteredCommands.map((cmd, index) => (
        <button
          key={cmd.key}
          ref={(el) => { itemRefs.current[index] = el; }}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand(cmd)}
          onMouseEnter={() => setSelectedIndex(index)}
          className={`flex items-center gap-3 w-full px-3 py-2 text-left transition-colors ${
            index === selectedIndex
              ? "bg-primary/10 text-primary"
              : "text-on-surface hover:bg-surface-container-high"
          }`}
        >
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              index === selectedIndex
                ? "bg-primary/15"
                : "bg-surface-container-high"
            }`}
          >
            <span
              className="material-symbols-outlined text-lg"
              style={{
                fontVariationSettings:
                  index === selectedIndex ? "'FILL' 1" : "'FILL' 0",
              }}
            >
              {cmd.icon}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{cmd.title}</div>
            <div className="text-xs text-on-surface-variant truncate">
              {cmd.description}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

// ── Slash Command Plugin ───────────────────────────────────────────────────

function SlashCommandPlugin() {
  const [editor] = useLexicalComposerContext();
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [query, setQuery] = useState("");
  const slashMatchRef = useRef(false);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          setIsOpen(false);
          slashMatchRef.current = false;
          return;
        }

        const anchor = selection.anchor;
        const node = anchor.getNode();
        const textContent = node.getTextContent();
        const offset = anchor.offset;

        const textBeforeCursor = textContent.substring(0, offset);
        const slashIndex = textBeforeCursor.lastIndexOf("/");

        if (slashIndex !== -1) {
          const textAfterSlash = textBeforeCursor.substring(slashIndex + 1);
          const charBeforeSlash =
            slashIndex > 0 ? textBeforeCursor[slashIndex - 1] : " ";
          if (charBeforeSlash === " " || slashIndex === 0) {
            if (!textAfterSlash.includes(" ") && textAfterSlash.length < 20) {
              setQuery(textAfterSlash);
              slashMatchRef.current = true;

              const domSelection = window.getSelection();
              if (domSelection && domSelection.rangeCount > 0) {
                const range = domSelection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                const editorElement = editor.getRootElement();
                if (editorElement) {
                  const editorRect = editorElement.getBoundingClientRect();
                  setPosition({
                    top: rect.bottom - editorRect.top + 4,
                    left: Math.min(rect.left - editorRect.left, editorRect.width - 288),
                  });
                }
              }
              setIsOpen(true);
              return;
            }
          }
        }

        if (slashMatchRef.current) {
          setIsOpen(false);
          slashMatchRef.current = false;
        }
      });
    });
  }, [editor]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    slashMatchRef.current = false;
  }, []);

  if (!isOpen) return null;

  return (
    <SlashCommandMenu
      key={query}
      editor={editor}
      onClose={handleClose}
      position={position}
      query={query}
    />
  );
}

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
      className="absolute top-0 left-0 text-base text-on-surface-variant/50 pointer-events-none select-none p-0"
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
}: {
  onChange: (markdown: string) => void;
  editorRef?: React.RefObject<LexicalEditorRef | null>;
  initialMarkdown?: string;
}) {
  const [editor] = useLexicalComposerContext();
  const [markdown, setMarkdown] = useState("");
  const [mode, setMode] = useState<"write" | "preview">("write");

  useEffect(() => {
    if (!editorRef) return;
    const handle: LexicalEditorRef = {
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
    editorRef.current = handle;
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

  const isPreview = mode === "preview";

  return (
    <>
      <InitialValuePlugin markdown={initialMarkdown} />

      {/* Write / Preview tabs (matching mobile) */}
      <div className="flex border-b border-surface-container-high">
        <button
          type="button"
          onClick={() => setMode("write")}
          className={`flex-1 text-center py-2.5 text-sm font-semibold transition-colors ${
            !isPreview
              ? "text-primary border-b-2 border-primary"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          Write
        </button>
        <button
          type="button"
          onClick={() => setMode("preview")}
          className={`flex-1 text-center py-2.5 text-sm font-semibold transition-colors ${
            isPreview
              ? "text-primary border-b-2 border-primary"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          Preview
        </button>
      </div>

      {/* Editor / Preview area */}
      {!isPreview ? (
        <div className="relative py-3">
          <RichTextPlugin
            contentEditable={
              <ContentEditable className="w-full min-h-[12rem] bg-transparent outline-none text-base text-on-surface leading-relaxed" />
            }
            placeholder={<PlaceholderPlugin />}
            ErrorBoundary={LexicalErrorBoundary}
          />
          <SlashCommandPlugin />
        </div>
      ) : (
        <div className="py-3 min-h-[12rem]">
          {markdown.trim() ? (
            <LexicalViewer content={markdown} />
          ) : (
            <p className="text-base text-on-surface-variant">Nothing to preview</p>
          )}
        </div>
      )}

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

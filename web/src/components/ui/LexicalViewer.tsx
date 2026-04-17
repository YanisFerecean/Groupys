"use client";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { CodeNode, CodeHighlightNode } from "@lexical/code";
import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { $convertFromMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import { useEffect, useRef } from "react";
import { registerCodeHighlighting } from "@lexical/code";
import DOMPurify from "isomorphic-dompurify";

const EDITOR_NODES = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  CodeNode,
  CodeHighlightNode,
  HorizontalRuleNode,
  AutoLinkNode,
  LinkNode,
];

const THEME = {
  text: {
    bold: "font-bold",
    italic: "italic",
    strikethrough: "line-through opacity-60",
    code: "text-[0.8rem] bg-surface-container-high px-1.5 py-0.5 rounded font-mono",
  },
  heading: {
    h1: "text-xl font-extrabold my-2",
    h2: "text-lg font-bold my-2",
    h3: "text-base font-bold my-1.5",
  },
  quote: "border-l-3 border-primary pl-3 my-2 opacity-85",
  list: {
    ul: "list-disc pl-5 my-1",
    ol: "list-decimal pl-5 my-1",
    listitem: "my-0.5",
  },
  code: "bg-surface-container-high px-4 py-3 rounded-xl overflow-x-auto my-2 text-[0.8rem] font-mono",
  codeHighlight: {
    atrule: "text-purple-500",
    attr: "text-blue-500",
    boolean: "text-orange-500",
    builtin: "text-teal-500",
    cdata: "text-gray-500",
    char: "text-green-500",
    class: "text-yellow-500",
    "class-name": "text-yellow-500",
    comment: "text-gray-400",
    constant: "text-orange-500",
    deleted: "text-red-500",
    doctype: "text-gray-500",
    entity: "text-purple-500",
    function: "text-blue-500",
    important: "text-orange-500",
    inserted: "text-green-500",
    keyword: "text-purple-500",
    namespace: "text-yellow-500",
    number: "text-orange-500",
    operator: "text-purple-500",
    prolog: "text-gray-500",
    property: "text-blue-500",
    punctuation: "text-gray-500",
    regex: "text-orange-500",
    selector: "text-green-500",
    string: "text-green-500",
    symbol: "text-orange-500",
    tag: "text-red-500",
    url: "text-blue-500",
    variable: "text-orange-500",
  },
};

/**
 * Sanitizes markdown content to prevent XSS before converting to Lexical format.
 */
function sanitizeMarkdown(content: string): string {
  // First sanitize the raw content to remove any HTML/script injection
  const sanitized = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
  // Re-encode any remaining HTML entities
  return sanitized.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function LoadMarkdownPlugin({ content }: { content: string }) {
  const [editor] = useLexicalComposerContext();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Sanitize content before processing
    const safeContent = sanitizeMarkdown(content);

    editor.update(() => {
      $convertFromMarkdownString(safeContent, TRANSFORMERS);
    });

    editor.setEditable(false);
    return registerCodeHighlighting(editor);
  }, [editor, content]);

  return null;
}

export default function LexicalViewer({
  content,
  className = "",
  truncate = false,
}: {
  content: string;
  className?: string;
  truncate?: boolean;
}) {
  const initialConfig = {
    namespace: "GroupysPostViewer",
    nodes: EDITOR_NODES,
    theme: THEME,
    editable: false,
    onError: (error: Error) => {
      console.error("Lexical viewer error:", error);
    },
  };

  return (
    <div className={`text-sm leading-relaxed ${truncate ? "line-clamp-3" : ""} ${className}`}>
      <LexicalComposer initialConfig={initialConfig}>
        <LoadMarkdownPlugin content={content} />
        <RichTextPlugin
          contentEditable={
            <ContentEditable className="outline-none" />
          }
          placeholder={null}
          ErrorBoundary={LexicalErrorBoundary}
        />
      </LexicalComposer>
    </div>
  );
}

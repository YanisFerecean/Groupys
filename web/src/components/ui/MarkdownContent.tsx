"use client";

import LexicalViewer from "@/components/ui/LexicalViewer";

export default function MarkdownContent({
  content,
  className = "",
  truncate = false,
}: {
  content: string;
  className?: string;
  truncate?: boolean;
}) {
  return (
    <LexicalViewer
      content={content}
      className={className}
      truncate={truncate}
    />
  );
}

"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

const mdComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-xl font-extrabold my-2">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-lg font-bold my-2">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-bold my-1.5">{children}</h3>
  ),
  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  del: ({ children }) => (
    <del className="line-through opacity-60">{children}</del>
  ),
  code: ({ children, className }) => {
    // code blocks inside <pre> have a className like "language-xxx"
    if (className) {
      return <code className={className}>{children}</code>;
    }
    return (
      <code className="text-[0.8rem] bg-surface-container-high px-1.5 py-0.5 rounded">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="bg-surface-container-high px-4 py-3 rounded-xl overflow-x-auto my-2 text-[0.8rem]">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-3 border-primary pl-3 my-2 opacity-85">
      {children}
    </blockquote>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-5 my-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 my-1">{children}</ol>
  ),
  li: ({ children }) => <li className="my-0.5">{children}</li>,
  a: ({ href, children }) => (
    <a href={href} className="text-primary underline" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  p: ({ children }) => <p className="my-1">{children}</p>,
  hr: () => <hr className="border-surface-container-high my-3" />,
};

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
    <div className={`text-sm leading-relaxed ${truncate ? "line-clamp-3" : ""} ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

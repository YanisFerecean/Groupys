'use dom';

import React, { useEffect, useCallback, useMemo } from 'react';
import { 
  LexicalComposer, 
  InitialConfigType 
} from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  EditorState,
  InitialEditorStateType,
} from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import SlashCommandPlugin from './SlashCommandPlugin';
import { decodeLexicalContent } from '@/lib/lexicalContent'

// Theme configuration - Notion style
const theme = {
  ltr: 'ltr',
  rtl: 'rtl',
  paragraph: 'my-1 leading-normal',
  quote: 'my-2 pl-4 border-l-2 border-gray-300 text-gray-600',
  heading: {
    h1: 'text-4xl font-bold my-2 text-gray-900',
    h2: 'text-3xl font-bold my-2 text-gray-900',
    h3: 'text-2xl font-bold my-2 text-gray-900',
  },
  list: {
    nested: {
      listitem: 'ml-4',
    },
    ol: 'list-decimal my-1',
    ul: 'list-disc my-1',
    listitem: 'my-1 pl-1',
  },
  link: 'text-blue-600 underline hover:text-blue-800',
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
    strikethrough: 'line-through',
    underlineStrikethrough: 'underline line-through',
  },
};

// Placeholder component - Notion style
function Placeholder({ text }: { text: string }) {
  return (
    <div 
      className="absolute top-4 left-4 pointer-events-none text-gray-400 select-none"
      style={{ 
        fontSize: '16px',
        lineHeight: '1.5',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {text}
    </div>
  );
}

// Word Count Plugin
function WordCountPlugin({ onWordCountChange, maxWords }: { 
  onWordCountChange: (count: number, isOverLimit: boolean) => void;
  maxWords: number;
}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const root = $getRoot();
        const text = root.getTextContent();
        const words = text.trim().split(/\s+/).filter(w => w.length > 0);
        const count = words.length;
        onWordCountChange(count, count > maxWords);
      });
    });
  }, [editor, maxWords, onWordCountChange]);

  return null;
}

interface LexicalEditorDOMProps {
  initialContent?: string;
  placeholder?: string;
  onChange?: (content: string) => void;
  onWordCountChange?: (count: number, isOverLimit: boolean) => void;
  editable?: boolean;
  maxWords?: number;
  darkMode?: boolean;
}

export default function LexicalEditorDOM({
  initialContent,
  placeholder = "Type '/' for commands...",
  onChange,
  onWordCountChange,
  editable = true,
  maxWords = 300,
  darkMode = false,
}: LexicalEditorDOMProps) {
  const normalizedInitialContent = useMemo(
    () => decodeLexicalContent(initialContent ?? ''),
    [initialContent],
  )

  const handleChange = useCallback((editorState: EditorState) => {
    if (onChange) {
      const json = JSON.stringify(editorState.toJSON());
      onChange(json);
    }
  }, [onChange]);

  const initialEditorState = useMemo<InitialEditorStateType>(() => {
    if (!normalizedInitialContent || !normalizedInitialContent.trim()) return null;

    // Support persisted Lexical JSON editor state.
    try {
      const parsed = JSON.parse(normalizedInitialContent);
      if (parsed && typeof parsed === 'object' && 'root' in parsed) {
        return normalizedInitialContent;
      }
    } catch {
      // Fall through and treat as plain text.
    }

    // Fallback for plain text initial content.
    return () => {
      const root = $getRoot();
      root.clear();
      const paragraph = $createParagraphNode();
      paragraph.append($createTextNode(normalizedInitialContent));
      root.append(paragraph);
    };
  }, [normalizedInitialContent]);

  const initialConfig = useMemo<InitialConfigType>(() => ({
    namespace: 'GroupysPostEditor',
    theme,
    onError: (error: Error) => {
      console.error('Lexical Editor Error:', error);
    },
    nodes: [
      HeadingNode,
      ListNode,
      ListItemNode,
      QuoteNode,
      AutoLinkNode,
      LinkNode,
    ],
    editorState: initialEditorState,
    editable,
  }), [editable, initialEditorState]);

  return (
    <div 
      className={`w-full h-full ${darkMode ? 'dark bg-gray-900' : 'bg-white'}`}
      style={{ 
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <LexicalComposer initialConfig={initialConfig}>
        <div className="relative w-full h-full">
          <RichTextPlugin
        contentEditable={
          <ContentEditable
            className="w-full h-full outline-none border-none p-4 text-base leading-relaxed focus:outline-none focus:ring-0 focus:border-none"
            style={{
              minHeight: '100%',
              maxWidth: '900px',
              margin: '0 auto',
              color: darkMode ? '#e5e5e5' : '#1a1a1a',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              fontSize: '16px',
              // Remove default browser focus outline and borders
              WebkitTapHighlightColor: 'transparent',
              boxShadow: 'none',
              border: 'none',
              outline: 'none',
            }}
          />
        }
            placeholder={<Placeholder text={placeholder} />}
            ErrorBoundary={({ children }) => <>{children}</>}
          />
        <HistoryPlugin />
        <AutoFocusPlugin />
        <LinkPlugin />
        <ListPlugin />
        <SlashCommandPlugin />
        <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
        {onWordCountChange && (
          <WordCountPlugin
            onWordCountChange={onWordCountChange}
            maxWords={maxWords}
          />
        )}
        </div>
      </LexicalComposer>
    </div>
  );
}

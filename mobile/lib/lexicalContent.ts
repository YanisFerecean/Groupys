import { Buffer } from 'buffer'
import { $convertToMarkdownString, TRANSFORMERS } from '@lexical/markdown'
import { AutoLinkNode, LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { createEditor } from 'lexical'

const ENCODED_LEXICAL_PREFIX = 'lx:'

interface SerializedLexicalNode {
  type?: string
  text?: string
  children?: SerializedLexicalNode[]
}

interface SerializedLexicalEditorState {
  root?: SerializedLexicalNode
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseLexicalState(candidate: string): SerializedLexicalEditorState | null {
  if (!candidate.trim()) return null
  try {
    const parsed: unknown = JSON.parse(candidate)
    if (!isObject(parsed) || !isObject(parsed.root)) return null
    return parsed as SerializedLexicalEditorState
  } catch {
    return null
  }
}

function extractNodeText(node: SerializedLexicalNode): string {
  if (node.type === 'text' && typeof node.text === 'string') {
    return node.text
  }

  if (node.type === 'linebreak') {
    return '\n'
  }

  const children = Array.isArray(node.children) ? node.children : []
  let text = ''
  for (const child of children) {
    text += extractNodeText(child)
  }

  if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'quote' || node.type === 'listitem') {
    text += '\n'
  }

  return text
}

let markdownEditor: ReturnType<typeof createEditor> | null = null

function getMarkdownEditor() {
  if (!markdownEditor) {
    markdownEditor = createEditor({
      namespace: 'GroupysLexicalContent',
      nodes: [
        HeadingNode,
        ListNode,
        ListItemNode,
        QuoteNode,
        AutoLinkNode,
        LinkNode,
      ],
      onError: (error) => {
        throw error
      },
    })
  }

  return markdownEditor
}

export function decodeLexicalContent(content: string): string {
  if (!content || !content.startsWith(ENCODED_LEXICAL_PREFIX)) return content

  try {
    const decoded = Buffer.from(content.slice(ENCODED_LEXICAL_PREFIX.length), 'base64').toString('utf8')
    return decoded || content
  } catch {
    return content
  }
}

export function getLexicalJsonContent(content: string): string | null {
  if (!content) return null
  const decoded = decodeLexicalContent(content)
  return parseLexicalState(decoded) ? decoded : null
}

export function encodeLexicalContent(content: string): string {
  if (!content) return content

  // Prevent double-encoding persisted content.
  if (content.startsWith(ENCODED_LEXICAL_PREFIX) && getLexicalJsonContent(content)) {
    return content
  }

  const lexicalJson = getLexicalJsonContent(content)
  if (!lexicalJson) return content

  return `${ENCODED_LEXICAL_PREFIX}${Buffer.from(lexicalJson, 'utf8').toString('base64')}`
}

export function lexicalContentToPlainText(content: string): string | null {
  const lexicalJson = getLexicalJsonContent(content)
  if (!lexicalJson) return null

  const parsed = parseLexicalState(lexicalJson)
  if (!parsed?.root) return null

  return extractNodeText(parsed.root)
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function lexicalContentToMarkdown(content: string): string | null {
  const lexicalJson = getLexicalJsonContent(content)
  if (!lexicalJson) return null

  try {
    const editor = getMarkdownEditor()
    const editorState = editor.parseEditorState(lexicalJson)
    editor.setEditorState(editorState)

    let markdown = ''
    editor.update(() => {
      markdown = $convertToMarkdownString(TRANSFORMERS).trim()
    }, { discrete: true })

    return markdown
  } catch {
    return null
  }
}

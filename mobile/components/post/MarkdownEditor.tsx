import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Colors } from '@/constants/colors'
import { MarkdownDisplay } from '@/components/ui/MarkdownDisplay'

// ── Types ───────────────────────────────────────────────────────────

export type FormatType =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'link'
  | 'ordered-list'
  | 'blockquote'

export interface MarkdownEditorRef {
  format: (type: FormatType) => void
}

interface MarkdownEditorProps {
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
  editable?: boolean
  minHeight?: number
}

// ── Format config ───────────────────────────────────────────────────

interface FormatConfig {
  prefix: string
  suffix: string
  lineBased: boolean
}

const FORMAT_MAP: Record<FormatType, FormatConfig> = {
  bold:           { prefix: '**',    suffix: '**',    lineBased: false },
  italic:         { prefix: '*',     suffix: '*',     lineBased: false },
  underline:      { prefix: '<u>',   suffix: '</u>',  lineBased: false },
  strikethrough:  { prefix: '~~',    suffix: '~~',    lineBased: false },
  link:           { prefix: '[',     suffix: '](url)',lineBased: false },
  'ordered-list': { prefix: '1. ',   suffix: '',      lineBased: true  },
  blockquote:     { prefix: '> ',    suffix: '',      lineBased: true  },
}

// ── Formatting helpers ──────────────────────────────────────────────

function applyInlineFormat(
  text: string,
  start: number,
  end: number,
  prefix: string,
  suffix: string,
): { newText: string; newSelection: { start: number; end: number } } {
  if (start !== end) {
    const before = text.slice(0, start)
    const selected = text.slice(start, end)
    const after = text.slice(end)

    // Toggle off if already wrapped
    if (before.endsWith(prefix) && after.startsWith(suffix)) {
      const newText = before.slice(0, -prefix.length) + selected + after.slice(suffix.length)
      return { newText, newSelection: { start: start - prefix.length, end: end - prefix.length } }
    }

    const newText = before + prefix + selected + suffix + after
    return { newText, newSelection: { start: start + prefix.length, end: end + prefix.length } }
  }

  // No selection: insert markers, place cursor between them
  const before = text.slice(0, start)
  const after = text.slice(start)
  const newText = before + prefix + suffix + after
  return { newText, newSelection: { start: start + prefix.length, end: start + prefix.length } }
}

function applyLineFormat(
  text: string,
  start: number,
  end: number,
  prefix: string,
  format: FormatType,
): { newText: string; newSelection: { start: number; end: number } } {
  const lineStart = text.lastIndexOf('\n', start - 1) + 1
  let lineEnd = text.indexOf('\n', end)
  if (lineEnd === -1) lineEnd = text.length

  const lineBlock = text.slice(lineStart, lineEnd)
  const lines = lineBlock.split('\n')

  const allPrefixed = lines.every((line) =>
    format === 'ordered-list' ? /^\d+\.\s/.test(line) : line.startsWith(prefix)
  )

  const newLines = allPrefixed
    ? lines.map((line) =>
        format === 'ordered-list'
          ? line.replace(/^\d+\.\s/, '')
          : line.startsWith(prefix) ? line.slice(prefix.length) : line
      )
    : lines.map((line, i) => {
        if (format === 'ordered-list') return /^\d+\.\s/.test(line) ? line : `${i + 1}. ${line}`
        return line.startsWith(prefix) ? line : prefix + line
      })

  const newBlock = newLines.join('\n')
  const newText = text.slice(0, lineStart) + newBlock + text.slice(lineEnd)
  return { newText, newSelection: { start, end: end + (newBlock.length - lineBlock.length) } }
}

// ── List auto-continuation ──────────────────────────────────────────

function detectListContinuation(
  oldText: string,
  newText: string,
): { text: string; cursor: number } | null {
  if (newText.length <= oldText.length) return null

  // Find divergence point
  let i = 0
  while (i < oldText.length && i < newText.length && newText[i] === oldText[i]) i++

  // Find first newline in the changed/inserted portion
  const tail = newText.slice(i)
  const nlOffset = tail.indexOf('\n')
  if (nlOffset === -1) return null

  const nlPos = i + nlOffset
  const lineStart = newText.lastIndexOf('\n', nlPos - 1) + 1
  const prevLine = newText.slice(lineStart, nlPos)

  const listMatch = prevLine.match(/^(\d+)\.\s(.*)$/)
  if (!listMatch) return null

  const num = parseInt(listMatch[1], 10)
  const lineContent = listMatch[2]

  if (lineContent.trim() === '') {
    // Double-enter on empty item → break out of list
    const cleaned = newText.slice(0, lineStart) + newText.slice(nlPos + 1)
    return { text: cleaned, cursor: lineStart }
  }

  // Next line already has a number (pasted content) → skip
  if (/^\d+\.\s/.test(newText.slice(nlPos + 1))) return null

  const nextPrefix = `${num + 1}. `
  const withNext = newText.slice(0, nlPos + 1) + nextPrefix + newText.slice(nlPos + 1)
  return { text: withNext, cursor: nlPos + 1 + nextPrefix.length }
}

// ── Component ───────────────────────────────────────────────────────

const MarkdownEditor = forwardRef<MarkdownEditorRef, MarkdownEditorProps>(
  function MarkdownEditor({ value, onChangeText, placeholder, editable = true, minHeight = 200 }, ref) {
    const selectionRef = useRef({ start: 0, end: 0 })
    const [controlledSelection, setControlledSelection] = useState<
      { start: number; end: number } | undefined
    >(undefined)
    const [mode, setMode] = useState<'write' | 'preview'>('write')

    const setCursorAt = (pos: number) => {
      const sel = { start: pos, end: pos }
      setControlledSelection(sel)
      selectionRef.current = sel
      setTimeout(() => setControlledSelection(undefined), 50)
    }

    const format = (type: FormatType) => {
      const { prefix, suffix, lineBased } = FORMAT_MAP[type]
      const { start, end } = selectionRef.current

      const result = lineBased
        ? applyLineFormat(value, start, end, prefix, type)
        : applyInlineFormat(value, start, end, prefix, suffix)

      onChangeText(result.newText)
      setControlledSelection(result.newSelection)
      selectionRef.current = result.newSelection
      setTimeout(() => setControlledSelection(undefined), 50)
    }

    useImperativeHandle(ref, () => ({ format }))

    const handleTextChange = (newText: string) => {
      const listResult = detectListContinuation(value, newText)
      if (listResult) {
        onChangeText(listResult.text)
        setCursorAt(listResult.cursor)
        return
      }
      onChangeText(newText)
    }

    const isPreview = mode === 'preview'

    return (
      <View>
        {/* Full-width Write / Preview tabs */}
        <View className="flex-row border-b border-surface-container-high">
          <TouchableOpacity
            onPress={() => setMode('write')}
            className={`flex-1 items-center py-2.5 ${!isPreview ? 'border-b-2 border-primary' : ''}`}
          >
            <Text className={`text-sm font-semibold ${!isPreview ? 'text-primary' : 'text-on-surface-variant'}`}>
              Write
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMode('preview')}
            className={`flex-1 items-center py-2.5 ${isPreview ? 'border-b-2 border-primary' : ''}`}
          >
            <Text className={`text-sm font-semibold ${isPreview ? 'text-primary' : 'text-on-surface-variant'}`}>
              Preview
            </Text>
          </TouchableOpacity>
        </View>

        {/* Write mode: TextInput */}
        {!isPreview && (
          <TextInput
            className="text-base text-on-surface py-2"
            style={{ minHeight }}
            placeholder={placeholder}
            placeholderTextColor={Colors.onSurfaceVariant}
            value={value}
            onChangeText={handleTextChange}
            onSelectionChange={(e) => {
              selectionRef.current = e.nativeEvent.selection
              if (controlledSelection) setControlledSelection(undefined)
            }}
            selection={controlledSelection}
            multiline
            textAlignVertical="top"
            editable={editable}
            autoCorrect
            autoCapitalize="sentences"
          />
        )}

        {/* Preview mode: rendered markdown */}
        {isPreview && (
          <View style={{ minHeight }} className="py-2">
            {value.trim() ? (
              <MarkdownDisplay
                content={value}
                baseFontSize={16}
                color={Colors.onSurface}
                rawMarkdown
                interactive
              />
            ) : (
              <Text className="text-base" style={{ color: Colors.onSurfaceVariant }}>
                Nothing to preview
              </Text>
            )}
          </View>
        )}
      </View>
    )
  }
)

export default MarkdownEditor

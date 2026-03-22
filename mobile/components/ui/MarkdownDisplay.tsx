import React from 'react'
import { Linking, StyleSheet, View, Text, Platform } from 'react-native'
import Markdown from 'react-native-markdown-display'
import MarkdownIt from 'markdown-it'
import { Colors } from '@/constants/colors'

interface MarkdownDisplayProps {
  content: string
  numberOfLines?: number
  baseFontSize?: number
  color?: string
  /** When true, content is already clean markdown — skip HTML preprocessing */
  rawMarkdown?: boolean
  /** When true, links are tappable and open in the browser */
  interactive?: boolean
}

/**
 * markdown-it plugin that converts html_inline <u>/<u> tokens
 * into proper u_open/u_close tokens with nesting so the AST
 * builder creates a tree structure (like strong_open/strong_close).
 */
function underlinePlugin(md: any) {
  md.core.ruler.after('inline', 'underline_html', (state: any) => {
    for (const blockToken of state.tokens) {
      if (blockToken.type !== 'inline' || !blockToken.children) continue

      const newChildren: any[] = []
      for (const token of blockToken.children) {
        if (token.type === 'html_inline') {
          const content = token.content.toLowerCase().trim()
          if (content === '<u>') {
            const open = new state.Token('u_open', 'u', 1)
            open.markup = '<u>'
            newChildren.push(open)
            continue
          }
          if (content === '</u>') {
            const close = new state.Token('u_close', 'u', -1)
            close.markup = '</u>'
            newChildren.push(close)
            continue
          }
        }
        newChildren.push(token)
      }
      blockToken.children = newChildren
    }
  })
}

// Create markdown-it instance with html enabled + underline plugin
const markdownIt = MarkdownIt({ html: true, typographer: false }).use(underlinePlugin)

/**
 * Pre-processes the post body content to handle:
 * 1. HTML entities decoding
 * 2. Supported HTML tags → markdown equivalents (keeping <u> for the plugin)
 * 3. Stripping unsupported HTML tags
 * 4. Normalizing whitespace and edge cases
 */
function preprocessPostBody(content: string): string {
  if (!content) return '';

  let s = content;

  // 1. Decode basic HTML entities
  s = s.replace(/&amp;/g, '&')
       .replace(/&lt;/g, '<')
       .replace(/&gt;/g, '>')
       .replace(/&quot;/g, '"')
       .replace(/&#0?39;/g, "'")
       .replace(/&nbsp;/g, ' ');

  // 2. Convert HTML tags to markdown (order matters for nesting)
  // Line breaks first so <br> inside other tags becomes \n
  s = s.replace(/<br\s*\/?>/gi, '\n');

  // Strikethrough
  s = s.replace(/<(?:strike|s|del)>([\s\S]*?)<\/(?:strike|s|del)>/gi, '~~$1~~');

  // Bold
  s = s.replace(/<(?:b|strong)>([\s\S]*?)<\/(?:b|strong)>/gi, '**$1**');

  // Italic
  s = s.replace(/<(?:i|em)>([\s\S]*?)<\/(?:i|em)>/gi, '*$1*');

  // Keep <u> tags — the markdown-it plugin handles them

  // 3. Clean up empty markdown markers from tags that only contained <br>
  s = s.replace(/~~\s*~~/g, '');
  s = s.replace(/\*\*\s*\*\*/g, '');
  s = s.replace(/\*\s*\*/g, '');
  // Clean empty <u> pairs
  s = s.replace(/<u>\s*<\/u>/gi, '');

  // 4. Strip all HTML tags EXCEPT <u> and </u>
  s = s.replace(/<(?!\/?u\b)[^>]*>/gi, '');

  // 5. Handle intra-word underscores (prevent user_name → italic)
  // Only escape underscores between word characters that are NOT part of <u> tags
  s = s.replace(/(\w)_(\w)/g, '$1\\_$2');

  // 6. Clean up malformed headings (ensure space after #)
  s = s.replace(/^(#+)([^#\s])/gm, '$1 $2');

  // 7. Ensure code blocks have newlines before/after
  s = s.replace(/([^\n])(```)/g, '$1\n$2');
  s = s.replace(/(```)([^\n])/g, '$1\n$2');

  return s.trim();
}

export const MarkdownDisplay = React.memo(({
  content,
  numberOfLines,
  baseFontSize = 14,
  color = Colors.onSurfaceVariant,
  rawMarkdown = false,
  interactive = false,
}: MarkdownDisplayProps) => {

  const processedContent = rawMarkdown ? content : preprocessPostBody(content);

  const styles = StyleSheet.create({
    body: {
      fontSize: baseFontSize,
      lineHeight: baseFontSize * 1.5,
      color: color,
      fontFamily: Platform.select({ ios: 'System', android: 'sans-serif' }),
    },
    heading1: {
      fontSize: baseFontSize * 1.6,
      fontWeight: 'bold',
      color: Colors.onSurface,
      marginTop: 12,
      marginBottom: 8,
    },
    heading2: {
      fontSize: baseFontSize * 1.4,
      fontWeight: 'bold',
      color: Colors.onSurface,
      marginTop: 10,
      marginBottom: 6,
    },
    heading3: {
      fontSize: baseFontSize * 1.2,
      fontWeight: 'bold',
      color: Colors.onSurface,
      marginTop: 8,
      marginBottom: 4,
    },
    paragraph: {
      marginTop: 0,
      marginBottom: baseFontSize * 0.8,
      flexWrap: 'wrap',
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
    },
    strong: {
      fontWeight: '700',
      color: Colors.onSurface,
    },
    em: {
      fontStyle: 'italic',
    },
    s: {
      textDecorationLine: 'line-through',
    },
    u: {
      textDecorationLine: 'underline',
    },
    link: {
      color: Colors.primary,
      textDecorationLine: 'underline',
      fontWeight: '500',
    },
    blockquote: {
      backgroundColor: Colors.surfaceContainerHigh,
      borderLeftColor: Colors.primary,
      borderLeftWidth: 3,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 4,
      marginVertical: 8,
      opacity: 0.9,
    },
    code_inline: {
      backgroundColor: Colors.surfaceContainerHigh,
      color: Colors.primary,
      fontFamily: Platform.select({ ios: 'CourierNewPSMT', android: 'monospace' }),
      paddingHorizontal: 4,
      borderRadius: 4,
      fontSize: baseFontSize * 0.9,
    },
    code_block: {
      backgroundColor: '#1E1E1E',
      color: '#D4D4D4',
      fontFamily: Platform.select({ ios: 'CourierNewPSMT', android: 'monospace' }),
      padding: 12,
      borderRadius: 12,
      marginVertical: 10,
      fontSize: baseFontSize * 0.9,
    },
    fence: {
      backgroundColor: '#1E1E1E',
      color: '#D4D4D4',
      fontFamily: Platform.select({ ios: 'CourierNewPSMT', android: 'monospace' }),
      padding: 12,
      borderRadius: 12,
      marginVertical: 10,
      fontSize: baseFontSize * 0.9,
    },
    bullet_list: {
      marginVertical: 4,
    },
    ordered_list: {
      marginVertical: 4,
    },
    list_item: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      marginBottom: 6,
    },
    bullet_list_icon: {
      fontSize: baseFontSize,
      color: Colors.primary,
      marginRight: 10,
      fontWeight: 'bold',
      marginLeft: 4,
    },
    ordered_list_icon: {
      fontSize: baseFontSize,
      color: Colors.primary,
      marginRight: 10,
      fontWeight: 'bold',
      marginLeft: 4,
    },
    hr: {
      backgroundColor: Colors.surfaceContainerHigh,
      height: 1,
      marginVertical: 16,
    },
  });

  // Custom render rules
  const rules = {
    // Underline: renders children with underline style (inherits from parent styles)
    u: (node: any, children: any, _parent: any, _styles: any, inheritedStyles: any = {}) => (
      <Text key={node.key} style={[inheritedStyles, { textDecorationLine: 'underline' }]}>
        {children}
      </Text>
    ),
    // Modern blockquote
    blockquote: (node: any, children: any) => (
      <View key={node.key} style={styles.blockquote}>
        {children}
      </View>
    ),
    // Code blocks
    code_block: (node: any) => (
      <View key={node.key} style={styles.code_block}>
        <Text style={{ color: styles.code_block.color, fontFamily: styles.code_block.fontFamily, fontSize: styles.code_block.fontSize }}>
          {node.content}
        </Text>
      </View>
    ),
    fence: (node: any) => (
      <View key={node.key} style={styles.fence}>
        <Text style={{ color: styles.fence.color, fontFamily: styles.fence.fontFamily, fontSize: styles.fence.fontSize }}>
          {node.content}
        </Text>
      </View>
    ),
  };

  return (
    <View pointerEvents={interactive ? 'auto' : 'none'}>
      <Markdown
        style={styles as any}
        rules={rules}
        markdownit={markdownIt}
        onLinkPress={interactive ? (url) => {
          Linking.openURL(url)
          return false
        } : undefined}
      >
        {processedContent}
      </Markdown>
    </View>
  );
});

MarkdownDisplay.displayName = 'MarkdownDisplay';

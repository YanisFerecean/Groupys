# web/src/components/ui/

shadcn/ui primitives (Radix UI + CVA) plus custom shared UI components.

## Standard shadcn Components

| File | Component | Notes |
|---|---|---|
| `button.tsx` | `Button` | CVA variants: default, destructive, outline, secondary, ghost, link; sizes: default, sm, lg, icon |
| `dialog.tsx` | `Dialog`, `DialogContent`, etc. | Radix Dialog with overlay/close button |
| `input.tsx` | `Input` | Styled `<input>` with `data-slot` |
| `label.tsx` | `Label` | Radix Label |
| `sheet.tsx` | `Sheet`, `SheetContent`, etc. | Radix Dialog as slide-out panel (side: top/right/bottom/left) |
| `tabs.tsx` | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` | Radix Tabs |
| `textarea.tsx` | `Textarea` | Styled `<textarea>` |

## Custom Components

### `AuthMedia.tsx`
Renders authenticated media (image, video, or audio). Conditionally renders `<video>` with controls, `<audio>` with icon, or `<img>`.
- **Props**: `src`, `type: "image" | "video" | "audio"`, `className?`

### `MarkdownContent.tsx`
Markdown renderer config using `react-markdown` + `remark-gfm`. Provides `mdComponents` object with custom styling for headings, code blocks, blockquotes, lists, links.

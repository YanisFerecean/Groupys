import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { Modal, Pressable, Text, View } from 'react-native'

import { MediaMusicOverlay } from '@/components/camera/MediaMusicOverlay'
import { MusicSnippetSheet } from '@/components/camera/MusicSnippetSheet'
import { MusicUpsellSheet } from '@/components/music/MusicUpsellSheet'
import { TrackPicker } from '@/components/music/TrackPicker'
import { TextPromptModal } from '@/components/ui/TextPromptModal'
import { Colors } from '@/constants/colors'
import { useMusicGate } from '@/hooks/useMusicGate'
import type { CaptureType } from '@/types/camera'
import type { MediaMusicAttachment, TrackPayload, TrackRef } from '@/models/ChatPayloads'

type OverlayStyle = MediaMusicAttachment['style']

interface MediaOverlayEditorProps {
  enableMusic: boolean
  mediaType: CaptureType
  music: MediaMusicAttachment | null
  onChange: (music: MediaMusicAttachment | null) => void
  containerWidth: number
  containerHeight: number
}

const STYLE_OPTIONS: { style: OverlayStyle; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { style: 'badge', label: 'Music badge', icon: 'musical-note' },
  { style: 'sticker', label: 'Album sticker', icon: 'albums' },
  { style: 'lyric', label: 'Lyric line', icon: 'text' },
]

/**
 * The music layer drawn over the captured media in the preview. Owns the attach flow
 * (gate → pick track → pick 30s window → pick overlay style → optional lyric) and renders the
 * draggable `MediaMusicOverlay`. Self-contained: brings its own upsell sheet.
 */
export function MediaOverlayEditor({
  enableMusic,
  mediaType,
  music,
  onChange,
  containerWidth,
  containerHeight,
}: MediaOverlayEditorProps) {
  const gate = useMusicGate()
  const [trackPickerOpen, setTrackPickerOpen] = useState(false)
  const [snippetTrack, setSnippetTrack] = useState<TrackPayload | null>(null)
  const [styleChooserOpen, setStyleChooserOpen] = useState(false)
  const [lyricPromptOpen, setLyricPromptOpen] = useState(false)
  // Track + chosen window held while the user picks an overlay style / types a lyric.
  const [pending, setPending] = useState<{ track: TrackRef; startMs: number; durationMs: number } | null>(null)

  const startAttach = () => {
    if (gate.requireMusic('attach music to your photo or video') === 'ok') {
      setTrackPickerOpen(true)
    }
  }

  const handleTrackPicked = (track: TrackPayload) => {
    setTrackPickerOpen(false)
    setSnippetTrack(track)
  }

  const handleSnippetConfirmed = (startMs: number, durationMs: number) => {
    if (!snippetTrack) return
    const { type: _type, ...trackRef } = snippetTrack
    setPending({ track: trackRef, startMs, durationMs })
    setSnippetTrack(null)
    setStyleChooserOpen(true)
  }

  const finalize = (style: OverlayStyle, lyric?: string) => {
    if (!pending) return
    onChange({
      track: pending.track,
      snippetStartMs: pending.startMs,
      snippetDurationMs: pending.durationMs,
      style,
      lyric,
      position: { x: 0.5, y: 0.74 },
      muteVideo: mediaType === 'video' ? true : undefined,
    })
    setPending(null)
  }

  const chooseStyle = (style: OverlayStyle) => {
    setStyleChooserOpen(false)
    if (style === 'lyric') {
      setLyricPromptOpen(true)
    } else {
      finalize(style)
    }
  }

  return (
    <>
      {/* Draggable overlay */}
      {music && containerWidth > 0 && containerHeight > 0 ? (
        <MediaMusicOverlay
          music={music}
          containerWidth={containerWidth}
          containerHeight={containerHeight}
          interactive
          onChangePosition={position => onChange({ ...music, position })}
        />
      ) : null}

      {/* Top-right music controls */}
      {enableMusic ? (
        <View style={{ position: 'absolute', top: 0, right: 0, gap: 10, alignItems: 'flex-end' }}>
          {music ? (
            <>
              {mediaType === 'video' ? (
                <Pressable
                  onPress={() => onChange({ ...music, muteVideo: !music.muteVideo })}
                  style={controlPill}
                >
                  <Ionicons name={music.muteVideo ? 'volume-mute' : 'volume-high'} size={16} color="#fff" />
                  <Text style={controlLabel}>{music.muteVideo ? 'Muted' : 'Sound on'}</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={() => onChange(null)} style={controlPill}>
                <Ionicons name="trash" size={16} color="#fff" />
                <Text style={controlLabel}>Remove</Text>
              </Pressable>
            </>
          ) : (
            <Pressable onPress={startAttach} style={[controlPill, { backgroundColor: Colors.primary }]}>
              <Ionicons name="musical-notes" size={16} color="#fff" />
              <Text style={controlLabel}>Add music</Text>
            </Pressable>
          )}
        </View>
      ) : null}

      <TrackPicker
        visible={trackPickerOpen}
        onClose={() => setTrackPickerOpen(false)}
        onSelect={handleTrackPicked}
      />

      <MusicSnippetSheet
        visible={snippetTrack !== null}
        track={snippetTrack}
        onClose={() => setSnippetTrack(null)}
        onConfirm={handleSnippetConfirmed}
      />

      {/* Overlay style chooser */}
      <Modal visible={styleChooserOpen} transparent animationType="slide" onRequestClose={() => setStyleChooserOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setStyleChooserOpen(false)} />
          <View style={{ backgroundColor: Colors.surfaceContainerLowest, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 36 }}>
            <Text className="mb-4 text-lg font-bold text-on-surface">Choose an overlay</Text>
            {STYLE_OPTIONS.map(option => (
              <Pressable
                key={option.style}
                onPress={() => chooseStyle(option.style)}
                className="mb-2 flex-row items-center gap-3 rounded-2xl bg-surface-container px-4 py-4"
              >
                <Ionicons name={option.icon} size={22} color={Colors.primary} />
                <Text className="text-base font-semibold text-on-surface">{option.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      <TextPromptModal
        visible={lyricPromptOpen}
        title="Add a lyric line"
        placeholder="Type the lyric to show…"
        multiline
        submitLabel="Add"
        onClose={() => {
          setLyricPromptOpen(false)
          setPending(null)
        }}
        onSubmit={text => {
          setLyricPromptOpen(false)
          finalize('lyric', text.trim() || undefined)
        }}
      />

      <MusicUpsellSheet
        visible={gate.upsell.visible}
        mode={gate.upsell.mode}
        action={gate.upsell.action}
        onClose={gate.closeUpsell}
      />
    </>
  )
}

const controlPill = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 6,
  backgroundColor: 'rgba(0,0,0,0.5)',
  borderRadius: 18,
  paddingHorizontal: 12,
  paddingVertical: 8,
}

const controlLabel = { color: '#fff', fontWeight: '700' as const, fontSize: 13 }

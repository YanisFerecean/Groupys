import type { AudioSource } from 'expo-audio'

import type { VoiceBedPayload } from '@/models/ChatPayloads'

export interface VoiceBedOption extends VoiceBedPayload {
  description: string
  source: AudioSource
}

/** Original synthesized beds bundled with the app; no subscription or relayed audio involved. */
export const VOICE_BEDS: VoiceBedOption[] = [
  {
    id: 'pulse',
    title: 'Pulse',
    kind: 'BUNDLED',
    description: 'Minimal low-end pulse',
    source: require('../assets/audio/pulse-bed.wav'),
  },
  {
    id: 'neon',
    title: 'Neon',
    kind: 'BUNDLED',
    description: 'Bright rhythmic shimmer',
    source: require('../assets/audio/neon-bed.wav'),
  },
  {
    id: 'drift',
    title: 'Drift',
    kind: 'BUNDLED',
    description: 'Slow ambient movement',
    source: require('../assets/audio/drift-bed.wav'),
  },
]

export function getVoiceBedSource(id: string | undefined): AudioSource {
  return VOICE_BEDS.find(bed => bed.id === id)?.source ?? null
}

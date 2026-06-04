import type { TopAlbum, TopArtist, TopSong } from '@/models/ProfileCustomization'

export type StepKey =
  | 'welcome'
  | 'account'
  | 'greeting'
  | 'bio'
  | 'country'
  | 'tags'
  | 'musicIntro'
  | 'building'
  | 'musicReview'
  | 'manual'
  | 'reveal'
  | 'follow'

export interface OnboardingData {
  displayName: string
  username: string
  bio: string
  country: string
  tags: string[]
  topArtists: TopArtist[]
  topSongs: TopSong[]
  topAlbums: TopAlbum[]
  /** Catalog entity IDs of manually-picked artists, for discovery seeding. */
  manualArtistIds: number[]
  musicConnected: boolean
}

export const EMPTY_ONBOARDING: OnboardingData = {
  displayName: '',
  username: '',
  bio: '',
  country: '',
  tags: [],
  topArtists: [],
  topSongs: [],
  topAlbums: [],
  manualArtistIds: [],
  musicConnected: false,
}

/** Major steps shown in the progress bar. Sub-steps map onto these. */
export const PROGRESS_STEPS: StepKey[] = [
  'account',
  'bio',
  'country',
  'tags',
  'musicIntro',
  'reveal',
  'follow',
]

const PROGRESS_GROUP: Partial<Record<StepKey, StepKey>> = {
  greeting: 'account',
  building: 'musicIntro',
  musicReview: 'musicIntro',
  manual: 'musicIntro',
}

/** 1-based index of a step within PROGRESS_STEPS, or 0 to hide the bar. */
export function progressIndex(step: StepKey): number {
  if (step === 'welcome') return 0
  const group = PROGRESS_GROUP[step] ?? step
  const idx = PROGRESS_STEPS.indexOf(group)
  return idx < 0 ? 0 : idx + 1
}

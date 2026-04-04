import type { CommunityResDto } from '@/models/CommunityRes'
import type { Community } from '@/models/Community'
import { toAbsoluteUrl } from '@/lib/media'

const PALETTES = [
  { color: '#7c3aed', icon: 'disc' },
  { color: '#be185d', icon: 'heart' },
  { color: '#0891b2', icon: 'musical-notes' },
  { color: '#b45309', icon: 'flame' },
  { color: '#059669', icon: 'volume-high' },
  { color: '#6366f1', icon: 'star' },
] as const

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

export function communityResToCard(dto: CommunityResDto): Community {
  const idx = hashCode(dto.id) % PALETTES.length
  const palette = PALETTES[idx]

  return {
    id: dto.id,
    name: dto.name,
    tagline: dto.description || dto.genre || '',
    members: dto.memberCount,
    color: palette.color,
    icon: palette.icon,
    isLive: false,
    bannerUrl: toAbsoluteUrl(dto.bannerUrl),
    iconUrl: toAbsoluteUrl(dto.iconUrl),
    iconEmoji: dto.iconEmoji,
    iconType: dto.iconType,
  }
}

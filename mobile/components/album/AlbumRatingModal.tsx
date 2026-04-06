import { useCallback, useEffect } from 'react'
import { router } from 'expo-router'
import type { TopAlbum } from '@/models/ProfileCustomization'

interface AlbumRatingModalProps {
  visible: boolean
  onClose: () => void
  album: TopAlbum | null
  currentUserId?: string
  onRatingChange?: (albumId: number, score: number | null) => void
}

export default function AlbumRatingModal({
  visible,
  onClose,
  album,
  currentUserId,
}: AlbumRatingModalProps) {
  const openSheet = useCallback(() => {
    if (!album?.id) return
    router.push({
      pathname: '/(home)/(profile)/rating',
      params: {
        albumId: String(album.id),
        albumTitle: album.title ?? '',
        albumCoverUrl: album.coverUrl ?? '',
        artistName: album.artist ?? '',
        currentUserId: currentUserId ?? '',
      },
    })
  }, [album, currentUserId])

  useEffect(() => {
    if (visible && album?.id) {
      openSheet()
    }
  }, [visible, album?.id, openSheet])

  // Return null since this is just a navigation trigger now
  return null
}

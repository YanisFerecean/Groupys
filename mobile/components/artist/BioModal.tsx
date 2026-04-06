import { useCallback, useEffect } from 'react'
import { router } from 'expo-router'

interface BioModalProps {
  visible: boolean
  onClose: () => void
  name: string
  bio: string
}

export default function BioModal({ visible, onClose, name, bio }: BioModalProps) {
  const openSheet = useCallback(() => {
    router.push({
      pathname: '/(home)/(profile)/artist/bio',
      params: { name, bio },
    })
  }, [name, bio])

  useEffect(() => {
    if (visible && name) {
      openSheet()
    }
  }, [visible, name, openSheet])

  return null
}

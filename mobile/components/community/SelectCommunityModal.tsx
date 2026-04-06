import { useCallback, useEffect } from 'react'
import { router } from 'expo-router'

interface SelectCommunityModalProps {
  visible: boolean
  onClose: () => void
  selectedCommunityId?: string
}

export default function SelectCommunityModal({
  visible,
  onClose,
  selectedCommunityId,
}: SelectCommunityModalProps) {
  const openSheet = useCallback(() => {
    router.push({
      pathname: '/(home)/(create-post)/select-community',
      params: {
        selectedCommunityId: selectedCommunityId ?? '',
      },
    })
  }, [selectedCommunityId])

  useEffect(() => {
    if (visible) {
      openSheet()
    }
  }, [visible, openSheet])

  // Return null since this is just a navigation trigger now
  return null
}

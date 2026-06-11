import { Platform } from 'react-native'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import CommentsSheet from '@/components/post/CommentsSheet'

const SHEET_BG = '#0e0e10'

function IOSCommentsSheet({ id }: { id: string }) {
  return (
    <>
      <Stack.Screen
        options={{
          presentation: 'formSheet',
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.7, 1],
          sheetCornerRadius: 20,
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
          animation: 'slide_from_bottom',
        }}
      />
      <CommentsSheet postId={id} />
    </>
  )
}

function AndroidCommentsSheet({ id }: { id: string }) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Host, ModalBottomSheet, RNHostView } = require('@expo/ui/jetpack-compose')

  return (
    <Host matchContents>
      <ModalBottomSheet
        containerColor={SHEET_BG}
        showDragHandle
        onDismissRequest={() => router.back()}
      >
        <RNHostView matchContents>
          <CommentsSheet postId={id} />
        </RNHostView>
      </ModalBottomSheet>
    </Host>
  )
}

export default function FeedCommentsSheet() {
  const { id } = useLocalSearchParams<{ id: string }>()

  if (Platform.OS === 'android') {
    return <AndroidCommentsSheet id={id!} />
  }

  return <IOSCommentsSheet id={id!} />
}

import { Stack } from 'expo-router'

export default function FeedLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="comments/[id]"
        options={{
          presentation: 'formSheet',
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.7, 1],
          sheetCornerRadius: 20,
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
    </Stack>
  )
}

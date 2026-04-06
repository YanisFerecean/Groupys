import { Stack } from 'expo-router'

export default function ChatLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="requests" />
      <Stack.Screen name="[conversationId]" />
      <Stack.Screen
        name="new"
        options={{
          presentation: 'formSheet',
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.75],
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
    </Stack>
  )
}

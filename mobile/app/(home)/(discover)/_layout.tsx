import { Stack } from 'expo-router'

export default function DiscoverLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="index"
        options={{ animation: 'fade' }}
      />
      <Stack.Screen
        name="communities"
        options={{ animation: 'slide_from_right', gestureEnabled: true }}
      />
      <Stack.Screen
        name="community/[id]"
        options={{ animation: 'slide_from_right', gestureEnabled: true }}
      />
      <Stack.Screen
        name="post/[id]"
        options={{ animation: 'slide_from_right', gestureEnabled: true }}
      />
      <Stack.Screen
        name="user/[userId]"
        options={{ animation: 'slide_from_right', gestureEnabled: true }}
      />
      <Stack.Screen
        name="artist/[id]"
        options={{
          presentation: 'fullScreenModal',
        }}
      />
      <Stack.Screen
        name="artist-communities"
        options={{ presentation: 'formSheet', sheetGrabberVisible: true, sheetAllowedDetents: [0.75], contentStyle: { backgroundColor: 'transparent' } }}
      />
      <Stack.Screen
        name="artist/create-community"
        options={{ presentation: 'formSheet', sheetGrabberVisible: true, sheetAllowedDetents: [0.75], contentStyle: { backgroundColor: 'transparent' } }}
      />
    </Stack>
  )
}

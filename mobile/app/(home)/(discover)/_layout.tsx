import { Stack } from 'expo-router'

export default function DiscoverLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen
        name="index"
      />
      <Stack.Screen
        name="communities"
        options={{
          animation: 'slide_from_right',
        }}
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
        name="artist/bio"
        options={{ presentation: 'formSheet', sheetGrabberVisible: true, sheetAllowedDetents: [0.75], contentStyle: { backgroundColor: 'transparent' } }}
      />
      <Stack.Screen
        name="artist/create-community"
        options={{ presentation: 'formSheet', sheetGrabberVisible: true, sheetAllowedDetents: [0.75], contentStyle: { backgroundColor: 'transparent' } }}
      />
    </Stack>
  )
}

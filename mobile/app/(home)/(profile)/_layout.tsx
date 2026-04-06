import { Stack } from 'expo-router'

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="rated-albums" />
      <Stack.Screen name="rating" options={{ presentation: 'formSheet', sheetGrabberVisible: true, sheetAllowedDetents: [0.75], contentStyle: { backgroundColor: 'transparent' } }} />
      <Stack.Screen name="artist-communities" options={{ presentation: 'formSheet', sheetGrabberVisible: true, sheetAllowedDetents: [0.75], contentStyle: { backgroundColor: 'transparent' } }} />
      <Stack.Screen name="artist/bio" options={{ presentation: 'formSheet', sheetGrabberVisible: true, sheetAllowedDetents: [0.75], contentStyle: { backgroundColor: 'transparent' } }} />
      <Stack.Screen name="artist/create-community" options={{ presentation: 'formSheet', sheetGrabberVisible: true, sheetAllowedDetents: [0.75], contentStyle: { backgroundColor: 'transparent' } }} />
    </Stack>
  )
}

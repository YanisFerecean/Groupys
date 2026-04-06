import { Stack } from 'expo-router'

export default function CreatePostLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="select-community"
        options={{
          presentation: 'formSheet',
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.5, 0.75, 0.95],
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
    </Stack>
  )
}

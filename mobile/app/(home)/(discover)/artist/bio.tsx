import { useEffect, useRef, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { BlurView } from 'expo-blur'
import { Stack, useLocalSearchParams, router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors } from '@/constants/colors'

function BioContent() {
  const { name, bio } = useLocalSearchParams<{ name: string; bio: string }>()
  const insets = useSafeAreaInsets()

  const cleanBio = bio
    ?.replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim() ?? ''

  const paragraphs = cleanBio ? cleanBio.split('\n').filter((p) => p.trim()) : []
  const artistName = name ?? ''

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 36, paddingBottom: Math.max(insets.bottom, 20) + 16 }}
    >
      {/* Header */}
      <View style={{ marginBottom: 16 }}>
        <Text
          style={{ fontSize: 20, fontFamily: 'DMSans_700Bold', color: Colors.onSurface }}
          numberOfLines={1}
        >
          About{' '}
          <Text style={{ color: Colors.primary }}>{artistName}</Text>
        </Text>
      </View>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: Colors.outlineVariant, marginBottom: 20 }} />

      {/* Bio content */}
      {paragraphs.length > 0 ? (
        <View style={{ gap: 16 }}>
          {paragraphs.map((paragraph, index) => (
            <Text
              key={index}
              selectable
              style={{
                fontSize: 15,
                lineHeight: 24,
                fontFamily: 'DMSans_400Regular',
                color: Colors.onSurfaceVariant,
                letterSpacing: 0.1,
              }}
            >
              {paragraph}
            </Text>
          ))}
        </View>
      ) : (
        <View style={{ alignItems: 'center', paddingTop: 40 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: Colors.surfaceContainerHigh,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 28 }}>&#127925;</Text>
          </View>
          <Text
            style={{
              fontSize: 16,
              fontFamily: 'DMSans_500Medium',
              color: Colors.onSurface,
              marginBottom: 6,
            }}
          >
            No bio yet
          </Text>
          <Text
            style={{
              fontSize: 13,
              fontFamily: 'DMSans_400Regular',
              color: Colors.outline,
            }}
          >
            {artistName} hasn&apos;t added a bio
          </Text>
        </View>
      )}
    </ScrollView>
  )
}

// ─── iOS Form Sheet ──────────────────────────────────────────────────────────

function IOSBioSheet() {
  const useGlass = isLiquidGlassAvailable()

  return (
    <>
      <Stack.Screen
        options={{
          presentation: 'formSheet',
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.75],
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
          animation: 'slide_from_bottom',
        }}
      />
      {useGlass ? (
        <GlassView style={{ flex: 1, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' }}>
          <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
            <BioContent />
          </KeyboardAvoidingView>
        </GlassView>
      ) : (
        <BlurView tint="systemMaterial" intensity={100} style={{ flex: 1, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' }}>
          <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
            <BioContent />
          </KeyboardAvoidingView>
        </BlurView>
      )}
    </>
  )
}

// ─── Android Modal Bottom Sheet ──────────────────────────────────────────────

function AndroidBioSheet() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Host, ModalBottomSheet, RNHostView } = require('@expo/ui/jetpack-compose')

  return (
    <Host matchContents>
      <ModalBottomSheet
        containerColor={Colors.surface}
        showDragHandle
        onDismissRequest={() => router.back()}
      >
        <RNHostView matchContents>
          <KeyboardAvoidingView behavior="height" style={{ flex: 1 }}>
            <BioContent />
          </KeyboardAvoidingView>
        </RNHostView>
      </ModalBottomSheet>
    </Host>
  )
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function ArtistBioSheet() {
  if (Platform.OS === 'android') {
    return <AndroidBioSheet />
  }

  return <IOSBioSheet />
}

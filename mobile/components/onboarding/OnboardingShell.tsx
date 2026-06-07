import { type PropsWithChildren, type ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors } from '@/constants/colors'
import StepProgressBar from './StepProgressBar'
import PrimaryButton from './PrimaryButton'

interface OnboardingShellProps {
  title: string
  subtitle?: string
  /** Progress as [current, total]; omit to hide the bar. */
  progress?: [number, number]
  onBack?: () => void
  /** Primary CTA. Omit to render a custom footer instead. */
  ctaLabel?: string
  onCta?: () => void
  ctaDisabled?: boolean
  ctaLoading?: boolean
  onSkip?: () => void
  skipLabel?: string
  /** Replaces the default CTA footer entirely. */
  footer?: ReactNode
}

export default function OnboardingShell({
  title,
  subtitle,
  progress,
  onBack,
  ctaLabel,
  onCta,
  ctaDisabled,
  ctaLoading,
  onSkip,
  skipLabel = 'Skip',
  footer,
  children,
}: PropsWithChildren<OnboardingShellProps>) {
  const insets = useSafeAreaInsets()

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-surface"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={[Colors.primaryContainer, Colors.secondaryContainer, Colors.surface]}
        locations={[0, 0.4, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="absolute left-0 right-0 top-0 h-[260px]"
      />

      <View style={{ paddingTop: insets.top + 8 }} className="px-6">
        <View className="flex-row items-center gap-3">
          {onBack ? (
            <TouchableOpacity
              onPress={onBack}
              className="h-10 w-10 items-center justify-center rounded-full bg-surface-container-lowest/80"
            >
              <Ionicons name="chevron-back" size={22} color={Colors.onSurface} />
            </TouchableOpacity>
          ) : (
            <View className="h-10 w-10" />
          )}
          {progress ? (
            <View className="flex-1">
              <StepProgressBar current={progress[0]} total={progress[1]} />
            </View>
          ) : (
            <View className="flex-1" />
          )}
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-4xl font-black tracking-tighter text-on-surface">{title}</Text>
        {subtitle ? (
          <Text className="mt-3 text-lg leading-6 text-on-surface-variant">{subtitle}</Text>
        ) : null}
        <View className="mt-8">{children}</View>
      </ScrollView>

      <View style={{ paddingBottom: insets.bottom + 12 }} className="px-6 pt-3">
        {footer ?? (
          <>
            {ctaLabel && onCta ? (
              <PrimaryButton
                label={ctaLabel}
                onPress={onCta}
                disabled={ctaDisabled}
                loading={ctaLoading}
              />
            ) : null}
            {onSkip ? (
              <TouchableOpacity onPress={onSkip} className="mt-3 items-center py-2">
                <Text className="text-base font-semibold text-on-surface-variant">{skipLabel}</Text>
              </TouchableOpacity>
            ) : null}
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  )
}

import { LinearGradient } from 'expo-linear-gradient'
import { type PropsWithChildren, type ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors } from '@/constants/colors'

interface AuthScaffoldProps {
  title: string
  subtitle: string
  footer?: ReactNode
}

export default function AuthScaffold({
  title,
  subtitle,
  footer,
  children,
}: PropsWithChildren<AuthScaffoldProps>) {
  const insets = useSafeAreaInsets()

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-surface"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="flex-1 bg-surface">
        <View className="absolute left-0 right-0 top-0 h-[320px] overflow-hidden">
          <LinearGradient
            colors={[Colors.primaryContainer, Colors.secondaryContainer, Colors.surface]}
            locations={[0, 0.45, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="absolute inset-0"
          />
          <View className="absolute -left-8 top-12 h-28 w-28 rounded-full bg-white/20" />
          <View className="absolute right-[-36] top-16 h-44 w-44 rounded-full bg-primary/15" />
          <View className="absolute left-16 top-40 h-16 w-16 rounded-full bg-white/15" />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 32,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="px-6">
            <Text className="text-5xl font-extrabold tracking-tighter text-primary">Groupys</Text>

            <Text className="mt-7 max-w-[280px] text-5xl font-black tracking-tighter text-on-surface">
              {title}
            </Text>
            <Text className="mt-3 max-w-[320px] text-base leading-6 text-on-surface-variant">
              {subtitle}
            </Text>

            <View className="mt-8 rounded-[32px] border border-white/80 bg-surface-container-lowest p-6 shadow-sm">
              {children}
            </View>

            {footer ? <View className="mt-6">{footer}</View> : null}
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  )
}

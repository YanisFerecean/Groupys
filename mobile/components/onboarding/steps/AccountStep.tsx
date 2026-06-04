import { useState } from 'react'
import { Text, View } from 'react-native'
import AuthTextField from '@/components/auth/AuthTextField'
import {
  normalizeDisplayName,
  normalizeUsername,
  validateDisplayName,
  validateUsername,
} from '@/lib/auth'
import OnboardingShell from '../OnboardingShell'

interface AccountStepProps {
  initialDisplayName: string
  initialUsername: string
  saving: boolean
  submitError: string | null
  progress: [number, number]
  onBack: () => void
  onSubmit: (displayName: string, username: string) => void
}

export default function AccountStep({
  initialDisplayName,
  initialUsername,
  saving,
  submitError,
  progress,
  onBack,
  onSubmit,
}: AccountStepProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [username, setUsername] = useState(initialUsername)
  const [touched, setTouched] = useState(false)

  const displayNameError = touched ? validateDisplayName(displayName) : null
  const usernameError = touched ? validateUsername(username) : null
  const valid = !validateDisplayName(displayName) && !validateUsername(username)

  const handleContinue = () => {
    setTouched(true)
    if (!valid) return
    onSubmit(normalizeDisplayName(displayName), normalizeUsername(username))
  }

  return (
    <OnboardingShell
      title="First, the basics"
      subtitle="How should people find and recognize you on Groupys?"
      progress={progress}
      onBack={onBack}
      ctaLabel="Continue"
      onCta={handleContinue}
      ctaLoading={saving}
      ctaDisabled={!valid}
    >
      <AuthTextField
        label="Display name"
        error={displayNameError}
        value={displayName}
        onChangeText={setDisplayName}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        autoFocus
        placeholder="How people will see your name"
      />
      <AuthTextField
        label="Username"
        error={usernameError}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoComplete="username-new"
        textContentType="username"
        placeholder="your public handle"
      />
      {submitError ? (
        <View className="mt-1 rounded-2xl bg-red-50 px-4 py-3">
          <Text className="text-base text-red-600">{submitError}</Text>
        </View>
      ) : null}
    </OnboardingShell>
  )
}

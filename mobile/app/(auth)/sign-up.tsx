import { useSignUp } from '@clerk/expo'
import { Link, useRouter } from 'expo-router'
import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import SSOButtons from '@/components/auth/SSOButtons'

export default function SignUpScreen() {
  const { signUp, setActive, isLoaded } = useSignUp()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [pendingVerification, setPendingVerification] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignUp() {
    if (!isLoaded) return
    setLoading(true)
    setError('')
    try {
      await signUp.create({ emailAddress: email, password })
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
      setPendingVerification(true)
    } catch (err: any) {
      setError(err.errors?.[0]?.message ?? 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify() {
    if (!isLoaded) return
    setLoading(true)
    setError('')
    try {
      const result = await signUp.attemptEmailAddressVerification({ code })
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
        router.replace('/(home)')
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message ?? 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  if (pendingVerification) {
    return (
      <KeyboardAvoidingView
        className="flex-1 bg-white dark:bg-black"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View className="flex-1 justify-center px-6">
          <Text className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
            Check your email
          </Text>
          <Text className="mb-8 text-gray-500 dark:text-gray-400">
            We sent a verification code to {email}
          </Text>

          {error ? (
            <Text className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </Text>
          ) : null}

          <TextInput
            className="mb-6 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-center text-2xl tracking-widest text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            placeholder="000000"
            placeholderTextColor="#9ca3af"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
          />

          <TouchableOpacity
            className="items-center rounded-xl bg-primary py-4 active:opacity-90"
            onPress={handleVerify}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-base font-semibold text-white">Verify email</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    )
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white dark:bg-black"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-1 justify-center px-6"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="mb-8 text-3xl font-bold text-gray-900 dark:text-white">Create account</Text>

        {error ? (
          <Text className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </Text>
        ) : null}

        {/* SSO Buttons */}
        <SSOButtons onError={setError} />

        {/* Divider */}
        <View className="my-6 flex-row items-center gap-3">
          <View className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          <Text className="text-sm text-gray-400">or</Text>
          <View className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
        </View>

        {/* Email/Password */}
        <TextInput
          className="mb-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-base text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          placeholder="Email"
          placeholderTextColor="#9ca3af"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />

        <TextInput
          className="mb-6 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-base text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          placeholder="Password"
          placeholderTextColor="#9ca3af"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
        />

        <TouchableOpacity
          className="items-center rounded-xl bg-primary py-4 active:opacity-90"
          onPress={handleSignUp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base font-semibold text-white">Create account</Text>
          )}
        </TouchableOpacity>

        <View className="mt-6 flex-row justify-center">
          <Text className="text-gray-500 dark:text-gray-400">Already have an account? </Text>
          <Link href="/(auth)/sign-in">
            <Text className="font-semibold text-primary">Sign in</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

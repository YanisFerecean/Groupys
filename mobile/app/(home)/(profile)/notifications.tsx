import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@clerk/expo'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors } from '@/constants/colors'
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from '@/lib/api'
import { sendLocalTestNotification } from '@/lib/notifications'

const DEFAULT_QUIET_START = 22 * 60 // 22:00
const DEFAULT_QUIET_END = 7 * 60 // 07:00

const DEFAULTS: NotificationPreferences = {
  matchesEnabled: true,
  messagesEnabled: true,
  communityEnabled: true,
  hotTakesEnabled: true,
  retentionEnabled: true,
  quietStartMinute: null,
  quietEndMinute: null,
  timezone: null,
}

function formatMinute(minute: number): string {
  const h = Math.floor(minute / 60)
  const m = minute % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

export default function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { getToken } = useAuth()

  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const token = await getToken()
        const loaded = await fetchNotificationPreferences(token)
        if (!cancelled) setPrefs(loaded)
      } catch {
        if (!cancelled) setPrefs(DEFAULTS)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [getToken])

  const quietEnabled = prefs.quietStartMinute != null && prefs.quietEndMinute != null

  function patch(next: Partial<NotificationPreferences>) {
    setPrefs((prev) => ({ ...prev, ...next }))
  }

  function toggleQuiet(on: boolean) {
    if (on) {
      patch({ quietStartMinute: DEFAULT_QUIET_START, quietEndMinute: DEFAULT_QUIET_END, timezone: deviceTimezone() })
    } else {
      patch({ quietStartMinute: null, quietEndMinute: null })
    }
  }

  function step(field: 'quietStartMinute' | 'quietEndMinute', delta: number) {
    const current = prefs[field] ?? 0
    const next = (current + delta + 1440) % 1440
    patch({ [field]: next } as Partial<NotificationPreferences>)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const token = await getToken()
      const saved = await updateNotificationPreferences(token, {
        ...prefs,
        timezone: prefs.timezone ?? deviceTimezone(),
      })
      setPrefs(saved)
      router.back()
    } catch {
      // keep the screen open so the user can retry
    } finally {
      setSaving(false)
    }
  }

  return (
    <View className="flex-1 bg-surface">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-5" style={{ paddingTop: insets.top + 8 }}>
          <View className="flex-row items-center gap-3">
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={Colors.onSurface} />
            </TouchableOpacity>
            <Text className="text-2xl font-extrabold text-on-surface">Notifications</Text>
          </View>
          <Text className="text-2xl font-extrabold tracking-wider" style={{ color: Colors.primary }}>
            Groupys
          </Text>
        </View>

        {loading ? (
          <View className="items-center pt-24">
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : (
          <>
            {/* Categories */}
            <View className="px-5 pt-8">
              <Text className="text-xl font-bold text-on-surface">Push notifications</Text>
              <Text className="mt-1 text-sm text-on-surface-variant">
                Choose what Groupys can ping you about.
              </Text>

              <View className="mt-5 rounded-2xl bg-surface-container-lowest p-4 gap-4">
                <ToggleRow
                  icon="heart"
                  label="New matches"
                  value={prefs.matchesEnabled}
                  onToggle={(v) => patch({ matchesEnabled: v })}
                />
                <ToggleRow
                  icon="chatbubble-ellipses"
                  label="Messages"
                  value={prefs.messagesEnabled}
                  onToggle={(v) => patch({ messagesEnabled: v })}
                />
                <ToggleRow
                  icon="people"
                  label="Community posts"
                  value={prefs.communityEnabled}
                  onToggle={(v) => patch({ communityEnabled: v })}
                />
                <ToggleRow
                  icon="flame"
                  label="Hot takes"
                  value={prefs.hotTakesEnabled}
                  onToggle={(v) => patch({ hotTakesEnabled: v })}
                />
                <ToggleRow
                  icon="sparkles"
                  label="Streaks & reminders"
                  value={prefs.retentionEnabled}
                  onToggle={(v) => patch({ retentionEnabled: v })}
                />
              </View>
            </View>

            {/* Quiet hours */}
            <View className="px-5 pt-8">
              <Text className="text-xl font-bold text-on-surface">Quiet hours</Text>
              <Text className="mt-1 text-sm text-on-surface-variant">
                Pause non-urgent notifications overnight. Matches and messages still come through.
              </Text>

              <View className="mt-5 rounded-2xl bg-surface-container-lowest p-4 gap-4">
                <ToggleRow
                  icon="moon"
                  label="Enable quiet hours"
                  value={quietEnabled}
                  onToggle={toggleQuiet}
                />
                {quietEnabled ? (
                  <>
                    <TimeStepperRow
                      label="From"
                      value={formatMinute(prefs.quietStartMinute ?? DEFAULT_QUIET_START)}
                      onMinus={() => step('quietStartMinute', -30)}
                      onPlus={() => step('quietStartMinute', 30)}
                    />
                    <TimeStepperRow
                      label="To"
                      value={formatMinute(prefs.quietEndMinute ?? DEFAULT_QUIET_END)}
                      onMinus={() => step('quietEndMinute', -30)}
                      onPlus={() => step('quietEndMinute', 30)}
                    />
                  </>
                ) : null}
              </View>
            </View>

            {/* Save */}
            <View className="px-5 pt-10">
              <TouchableOpacity
                className={`items-center rounded-2xl py-4 ${saving ? 'opacity-70' : ''}`}
                style={{ backgroundColor: Colors.primary }}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={Colors.onPrimary} />
                ) : (
                  <Text className="font-semibold" style={{ color: Colors.onPrimary }}>
                    Save preferences
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Dev-only: local notification test (works in the simulator, no APNs needed) */}
            {__DEV__ ? (
              <View className="px-5 pt-4">
                <TouchableOpacity
                  className="flex-row items-center justify-center gap-2 rounded-2xl border py-4"
                  style={{ borderColor: Colors.primary }}
                  onPress={() => sendLocalTestNotification()}
                >
                  <Ionicons name="flask" size={18} color={Colors.primary} />
                  <Text className="font-semibold" style={{ color: Colors.primary }}>
                    Send test notification
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  )
}

function ToggleRow({
  icon,
  label,
  value,
  onToggle,
}: {
  icon: string
  label: string
  value: boolean
  onToggle: (v: boolean) => void
}) {
  return (
    <View className="flex-row items-center gap-3">
      <Ionicons name={icon as never} size={20} color={Colors.onSurfaceVariant} />
      <Text className="flex-1 text-on-surface">{label}</Text>
      <Switch value={value} onValueChange={onToggle} trackColor={{ true: Colors.primary }} />
    </View>
  )
}

function TimeStepperRow({
  label,
  value,
  onMinus,
  onPlus,
}: {
  label: string
  value: string
  onMinus: () => void
  onPlus: () => void
}) {
  return (
    <View className="flex-row items-center gap-3">
      <Text className="flex-1 text-on-surface">{label}</Text>
      <TouchableOpacity onPress={onMinus} hitSlop={8} className="h-9 w-9 items-center justify-center rounded-full bg-surface-container-high">
        <Ionicons name="remove" size={18} color={Colors.onSurface} />
      </TouchableOpacity>
      <Text className="w-16 text-center text-base font-semibold text-on-surface">{value}</Text>
      <TouchableOpacity onPress={onPlus} hitSlop={8} className="h-9 w-9 items-center justify-center rounded-full bg-surface-container-high">
        <Ionicons name="add" size={18} color={Colors.onSurface} />
      </TouchableOpacity>
    </View>
  )
}

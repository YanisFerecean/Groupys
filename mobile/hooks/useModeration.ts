import { useCallback } from 'react'
import { Alert, type AlertButton } from 'react-native'
import { useAuthToken } from '@/hooks/useAuthToken'
import {
  blockUser,
  REPORT_REASONS,
  reportContent,
  type ReportTargetType,
} from '@/lib/moderation-api'
import { useNotificationBannerStore } from '@/stores/useNotificationBannerStore'

export interface ModerationTarget {
  /** What is being reported. */
  targetType: ReportTargetType
  /** ID of the reported entity (user / message / post / community). */
  targetId: string
  /** Set for blockable targets (the offending user). Enables the "Block" action. */
  userId?: string
  /** Display name used in confirmation copy. */
  displayName?: string
  /** Called after a successful block so the screen can refresh / navigate away. */
  onBlocked?: () => void
}

/**
 * Shared report/block flows built on Alert dialogs and the in-app banner store.
 * Surfaces a Report/Block menu, a reason picker, and a destructive block confirmation.
 */
export function useModeration() {
  const { token } = useAuthToken()
  const showBanner = useNotificationBannerStore((s) => s.show)

  const toast = useCallback(
    (title: string, body?: string) => {
      showBanner({ id: `mod-${Date.now()}`, title, body })
    },
    [showBanner],
  )

  const promptReport = useCallback(
    (target: ModerationTarget) => {
      const buttons: AlertButton[] = REPORT_REASONS.map((r) => ({
        text: r.label,
        onPress: async () => {
          try {
            await reportContent(
              { targetType: target.targetType, targetId: target.targetId, reason: r.value },
              token,
            )
            toast('Report submitted', 'Thanks — our team will review it.')
          } catch {
            Alert.alert('Error', 'Could not submit your report. Please try again.')
          }
        },
      }))
      buttons.push({ text: 'Cancel', style: 'cancel' })
      Alert.alert('Report', 'Why are you reporting this?', buttons, { cancelable: true })
    },
    [token, toast],
  )

  const confirmBlock = useCallback(
    (target: ModerationTarget) => {
      if (!target.userId) return
      const name = target.displayName?.trim() || 'this user'
      Alert.alert(
        `Block ${name}?`,
        "They won't be able to message you or see your activity. You'll be unmatched and your conversation will be removed.",
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Block',
            style: 'destructive',
            onPress: async () => {
              try {
                await blockUser(target.userId!, token)
                toast('User blocked')
                target.onBlocked?.()
              } catch {
                Alert.alert('Error', 'Could not block this user. Please try again.')
              }
            },
          },
        ],
      )
    },
    [token, toast],
  )

  const showModerationMenu = useCallback(
    (target: ModerationTarget) => {
      const buttons: AlertButton[] = [{ text: 'Report', onPress: () => promptReport(target) }]
      if (target.userId) {
        buttons.push({
          text: 'Block user',
          style: 'destructive',
          onPress: () => confirmBlock(target),
        })
      }
      buttons.push({ text: 'Cancel', style: 'cancel' })
      Alert.alert('Options', undefined, buttons, { cancelable: true })
    },
    [promptReport, confirmBlock],
  )

  return { showModerationMenu, promptReport, confirmBlock }
}

import * as Linking from 'expo-linking'
import type { Href, Router } from 'expo-router'

type HookFieldError = { message: string } | null | undefined
type HookErrors<T extends object> = {
  fields: T
  global: Array<{ message: string }> | null
}

type FinalizeNavigationParams = {
  decorateUrl: (path: string) => string
  session?: {
    currentTask?: {
      key: string
    } | null
  } | null
}

export function getClerkErrorMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== 'object') {
    return fallback
  }

  const clerkError = error as {
    longMessage?: string
    message?: string
    errors?: Array<{
      longMessage?: string
      message?: string
    }>
  }

  return (
    clerkError.errors?.[0]?.longMessage ??
    clerkError.errors?.[0]?.message ??
    clerkError.longMessage ??
    clerkError.message ??
    fallback
  )
}

export function getFirstErrorMessage<T extends object>(
  errors: HookErrors<T>,
  fields: Array<keyof T>,
  fallback?: string | null,
) {
  for (const field of fields) {
    const message = (errors.fields[field] as HookFieldError)?.message
    if (message) {
      return message
    }
  }

  return errors.global?.[0]?.message ?? fallback ?? null
}

export async function navigateAfterClerkAuth(
  router: Router,
  { decorateUrl, session }: FinalizeNavigationParams,
) {
  if (session?.currentTask) {
    console.warn(`Unhandled Clerk session task: ${session.currentTask.key}`)
  }

  const url = decorateUrl('/')

  if (/^https?:\/\//.test(url)) {
    await Linking.openURL(url)
    return
  }

  router.replace(url as Href)
}

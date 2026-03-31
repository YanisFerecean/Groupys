export const MIN_USERNAME_LENGTH = 4
export const MAX_USERNAME_LENGTH = 30
export const MIN_DISPLAY_NAME_LENGTH = 2
export const MAX_DISPLAY_NAME_LENGTH = 50
export const MIN_PASSWORD_LENGTH = 8

const EMAIL_ADDRESS_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_REGEX = /^[A-Za-z0-9](?:[A-Za-z0-9._]*[A-Za-z0-9])?$/

type UserLike = {
  username: string | null
  fullName?: string | null
  firstName?: string | null
  lastName?: string | null
  unsafeMetadata?: Record<string, unknown> | null
} | null | undefined

export function normalizeUsername(value: string | null | undefined) {
  return value?.trim() ?? ''
}

export function normalizeDisplayName(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, ' ') ?? ''
}

export function normalizeEmailAddress(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ''
}

export function hasUsername(user: UserLike) {
  return normalizeUsername(user?.username).length > 0
}

export function getUserDisplayName(user: UserLike) {
  const fromFullName = normalizeDisplayName(user?.fullName)
  if (fromFullName) return fromFullName

  const fromParts = normalizeDisplayName([user?.firstName, user?.lastName].filter(Boolean).join(' '))
  return fromParts
}

export function hasDisplayName(user: UserLike) {
  return getUserDisplayName(user).length > 0
}

export function hasOnboardingCompleted(user: UserLike) {
  return user?.unsafeMetadata?.onboarding_completed === true
}

export function isAccountSetupComplete(user: UserLike) {
  return hasOnboardingCompleted(user) && hasUsername(user) && hasDisplayName(user)
}

export function validateUsername(value: string) {
  const username = normalizeUsername(value)

  if (!username) {
    return 'Username is required.'
  }

  if (username.length < MIN_USERNAME_LENGTH) {
    return `Username must be at least ${MIN_USERNAME_LENGTH} characters.`
  }

  if (username.length > MAX_USERNAME_LENGTH) {
    return `Username must be ${MAX_USERNAME_LENGTH} characters or fewer.`
  }

  if (!USERNAME_REGEX.test(username)) {
    return 'Use only letters, numbers, "_" or "." and do not start/end with special characters.'
  }

  return null
}

export function validateDisplayName(value: string) {
  const displayName = normalizeDisplayName(value)

  if (!displayName) {
    return 'Display name is required.'
  }

  if (displayName.length < MIN_DISPLAY_NAME_LENGTH) {
    return `Display name must be at least ${MIN_DISPLAY_NAME_LENGTH} characters.`
  }

  if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
    return `Display name must be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer.`
  }

  return null
}

export function validateEmailAddress(value: string) {
  const emailAddress = normalizeEmailAddress(value)

  if (!emailAddress) {
    return 'Email address is required.'
  }

  if (!EMAIL_ADDRESS_REGEX.test(emailAddress)) {
    return 'Enter a valid email address.'
  }

  return null
}

export function validatePassword(value: string) {
  if (!value) {
    return 'Password is required.'
  }

  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
  }

  return null
}

export const MIN_USERNAME_LENGTH = 3
export const MAX_USERNAME_LENGTH = 30
export const MIN_PASSWORD_LENGTH = 8

const EMAIL_ADDRESS_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type UserLike = { username: string | null } | null | undefined

export function normalizeUsername(value: string | null | undefined) {
  return value?.trim() ?? ''
}

export function normalizeEmailAddress(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ''
}

export function hasUsername(user: UserLike) {
  return normalizeUsername(user?.username).length > 0
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

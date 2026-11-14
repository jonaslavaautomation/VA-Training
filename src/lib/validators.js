/** Shared form validators. Return an error string, or undefined when valid. */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validateEmail(value) {
  const v = (value || '').trim()
  if (!v) return 'Email is required.'
  if (v.length > 254 || !EMAIL_RE.test(v)) return 'Enter a valid email address.'
  return undefined
}

export function validatePassword(value) {
  if (!value) return 'Password is required.'
  if (value.length < 8) return 'Password must be at least 8 characters.'
  if (value.length > 72) return 'Password must be 72 characters or fewer.'
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return 'Include at least one letter and one number.'
  return undefined
}

export function validateName(value, label = 'Name') {
  const v = (value || '').trim()
  if (!v) return `${label} is required.`
  if (v.length > 80) return `${label} must be 80 characters or fewer.`
  if (/[<>]/.test(v)) return `${label} contains invalid characters.`
  return undefined
}

/** Optional contact number: digits plus + ( ) - . and spaces, up to 32 characters. */
export function validatePhone(value) {
  const v = (value || '').trim()
  if (!v) return undefined
  if (v.length > 32 || !/^[0-9+()\-. ]+$/.test(v) || !/\d/.test(v)) return 'Use digits, spaces and + ( ) - . only.'
  return undefined
}

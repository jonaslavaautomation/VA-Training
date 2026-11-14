/**
 * Turns any thrown value into a message that is safe to show to users.
 * Raw database / server details are never displayed — they go to the console only.
 */

export const NETWORK_MESSAGE = 'Unable to reach the server. Check your internet connection and try again.'
export const SESSION_MESSAGE = 'Your session has expired. Please sign in again.'
export const PERMISSION_MESSAGE = 'You don’t have permission to do that.'

export function isNetworkError(error) {
  const msg = `${error?.name ?? ''} ${error?.message ?? ''}`.toLowerCase()
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed') ||
    msg.includes('fetcherror') ||
    msg.includes('retryablefetcherror')
  )
}

export function isSessionError(error) {
  const msg = (error?.message ?? '').toLowerCase()
  return error?.status === 401 || error?.code === 'PGRST301' || error?.code === 'PGRST303' || msg.includes('jwt expired')
}

export function isPermissionError(error) {
  return error?.code === '42501' || error?.status === 403
}

/** `error.userMessage` is set by services for errors whose text was written for users. */
export function toUserMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback
  if (error.userMessage) return error.userMessage
  if (isNetworkError(error)) return NETWORK_MESSAGE
  if (isSessionError(error)) return SESSION_MESSAGE
  if (isPermissionError(error)) return PERMISSION_MESSAGE
  return fallback
}

/** Creates an Error whose message is safe to display. */
export function userError(message, { code, cause } = {}) {
  const err = new Error(message)
  err.userMessage = message
  if (code) err.code = code
  if (cause) err.cause = cause
  return err
}

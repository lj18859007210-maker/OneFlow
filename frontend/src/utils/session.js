import { authApi } from '../api'
import { getPermissionSaveSuccessMessage as getPermissionSaveSuccessMessageText } from './permissionMessages'

let lastRefreshAt = 0
let refreshInFlight = null

export function getStoredCurrentUser() {
  const stored = localStorage.getItem('currentUser')
  if (!stored) return null

  try {
    const parsed = JSON.parse(stored)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch (error) {
    return null
  }
}

export function setStoredCurrentUser(user) {
  if (!user) {
    localStorage.removeItem('currentUser')
  } else {
    localStorage.setItem('currentUser', JSON.stringify(user))
  }

  window.dispatchEvent(new CustomEvent('current-user-updated', { detail: user || null }))
}

export function clearStoredSession() {
  localStorage.removeItem('currentUser')
  localStorage.removeItem('token')
  window.dispatchEvent(new CustomEvent('current-user-updated', { detail: null }))
}

export async function refreshCurrentUser() {
  if (refreshInFlight) {
    return refreshInFlight
  }

  refreshInFlight = (async () => {
    const res = await authApi.me()
    if (res.data?.success) {
      const user = {
        ...res.data.data,
        permissions: res.data.data.permissions || []
      }
      setStoredCurrentUser(user)
      lastRefreshAt = Date.now()
      return user
    }
    throw new Error(res.data?.message || '刷新登录态失败')
  })()

  try {
    return await refreshInFlight
  } finally {
    refreshInFlight = null
  }
}

export async function refreshCurrentUserIfStale(maxAgeMs = 8000) {
  const now = Date.now()
  if (now - lastRefreshAt <= maxAgeMs) {
    return getStoredCurrentUser()
  }
  return refreshCurrentUser()
}

export { getPermissionSaveSuccessMessageText as getPermissionSaveSuccessMessage }

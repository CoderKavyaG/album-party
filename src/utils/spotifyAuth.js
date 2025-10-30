// Lightweight helpers to parse tokens from the URL (including hash fragment) and store them in localStorage.
export function parseAuthFromUrl() {
  if (typeof window === 'undefined') return null

  // first check query string (legacy)
  const qs = new URLSearchParams(window.location.search)
  let access_token = qs.get('access_token')
  let expires_in = qs.get('expires_in')

  // if not found, check hash fragment (common for implicit flow)
  if (!access_token && window.location.hash) {
    const hash = window.location.hash.replace(/^#/, '')
    const hashParams = new URLSearchParams(hash)
    access_token = hashParams.get('access_token')
    expires_in = hashParams.get('expires_in')
  }

  if (access_token) {
    localStorage.setItem('spotify_access_token', access_token)
    if (expires_in) localStorage.setItem('spotify_expires_at', String(Date.now() + Number(expires_in) * 1000))
    // clean the URL so tokens aren't exposed
    const url = window.location.origin + window.location.pathname
    window.history.replaceState({}, document.title, url)
    return { access_token, expires_in }
  }
  return null
}

export function getAccessToken() {
  const token = localStorage.getItem('spotify_access_token')
  const expiresAt = Number(localStorage.getItem('spotify_expires_at') || 0)
  if (!token) return null
  // consider token expired 60s before actual expiry to be safe
  if (expiresAt && Date.now() > expiresAt - 60000) return null
  return token
}

export function clearTokens() {
  localStorage.removeItem('spotify_access_token')
  localStorage.removeItem('spotify_expires_at')
}

export async function logout() {
  try {
    // call server to clear HttpOnly refresh cookie
    await fetch('/api/logout', { credentials: 'include' })
  } catch (err) {
    console.error('Logout request failed', err)
  }
  clearTokens()
  // Clear ALL localStorage to prevent cached data
  localStorage.clear()
  // Force reload to show login screen
  if (typeof window !== 'undefined') {
    window.location.href = window.location.origin
    window.location.reload(true)
  }
}

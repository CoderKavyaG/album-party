// Public frontend config. Safe to include the client id (it's public),
// but do NOT commit client secrets.
export const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || 'a04f714c1f7e435a87be1b47b880d0de'

// The app uses frontend-only implicit flow; the redirect URI must be
// the exact site root you registered in the Spotify Dashboard.
export const DEFAULT_REDIRECT_URI = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '/'

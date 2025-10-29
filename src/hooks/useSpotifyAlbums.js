import { useState, useEffect } from 'react'
import { getAccessToken, clearTokens } from '../utils/spotifyAuth'

export default function useSpotifyAlbums() {
  const [albums, setAlbums] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    // Ask the serverless refresh endpoint for an access token (it uses an HttpOnly cookie)
    async function init() {
      setLoading(true)
      try {
        // ensure cookies are sent so the server can read the HttpOnly refresh token
        const r = await fetch('/api/refresh', { credentials: 'include' })
        if (!r.ok) {
          setAuthenticated(false)
          setLoading(false)
          return
        }
        const j = await r.json()
        const token = j.access_token
        if (!token) {
          setAuthenticated(false)
          setLoading(false)
          return
        }
        // store in localStorage for API calls; access token is short-lived
        localStorage.setItem('spotify_access_token', token)
        localStorage.setItem('spotify_expires_at', String(Date.now() + (j.expires_in || 3600) * 1000))
        setAuthenticated(true)
        setLoading(false)
      } catch (err) {
        console.error('Init refresh failed', err)
        setAuthenticated(false)
        setLoading(false)
      }
    }

    init()

    const controller = new AbortController()

    async function fetchAlbums() {
      setLoading(true)
      setError(null)
      try {
        // Read the current access token (may have been set by init() above)
        const token = getAccessToken() || localStorage.getItem('spotify_access_token')
        if (!token) {
          // No token available — user needs to sign in
          setAuthenticated(false)
          setLoading(false)
          return
        }

        const res = await fetch('https://api.spotify.com/v1/me/albums?limit=50', {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })

        if (res.status === 401 || res.status === 403) {
          // Try to refresh via the server once (send credentials so the refresh cookie is included)
          try {
            const r2 = await fetch('/api/refresh', { credentials: 'include' })
            if (r2.ok) {
              const j2 = await r2.json()
              const newToken = j2.access_token
              if (newToken) {
                localStorage.setItem('spotify_access_token', newToken)
                localStorage.setItem('spotify_expires_at', String(Date.now() + (j2.expires_in || 3600) * 1000))
                // retry the albums request with the new token
                const retry = await fetch('https://api.spotify.com/v1/me/albums?limit=50', {
                  headers: { Authorization: `Bearer ${newToken}` },
                  signal: controller.signal,
                })
                if (!retry.ok) {
                  // log details for debugging
                  try { const bad = await retry.json(); console.error('Spotify retry error', retry.status, bad) } catch(_){}
                  throw new Error(`Spotify API error ${retry.status}`)
                }
                const json2 = await retry.json()
                setAlbums(json2.items.map((it) => it.album))
                setLoading(false)
                setAuthenticated(true)
                return
              }
            }
          } catch (err) {
            console.error('Refresh attempt failed', err)
          }

          // If we get here, refresh failed or wasn't available
          clearTokens()
          setAuthenticated(false)
          setLoading(false)
          setError('Session expired — please sign in again.')
          return
        }

        if (!res.ok) throw new Error(`Spotify API error ${res.status}`)
        const json = await res.json()
        setAlbums(json.items.map((it) => it.album))
        setLoading(false)
      } catch (err) {
        if (err.name === 'AbortError') return
        console.error(err)
        setError(err.message)
        setLoading(false)
      }
    }

    fetchAlbums()

    return () => controller.abort()
  }, [])

  return { albums, loading, error, authenticated }
}

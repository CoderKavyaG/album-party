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
        const r = await fetch('/api/refresh')
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
        console.error(err)
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
        const res = await fetch('https://api.spotify.com/v1/me/albums?limit=50', {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })

        if (res.status === 401) {
          // no server refresh available in frontend-only mode
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

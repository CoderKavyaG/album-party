import { useState, useEffect } from 'react'
import { parseAuthFromUrl, getAccessToken, clearTokens } from '../utils/spotifyAuth'

export default function useSpotifyAlbums() {
  const [albums, setAlbums] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    // read tokens if redirected from server
    parseAuthFromUrl()
    const token = getAccessToken()
    if (!token) {
      setAuthenticated(false)
      setLoading(false)
      return
    }
    setAuthenticated(true)

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

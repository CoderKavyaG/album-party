import { useState, useEffect } from 'react'
import { getAccessToken, clearTokens } from '../utils/spotifyAuth'

export default function useSpotifyAlbums() {
  const [albums, setAlbums] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    
    async function initAndFetch() {
      setLoading(true)
      
      // Step 1: Get access token from server
      try {
        console.log('Fetching access token...')
        const r = await fetch('/api/refresh', { credentials: 'include' })
        if (!r.ok) {
          console.log('Refresh failed, not authenticated')
          setAuthenticated(false)
          setLoading(false)
          return
        }
        const j = await r.json()
        const token = j.access_token
        if (!token) {
          console.log('No token received')
          setAuthenticated(false)
          setLoading(false)
          return
        }
        // store in localStorage for API calls
        localStorage.setItem('spotify_access_token', token)
        localStorage.setItem('spotify_expires_at', String(Date.now() + (j.expires_in || 3600) * 1000))
        setAuthenticated(true)
        console.log('Token received, fetching albums...')
        
        // Step 2: Now fetch albums with the token
        await fetchAlbums(token, controller)
      } catch (err) {
        console.error('Init failed', err)
        setAuthenticated(false)
        setLoading(false)
      }
    }

    async function fetchAlbums(token, controller) {
      setError(null)
      try {
        if (!token) {
          console.log('No token provided to fetchAlbums')
          setAuthenticated(false)
          setLoading(false)
          return
        }

        // Fetch all albums with pagination
        let allAlbums = []
        let nextUrl = 'https://api.spotify.com/v1/me/albums?limit=50'
        
        while (nextUrl) {
          const res = await fetch(nextUrl, {
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
                  // retry the albums request with the new token - restart pagination
                  allAlbums = []
                  nextUrl = 'https://api.spotify.com/v1/me/albums?limit=50'
                  continue
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
          const newAlbums = json.items.map((it) => it.album)
          allAlbums = allAlbums.concat(newAlbums)
          console.log(`Fetched ${newAlbums.length} albums, total: ${allAlbums.length}`)
          nextUrl = json.next // Will be null when no more pages
        }
        
        console.log(`Total albums fetched: ${allAlbums.length}`)
        setAlbums(allAlbums)
        
        // Fetch user profile
        const userToken = localStorage.getItem('spotify_access_token')
        if (userToken) {
          try {
            const userRes = await fetch('https://api.spotify.com/v1/me', {
              headers: { Authorization: `Bearer ${userToken}` },
              signal: controller.signal,
            })
            if (userRes.ok) {
              const userData = await userRes.json()
              setUser(userData)
            }
          } catch (err) {
            console.error('Failed to fetch user profile', err)
          }
        }
        
        setAuthenticated(true)
        setLoading(false)
      } catch (err) {
        if (err.name === 'AbortError') return
        console.error(err)
        setError(err.message)
        setLoading(false)
      }
    }

    initAndFetch()

    return () => controller.abort()
  }, [])

  return { albums, user, loading, error, authenticated }
}

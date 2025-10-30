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
    
    async function fetchAlbums(token) {
      try {
        let allAlbums = []
        let nextUrl = 'https://api.spotify.com/v1/me/albums?limit=50'
        
        while (nextUrl) {
          const res = await fetch(nextUrl, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          })

          if (res.status === 401) {
            // Token expired, try to refresh it
            const refreshRes = await fetch('/api/refresh', {
              credentials: 'include',
              signal: controller.signal,
            })
            
            if (refreshRes.ok) {
              const { access_token: newToken } = await refreshRes.json()
              if (newToken) {
                localStorage.setItem('spotify_access_token', newToken)
                // Retry with new token
                return fetchAlbums(newToken)
              }
            }
            
            // If we get here, refresh failed
            clearTokens()
            setAuthenticated(false)
            setError('Session expired. Please sign in again.')
            return []
          }

          if (!res.ok) throw new Error(`Spotify API error: ${res.status}`)
          
          const data = await res.json()
          allAlbums = [...allAlbums, ...data.items.map(item => item.album)]
          nextUrl = data.next
        }
        
        return allAlbums
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error fetching albums:', err)
          setError('Failed to load albums. Please try again.')
        }
        return []
      }
    }

    async function fetchUserProfile(token) {
      try {
        const res = await fetch('https://api.spotify.com/v1/me', {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        
        if (res.ok) {
          return await res.json()
        }
        return null
      } catch (err) {
        console.error('Error fetching user profile:', err)
        return null
      }
    }

    async function init() {
      try {
        setLoading(true)
        
        // Get access token from server
        const tokenRes = await fetch('/api/refresh', {
          credentials: 'include',
          signal: controller.signal,
        })
        
        if (!tokenRes.ok) {
          throw new Error('Failed to authenticate with Spotify')
        }
        
        const { access_token: token, expires_in } = await tokenRes.json()
        
        if (!token) {
          throw new Error('No access token received')
        }
        
        // Store token in localStorage for API calls
        localStorage.setItem('spotify_access_token', token)
        localStorage.setItem('spotify_expires_at', String(Date.now() + (expires_in * 1000)))
        
        // Fetch albums and user profile in parallel
        const [fetchedAlbums, userData] = await Promise.all([
          fetchAlbums(token),
          fetchUserProfile(token)
        ])
        
        setAlbums(fetchedAlbums)
        setUser(userData)
        setAuthenticated(true)
        setError(null)
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Initialization error:', err)
          setAuthenticated(false)
          setError(err.message || 'Failed to initialize Spotify connection')
        }
      } finally {
        setLoading(false)
      }
    }

    init()

    return () => {
      controller.abort()
    }
  }, [])

  return { albums, user, loading, error, authenticated }
}
// useSpotifyAlbums.js
import { useState, useEffect, useRef } from 'react'
import { getAccessToken, clearTokens } from '../utils/spotifyAuth'

export default function useSpotifyAlbums() {
  const [albums, setAlbums] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [authenticated, setAuthenticated] = useState(false)
  const refreshInterval = useRef(null)

  const fetchAlbums = async (token, controller) => {
    try {
      let allAlbums = []
      let nextUrl = 'https://api.spotify.com/v1/me/albums?limit=50'
      
      while (nextUrl) {
        const res = await fetch(nextUrl, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller?.signal,
        })

        if (res.status === 401 || res.status === 403) {
          throw new Error('Session expired')
        }

        if (!res.ok) throw new Error(`Spotify API error ${res.status}`)
        
        const json = await res.json()
        const newAlbums = json.items.map((it) => it.album)
        allAlbums = [...new Set([...allAlbums, ...newAlbums])]
        nextUrl = json.next
      }
      
      console.log(`Fetched ${allAlbums.length} albums`)
      return allAlbums
    } catch (err) {
      console.error('Error in fetchAlbums:', err)
      throw err
    }
  }

  const fetchUserProfile = async (token) => {
    try {
      const res = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) return await res.json()
      return null
    } catch (err) {
      console.error('Error fetching user profile:', err)
      return null
    }
  }

  const initAndFetch = async (controller) => {
    try {
      setLoading(true)
      
      // 1. Get fresh token
      const tokenRes = await fetch('/api/refresh', { credentials: 'include' })
      if (!tokenRes.ok) throw new Error('Failed to refresh token')
      
      const tokenData = await tokenRes.json()
      const token = tokenData.access_token
      if (!token) throw new Error('No access token received')
      
      localStorage.setItem('spotify_access_token', token)
      localStorage.setItem('spotify_expires_at', String(Date.now() + (tokenData.expires_in || 3600) * 1000))
      
      // 2. Fetch albums and user in parallel
      const [fetchedAlbums, userData] = await Promise.all([
        fetchAlbums(token, controller),
        fetchUserProfile(token)
      ])

      setAlbums(fetchedAlbums)
      setUser(userData)
      setAuthenticated(true)
      setError(null)
      setLoading(false)
      
      return { success: true }
    } catch (err) {
      console.error('Init failed:', err)
      setAuthenticated(false)
      setError(err.message)
      setLoading(false)
      return { success: false, error: err.message }
    }
  }

  // Main effect - runs on mount and when dependencies change
  useEffect(() => {
    const controller = new AbortController()
    let isMounted = true

    // Initial fetch
    initAndFetch(controller)

    // Set up auto-refresh every 30 seconds
    refreshInterval.current = setInterval(async () => {
      if (isMounted) {
        console.log('Auto-refreshing albums...')
        const result = await initAndFetch(controller)
        if (!result.success) {
          clearInterval(refreshInterval.current)
        }
      }
    }, 30000) // 30 seconds

    // Cleanup
    return () => {
      isMounted = false
      controller.abort()
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current)
      }
    }
  }, [])

  return { albums, user, loading, error, authenticated }
}
import { useState, useEffect } from 'react';
import { getAccessToken, clearTokens } from '../utils/spotifyAuth';

export default function useSpotifyAlbums() {
  const [albums, setAlbums] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);

  const fetchUserProfile = async (token) => {
    try {
      const res = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch (err) {
      console.error('Error fetching user profile:', err);
      return null;
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    async function init() {
      try {
        setLoading(true);
        
        // Get access token from server
        const tokenRes = await fetch('/api/refresh', {
          credentials: 'include',
          signal: controller.signal,
        });
        
        if (!tokenRes.ok) {
          throw new Error('Failed to authenticate with Spotify');
        }
        
        const { access_token: token, expires_in } = await tokenRes.json();
        
        if (!token) {
          throw new Error('No access token received');
        }
        
        // Store token in localStorage for API calls
        localStorage.setItem('spotify_access_token', token);
        localStorage.setItem('spotify_expires_at', String(Date.now() + (expires_in * 1000)));
        
        // Fetch user profile and albums in parallel
        const [userData, albumsRes] = await Promise.all([
          fetchUserProfile(token),
          fetch('/api/background-refresh', {
            credentials: 'include',
            signal: controller.signal,
          })
        ]);
        
        if (!albumsRes.ok) {
          throw new Error('Failed to load albums');
        }
        
        const { albums: fetchedAlbums } = await albumsRes.json();
        
        if (isMounted) {
          setAlbums(fetchedAlbums || []);
          setUser(userData);
          setAuthenticated(true);
          setError(null);
        }
      } catch (err) {
        if (isMounted && err.name !== 'AbortError') {
          console.error('Initialization error:', err);
          setAuthenticated(false);
          setError(err.message || 'Failed to initialize Spotify connection');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  return { albums, user, loading, error, authenticated };
}
import { useState, useEffect } from 'react';

export default function useSpotifyAlbums() {
  const [albums, setAlbums] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    async function init() {
      try {
        setLoading(true);
        
        // Try to get access token from server (checks for refresh token cookie)
        const tokenRes = await fetch('/api/refresh', {
          credentials: 'include',
          signal: controller.signal,
        });
        
        // If no refresh token cookie exists, user needs to login
        if (tokenRes.status === 401) {
          if (isMounted) {
            setAuthenticated(false);
            setLoading(false);
          }
          return;
        }
        
        if (!tokenRes.ok) {
          throw new Error('Failed to authenticate with Spotify');
        }
        
        const { access_token: token, expires_in } = await tokenRes.json();
        
        if (!token) {
          throw new Error('No access token received');
        }
        
        // Store token in localStorage for potential future use
        localStorage.setItem('spotify_access_token', token);
        localStorage.setItem('spotify_expires_at', String(Date.now() + (expires_in * 1000)));
        
        // Fetch albums and user data from server
        const albumsRes = await fetch('/api/background-refresh', {
          credentials: 'include',
          signal: controller.signal,
        });
        
        // If albums fetch fails with 401, user needs to re-authenticate
        if (albumsRes.status === 401) {
          if (isMounted) {
            setAuthenticated(false);
            setLoading(false);
            // Clear any stale tokens
            localStorage.removeItem('spotify_access_token');
            localStorage.removeItem('spotify_expires_at');
          }
          return;
        }
        
        if (!albumsRes.ok) {
          throw new Error('Failed to load albums');
        }
        
        const { albums: fetchedAlbums, user: userData } = await albumsRes.json();
        
        if (isMounted) {
          setAlbums(fetchedAlbums || []);
          setUser(userData || null);
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
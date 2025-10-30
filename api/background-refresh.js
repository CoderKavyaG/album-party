import { getAccessToken } from '../../utils/spotifyAuth';

// In-memory cache for albums
let cachedAlbums = [];
let lastRefresh = 0;
const REFRESH_INTERVAL = 30 * 1000; // 30 seconds

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefresh;

    // If we have fresh data (less than 30 seconds old), return it
    if (cachedAlbums.length > 0 && timeSinceLastRefresh < REFRESH_INTERVAL) {
      return res.status(200).json({ albums: cachedAlbums });
    }

    // Otherwise, refresh the data
    const token = await getAccessToken();
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Fetch albums from Spotify
    let allAlbums = [];
    let nextUrl = 'https://api.spotify.com/v1/me/albums?limit=50';
    
    while (nextUrl) {
      const response = await fetch(nextUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`Spotify API error: ${response.status}`);
      }

      const data = await response.json();
      allAlbums = [...allAlbums, ...data.items.map(item => item.album)];
      nextUrl = data.next;
    }

    // Update cache and last refresh time
    cachedAlbums = allAlbums;
    lastRefresh = now;

    res.status(200).json({ albums: allAlbums });
  } catch (error) {
    console.error('Background refresh error:', error);
    // If we have stale data, return it with a warning
    if (cachedAlbums.length > 0) {
      return res.status(200).json({ 
        albums: cachedAlbums,
        warning: 'Using cached data due to refresh error'
      });
    }
    res.status(500).json({ error: 'Failed to refresh albums' });
  }
}

// Start background refresh interval
setInterval(async () => {
  try {
    const token = await getAccessToken();
    if (!token) return;

    const response = await fetch('https://api.spotify.com/v1/me/albums?limit=1', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.items?.length > 0) {
        // Just trigger a refresh to keep the token alive
        // We don't need to process the data here
        console.log('Background token refresh successful');
      }
    }
  } catch (error) {
    console.error('Background refresh interval error:', error);
  }
}, REFRESH_INTERVAL);

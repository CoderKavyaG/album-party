import { getAccessToken } from '../../utils/spotifyAuth';

// Helper function to refresh the access token
async function refreshAccessToken() {
  try {
    const response = await fetch('/api/refresh', {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }
    
    const { access_token, expires_in } = await response.json();
    
    if (access_token) {
      // Update the token in memory
      return access_token;
    }
    
    throw new Error('No access token received');
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
}

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

    // Get or refresh the access token
    let token = await getAccessToken();
    if (!token) {
      try {
        token = await refreshAccessToken();
      } catch (error) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
    }

    // Fetch albums from Spotify with retry logic
    let allAlbums = [];
    let nextUrl = 'https://api.spotify.com/v1/me/albums?limit=50';
    let retryCount = 0;
    const maxRetries = 2;
    
    while (nextUrl && retryCount <= maxRetries) {
      try {
        const response = await fetch(nextUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 401) {
          // Token might be expired, try to refresh it once
          if (retryCount === 0) {
            token = await refreshAccessToken();
            retryCount++;
            continue; // Retry with new token
          }
          throw new Error('Unauthorized - Please sign in again');
        }

        if (!response.ok) {
          throw new Error(`Spotify API error: ${response.status}`);
        }

        const data = await response.json();
        allAlbums = [...allAlbums, ...data.items.map(item => item.album)];
        nextUrl = data.next;
        retryCount = 0; // Reset retry count on success
      } catch (error) {
        if (retryCount >= maxRetries) {
          console.error('Max retries reached, giving up');
          throw error;
        }
        retryCount++;
        console.log(`Retry ${retryCount} after error:`, error.message);
      }
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

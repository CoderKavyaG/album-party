import { getAccessToken } from '../../utils/spotifyAuth';

// Simple in-memory cache
let cachedAlbums = [];
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Return cached data if it's fresh
  const now = Date.now();
  if (cachedAlbums.length > 0 && (now - lastFetchTime) < CACHE_DURATION) {
    return res.status(200).json({ albums: cachedAlbums });
  }

  try {
    // Get access token
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
        const error = await response.text();
        console.error('Spotify API error:', response.status, error);
        throw new Error(`Failed to fetch albums: ${response.status}`);
      }

      const data = await response.json();
      allAlbums = [...allAlbums, ...data.items.map(item => item.album)];
      nextUrl = data.next;
    }

    // Update cache
    cachedAlbums = allAlbums;
    lastFetchTime = now;

    console.log(`Fetched ${allAlbums.length} albums`);
    res.status(200).json({ albums: allAlbums });
    
  } catch (error) {
    console.error('Error in background refresh:', error);
    
    // Return cached data if available, even if it's stale
    if (cachedAlbums.length > 0) {
      console.log('Returning cached data after error');
      return res.status(200).json({ 
        albums: cachedAlbums,
        warning: 'Using cached data due to refresh error'
      });
    }
    
    // No cached data available
    res.status(500).json({ 
      error: 'Failed to load albums',
      details: error.message 
    });
  }
}

// Simple background refresh to keep the token alive
// This runs in the background but doesn't affect the user experience
setInterval(async () => {
  try {
    const token = await getAccessToken();
    if (!token) return;
    
    // Just make a simple request to keep the session alive
    await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (error) {
    console.log('Background refresh failed (non-critical):', error.message);
  }
}, 5 * 60 * 1000); // Every 5 minutes

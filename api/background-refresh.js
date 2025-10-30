// Vercel serverless function: fetches user's saved albums from Spotify
// Uses refresh token from cookie to get access token, then fetches albums

const TOKEN_URL = 'https://accounts.spotify.com/api/token'

function parseCookies(cookieHeader) {
  if (!cookieHeader) return {}
  return cookieHeader.split(';').map(c => c.trim()).reduce((acc, pair) => {
    const [k, v] = pair.split('=')
    acc[k] = decodeURIComponent(v)
    return acc
  }, {})
}

async function getAccessTokenFromRefresh(refreshToken) {
  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error('Server not configured')

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })

  const tokenResp = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
    },
    body: body.toString(),
  })

  const data = await tokenResp.json()
  if (!tokenResp.ok) {
    console.error('Token refresh failed:', data)
    throw new Error(`Token refresh failed: ${JSON.stringify(data)}`)
  }

  console.log('Token refreshed, scope:', data.scope)
  return data.access_token
}

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get refresh token from cookie
    const cookies = parseCookies(req.headers.cookie || '')
    const refreshToken = cookies.spotify_refresh_token
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    // Get fresh access token
    console.log('Getting access token from refresh token...')
    const accessToken = await getAccessTokenFromRefresh(refreshToken)
    console.log('Access token obtained, length:', accessToken?.length)

    // Fetch user profile
    console.log('Fetching user profile...')
    const userResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    
    let userData = null
    if (userResponse.ok) {
      userData = await userResponse.json()
      console.log('User profile fetched:', userData?.display_name)
    } else {
      console.error('User profile fetch failed:', userResponse.status, await userResponse.text())
    }

    // Fetch all albums from Spotify
    console.log('Fetching albums...')
    let allAlbums = []
    let nextUrl = 'https://api.spotify.com/v1/me/albums?limit=50'
    
    while (nextUrl) {
      const response = await fetch(nextUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!response.ok) {
        const errorData = await response.text()
        console.error(`Spotify albums API error: ${response.status}`, errorData)
        console.error('Access token used (first 20 chars):', accessToken?.substring(0, 20))
        
        if (response.status === 401) {
          return res.status(401).json({ error: 'Token expired or invalid' })
        }
        if (response.status === 403) {
          return res.status(403).json({ 
            error: 'Insufficient permissions', 
            details: 'Make sure user-library-read scope is granted',
            spotifyError: errorData
          })
        }
        throw new Error(`Spotify API error: ${response.status} - ${errorData}`)
      }

      const data = await response.json()
      allAlbums = [...allAlbums, ...data.items.map(item => item.album)]
      nextUrl = data.next
    }

    res.status(200).json({ albums: allAlbums, user: userData })
  } catch (error) {
    console.error('Background refresh error:', error)
    res.status(500).json({ error: 'Failed to fetch albums', details: error.message })
  }
}

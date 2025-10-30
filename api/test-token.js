// Test endpoint to check token and scopes
const TOKEN_URL = 'https://accounts.spotify.com/api/token'

function parseCookies(cookieHeader) {
  if (!cookieHeader) return {}
  return cookieHeader.split(';').map(c => c.trim()).reduce((acc, pair) => {
    const [k, v] = pair.split('=')
    acc[k] = decodeURIComponent(v)
    return acc
  }, {})
}

export default async function handler(req, res) {
  try {
    const cookies = parseCookies(req.headers.cookie || '')
    const refreshToken = cookies.spotify_refresh_token
    
    if (!refreshToken) {
      return res.json({ 
        error: 'No refresh token found',
        hasCookie: false 
      })
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

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
      return res.json({
        error: 'Token refresh failed',
        details: data
      })
    }

    const accessToken = data.access_token

    // Test the token with Spotify API
    const meResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    const albumsResponse = await fetch('https://api.spotify.com/v1/me/albums?limit=1', {
      headers: { Authorization: `Bearer ${accessToken}` }
    })

    return res.json({
      tokenRefresh: {
        success: tokenResp.ok,
        scope: data.scope || 'not provided'
      },
      meEndpoint: {
        status: meResponse.status,
        ok: meResponse.ok,
        error: meResponse.ok ? null : await meResponse.text()
      },
      albumsEndpoint: {
        status: albumsResponse.status,
        ok: albumsResponse.ok,
        error: albumsResponse.ok ? null : await albumsResponse.text()
      }
    })
  } catch (err) {
    return res.json({ error: err.message })
  }
}

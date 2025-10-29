// Vercel serverless function to refresh Spotify access token using HttpOnly cookie
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Read refresh token from HttpOnly cookie
  // Vercel automatically parses cookies, but we check both places to be safe
  const cookies = req.cookies || {}
  const cookieHeader = req.headers.cookie || ''
  const cookieMap = cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=')
    if (key && value) acc[key] = value
    return acc
  }, {})
  
  const refreshToken = cookies.spotify_refresh_token || cookieMap.spotify_refresh_token

  if (!refreshToken) {
    return res.status(401).json({ error: 'No refresh token' })
  }

  const clientId = process.env.VITE_SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

  try {
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    })

    if (!tokenResponse.ok) {
      // If refresh fails, clear the cookie and return 401
      res.setHeader('Set-Cookie', 'spotify_refresh_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0')
      return res.status(401).json({ error: 'Token refresh failed' })
    }

    const data = await tokenResponse.json()

    // If a new refresh token is provided, update the cookie
    if (data.refresh_token) {
      res.setHeader(
        'Set-Cookie',
        `spotify_refresh_token=${data.refresh_token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${365 * 24 * 60 * 60}`
      )
    }

    // Return access token and expiry to frontend
    res.json({
      access_token: data.access_token,
      expires_in: data.expires_in || 3600,
    })
  } catch (err) {
    console.error('Refresh error:', err)
    res.status(500).json({ error: 'Server error' })
  }
}


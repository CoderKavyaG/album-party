// Vercel serverless function: uses refresh token from HttpOnly cookie to
// request a fresh access token from Spotify and returns it to the client.

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
    if (!refreshToken) return res.status(401).json({ error: 'No refresh token' })

    const clientId = process.env.SPOTIFY_CLIENT_ID
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
    if (!clientId || !clientSecret) return res.status(500).json({ error: 'Server not configured' })

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
      console.error('Refresh error', data)
      return res.status(500).json({ error: 'Refresh failed', details: data })
    }

    console.log('Token refreshed successfully, scope:', data.scope)
    return res.json({ access_token: data.access_token, expires_in: data.expires_in })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
}

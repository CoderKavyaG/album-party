// Vercel serverless function: exchanges Spotify authorization code for tokens
// and stores the refresh token in an HttpOnly cookie.

const TOKEN_URL = 'https://accounts.spotify.com/api/token'

function serializeCookie(name, val, opts = {}) {
  const enc = encodeURIComponent(val)
  let str = `${name}=${enc}`
  if (opts.maxAge) str += `; Max-Age=${opts.maxAge}`
  if (opts.domain) str += `; Domain=${opts.domain}`
  if (opts.path) str += `; Path=${opts.path}`
  if (opts.httpOnly) str += '; HttpOnly'
  if (opts.secure) str += '; Secure'
  if (opts.sameSite) str += `; SameSite=${opts.sameSite}`
  return str
}

export default async function handler(req, res) {
  try {
    const { code, error } = req.query || {}
    if (error) {
      return res.status(400).send(`Auth error: ${error}`)
    }
    if (!code) return res.status(400).send('Missing code')

    const clientId = process.env.SPOTIFY_CLIENT_ID
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI
    if (!clientId || !clientSecret || !redirectUri) {
      return res.status(500).send('Server not configured')
    }

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      // client_secret is sent in Authorization header
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
      console.error('Token error', data)
      return res.status(500).json({ error: 'Token exchange failed', details: data })
    }

    const refreshToken = data.refresh_token
    const accessToken = data.access_token
    const expiresIn = data.expires_in || 3600

    // Set refresh token as HttpOnly cookie. Expires ~30 days.
    // Use Secure cookies in production/when behind https; allow local http during development.
    const isSecure = (req && ((req.headers && req.headers['x-forwarded-proto'] === 'https') || process.env.NODE_ENV === 'production'))
    const cookie = serializeCookie('spotify_refresh_token', refreshToken, {
      httpOnly: true,
      secure: isSecure,
      path: '/',
      sameSite: 'Lax',
      maxAge: 60 * 60 * 24 * 30,
    })
    res.setHeader('Set-Cookie', cookie)

    // Redirect back to frontend root — frontend can call /api/refresh to get an access token
    const frontend = process.env.FRONTEND_URI || '/'
    return res.writeHead(302, { Location: frontend }).end()
  } catch (err) {
    console.error(err)
    res.status(500).send('Server error')
  }
}

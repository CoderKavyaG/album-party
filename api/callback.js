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
    const { code, error, state } = req.query || {}
    
    // Handle Spotify auth errors
    if (error) {
      console.error('Spotify auth error:', error)
      const frontend = process.env.FRONTEND_URI || '/'
      return res.writeHead(302, { 
        Location: `${frontend}?error=${encodeURIComponent(error)}` 
      }).end()
    }
    
    if (!code) {
      return res.status(400).send('Missing authorization code')
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI
    
    if (!clientId || !clientSecret || !redirectUri) {
      console.error('Missing environment variables')
      return res.status(500).send('Server not configured properly. Check environment variables.')
    }

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
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
      console.error('Token exchange failed:', data)
      const frontend = process.env.FRONTEND_URI || '/'
      return res.writeHead(302, { 
        Location: `${frontend}?error=token_exchange_failed` 
      }).end()
    }

    const refreshToken = data.refresh_token
    
    if (!refreshToken) {
      console.error('No refresh token received from Spotify')
      const frontend = process.env.FRONTEND_URI || '/'
      return res.writeHead(302, { 
        Location: `${frontend}?error=no_refresh_token` 
      }).end()
    }

    // Set refresh token as HttpOnly cookie (expires in 30 days)
    const isSecure = (req && ((req.headers && req.headers['x-forwarded-proto'] === 'https') || process.env.NODE_ENV === 'production'))
    const cookie = serializeCookie('spotify_refresh_token', refreshToken, {
      httpOnly: true,
      secure: isSecure,
      path: '/',
      sameSite: 'Lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })
    res.setHeader('Set-Cookie', cookie)

    // Redirect back to frontend - the app will automatically fetch albums
    const frontend = process.env.FRONTEND_URI || '/'
    return res.writeHead(302, { Location: frontend }).end()
  } catch (err) {
    console.error('Callback error:', err)
    const frontend = process.env.FRONTEND_URI || '/'
    return res.writeHead(302, { 
      Location: `${frontend}?error=server_error` 
    }).end()
  }
}

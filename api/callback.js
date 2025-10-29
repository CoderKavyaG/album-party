// Vercel serverless function to handle Spotify OAuth callback
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { code, error } = req.query

  if (error) {
    return res.redirect('/?error=' + encodeURIComponent(error))
  }

  if (!code) {
    return res.redirect('/?error=no_code')
  }

  const clientId = process.env.VITE_SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  const redirectUri = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/api/callback`

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Token exchange failed:', errorText)
      return res.redirect('/?error=token_exchange_failed')
    }

    const tokens = await tokenResponse.json()

    // Set refresh token as HttpOnly cookie (secure, httpOnly, sameSite)
    res.setHeader(
      'Set-Cookie',
      `spotify_refresh_token=${tokens.refresh_token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${365 * 24 * 60 * 60}` // 1 year
    )

    // Redirect to home page - the frontend will call /api/refresh to get the access token
    res.redirect('/')
  } catch (err) {
    console.error('Callback error:', err)
    res.redirect('/?error=server_error')
  }
}


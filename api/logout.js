export default function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Clear the refresh token cookie
  // Set both Secure and non-Secure versions to ensure it works in all environments
  const isSecure = (req && ((req.headers && req.headers['x-forwarded-proto'] === 'https') || process.env.NODE_ENV === 'production'))
  
  const cookieOptions = `spotify_refresh_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${isSecure ? '; Secure' : ''}`
  res.setHeader('Set-Cookie', cookieOptions)
  
  res.json({ ok: true })
}

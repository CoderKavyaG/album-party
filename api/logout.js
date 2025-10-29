// Vercel serverless function to logout and clear refresh token cookie
export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Clear the HttpOnly refresh token cookie
  res.setHeader('Set-Cookie', 'spotify_refresh_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0')

  res.json({ success: true })
}


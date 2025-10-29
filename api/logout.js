export default function handler(req, res) {
  // Clear the refresh token cookie
  res.setHeader('Set-Cookie', 'spotify_refresh_token=; HttpOnly; Secure; Path=/; Max-Age=0; SameSite=Lax')
  res.json({ ok: true })
}

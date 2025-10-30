// Alternative: Implicit Grant Flow (client-side only, no refresh tokens)
// This works in Development Mode without user restrictions
// But tokens expire after 1 hour and user must re-login

export default async function handler(req, res) {
  const clientId = process.env.SPOTIFY_CLIENT_ID
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI?.replace('/api/callback', '/callback-implicit')
  const scope = 'user-library-read user-read-private user-read-email'
  
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'token',
    redirect_uri: redirectUri,
    scope: scope,
    show_dialog: 'true'
  })
  
  const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`
  
  res.writeHead(302, { Location: authUrl }).end()
}

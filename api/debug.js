// Debug endpoint to check environment and configuration
export default async function handler(req, res) {
  const hasClientId = !!process.env.SPOTIFY_CLIENT_ID
  const hasClientSecret = !!process.env.SPOTIFY_CLIENT_SECRET
  const hasRedirectUri = !!process.env.SPOTIFY_REDIRECT_URI
  const hasFrontendUri = !!process.env.FRONTEND_URI
  const hasViteClientId = !!process.env.VITE_SPOTIFY_CLIENT_ID

  return res.json({
    environment: {
      SPOTIFY_CLIENT_ID: hasClientId ? 'SET' : 'MISSING',
      SPOTIFY_CLIENT_SECRET: hasClientSecret ? 'SET' : 'MISSING',
      SPOTIFY_REDIRECT_URI: hasRedirectUri ? process.env.SPOTIFY_REDIRECT_URI : 'MISSING',
      FRONTEND_URI: hasFrontendUri ? process.env.FRONTEND_URI : 'MISSING',
      VITE_SPOTIFY_CLIENT_ID: hasViteClientId ? 'SET' : 'MISSING',
    },
    clientIdMatch: process.env.SPOTIFY_CLIENT_ID === process.env.VITE_SPOTIFY_CLIENT_ID,
    redirectUriCorrect: process.env.SPOTIFY_REDIRECT_URI === 'https://album-party-blond.vercel.app/api/callback',
    frontendUriCorrect: process.env.FRONTEND_URI === 'https://album-party-blond.vercel.app'
  })
}

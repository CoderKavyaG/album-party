# Deploy & Spotify app setup — Album Party (frontend-only)

This project uses a frontend-only Spotify auth flow (the app redirects the browser to Spotify and receives a short-lived access token in the URL). That keeps the repository simple and allows deploying the site as a static app (Vercel, Netlify, etc.).

What you need to do:

- Create a Spotify app at https://developer.spotify.com/dashboard and note the Client ID.
- Deploy the frontend (Vercel is recommended) or test locally with a public HTTPS URL (ngrok can be used for local testing).
- Add your deployed site's root URL (exact) as a Redirect URI in the Spotify app settings.
- Set the environment variable `VITE_SPOTIFY_CLIENT_ID` in your deployment (Vercel project settings).

Example settings for a Vercel deployment:

- Deployed site root: `https://your-site.vercel.app`
- Spotify Dashboard → Edit Settings → Redirect URIs: add `https://your-site.vercel.app/`
- Vercel Project → Settings → Environment Variables: add `VITE_SPOTIFY_CLIENT_ID` = your Spotify Client ID

Notes about the frontend-only flow:

- The app uses `response_type=token` when redirecting to Spotify. That returns an access token in the URL hash (short-lived, typically 1 hour).
- There is no refresh token in this flow. For long-term or production usage consider implementing Authorization Code with PKCE or a small server to securely store refresh tokens.

Local testing with ngrok (optional):

1. Run your Vite dev server:

   - From the project root: `npm run dev` (this starts the app at http://localhost:5173 by default).

2. Start ngrok to expose the dev server (HTTPS):

   - `ngrok http 5173`

3. Copy the ngrok HTTPS URL (e.g. `https://abcd1234.ngrok.io`) and add it as a Redirect URI in the Spotify Dashboard (use the root URL with a trailing slash).

4. In the browser open the ngrok URL and click Sign in.

This local ngrok route is only for development. For a production deployment, use your real site root as the Redirect URI and set `VITE_SPOTIFY_CLIENT_ID` there.

If you want, I can:

- Prepare the exact Vercel dashboard steps for deploying this repo and setting environment variables.
- Reintroduce a minimal server implementation (Authorization Code with PKCE) if you decide you need refresh tokens and higher security.

Tell me which option you prefer (Vercel guide, re-add server with PKCE, or keep frontend-only) and I'll proceed.

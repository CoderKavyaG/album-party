# Deploy & Spotify app setup — Album Party

This guide helps you get a public redirect URL for Spotify OAuth (Spotify often requires HTTPS/public URLs). It covers two easy options: ngrok for local development and deploying the server/frontend to a hosting provider.

---

## Required Spotify app settings

- On the Spotify Developer Dashboard, create an app.
- In the app settings add the Redirect URI(s) for your application. Also note your Client ID and Client Secret.
- Required scope for this demo: `user-library-read` (used when requesting saved albums).

You will add one or more Redirect URIs (exact match required). Use one of the examples below depending on how you run the server.

---

## Option A — Quick dev (recommended): use ngrok (HTTPS)

1. Install ngrok: https://ngrok.com/ (free tier is sufficient for dev).
2. Run your auth server (the Express app) locally on port 8888:

```powershell
cd d:\Kavya\album-party\server
npm install
npm start
```

3. In another terminal start ngrok to expose port 8888:

```powershell
ngrok http 8888
```

4. ngrok will print a forwarding URL like `https://abcd1234.ngrok.io` — keep the `https://` URL.

5. In Spotify Developer Dashboard → My App → Edit Settings → Redirect URIs add the callback value:

```
https://abcd1234.ngrok.io/callback
```

6. Update `server/.env` (or your environment) with:

```
SPOTIFY_CLIENT_ID=<<your client id>>
SPOTIFY_CLIENT_SECRET=<<your client secret>>
REDIRECT_URI=https://abcd1234.ngrok.io/callback
FRONTEND_URI=http://localhost:5173
```

7. In the browser open your frontend (Vite) `http://localhost:5173`. Click Sign in — you will be redirected to Spotify, approve, then Spotify will redirect to `https://abcd1234.ngrok.io/callback`, the server will exchange the code and redirect back to the frontend with tokens.

Notes:
- This is easiest for development because it keeps your frontend local while giving Spotify an HTTPS callback URL.
- If you also want the frontend to be reachable publicly, run `ngrok http 5173` and use that URL in `FRONTEND_URI`.

---

## Option B — Deploy server + frontend (recommended for a permanent public URL)

If you prefer not to use ngrok, deploy the server to Render, Railway, Heroku, or similar, and deploy the frontend to Vercel or Netlify.

Example configuration (replace with your actual hostnames):

- Server URL (deployed): `https://album-party-server.onrender.com`
- Frontend URL (deployed): `https://album-party.vercel.app`

In Spotify Developer Dashboard add the Redirect URI:

```
https://album-party-server.onrender.com/callback
```

And update your `server/.env` environment variables accordingly (set them in the hosting provider's environment config instead of committing a `.env` file):

```
SPOTIFY_CLIENT_ID=<<your client id>>
SPOTIFY_CLIENT_SECRET=<<your client secret>>
REDIRECT_URI=https://album-party-server.onrender.com/callback
FRONTEND_URI=https://album-party.vercel.app
```

Notes:
- If your provider supports HTTPS and a fixed hostname, this is the cleanest approach for production.
- Make sure to configure environment variables in the hosting UI rather than committing them.

---

## What to enter in the Spotify app settings

- Redirect URIs: list the callback(s) exactly as shown above (one per line); e.g. `https://abcd1234.ngrok.io/callback` or `https://album-party-server.onrender.com/callback`.
- Scopes: when you use the /login link in the app it requests `user-library-read`. No special scopes required in the Spotify Dashboard UI — scopes are requested at runtime.

## Quick checklist

- [ ] Put your Client ID + Secret in `server/.env` (or in your host's env panel).
- [ ] Set `REDIRECT_URI` to the public HTTPS callback URL you added to Spotify.
- [ ] Set `FRONTEND_URI` to the URL where your frontend is served.
- [ ] Start server and frontend (or deploy both), and test sign-in.

---

If you'd like, I can:

- Start both servers here and show logs (I can run the server but I cannot run ngrok from this environment — I can show exact commands for you to run locally).
- Generate a small Vercel/Render deployment guide with the exact steps for one provider (pick one and I'll write the step-by-step).

Tell me whether you want `ngrok` instructions only or a full deploy list for a specific hosting provider and I will add the exact commands and environment variable names for that provider.

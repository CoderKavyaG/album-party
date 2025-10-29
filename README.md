# Album Party

A small Vite + React app that shows your saved Spotify albums in a Tailwind-powered gallery.

This repo is configured for a frontend-only Spotify auth flow (the app redirects the browser to Spotify and receives a short-lived access token).

Quick goals in this README:
- How to preview locally
- How to publish (GitHub + Vercel) so you get a public HTTPS URL to add to the Spotify Developer Dashboard
- Optional: test locally with ngrok

1) Preview locally

Requirements: Node.js (16+ recommended), npm.

Install deps and run dev server:

```powershell
cd d:\Kavya\album-party
npm install
npm run dev
```

Open http://localhost:5173 in your browser. Click "Sign in with Spotify" to start the client-side (implicit) flow. You will need to have added a Redirect URI in the Spotify app that matches your public site root if you test via ngrok or deploy.

2) Commit & push to GitHub (so you have a repo URL for Spotify)

If you don't have a remote repo yet, these are the commands to create one locally and push (replace <your-github-remote-url> with the HTTPS/SSH URL you create on GitHub):

```powershell
cd d:\Kavya\album-party
git init
git add .
git commit -m "Initial commit — Album Party frontend"
# Create a repo on GitHub via the website (or use `gh repo create` if you have the GitHub CLI).
git remote add origin <your-github-remote-url>
git push -u origin main
```

3) Deploy to Vercel (recommended for a quick public URL)

- Sign in to https://vercel.com and import this GitHub repository.
- In the Vercel project settings add an Environment Variable:
  - Name: `VITE_SPOTIFY_CLIENT_ID`
  - Value: (your Spotify Client ID)
- Deploy the project. After the deployment completes you will have a public site URL like `https://your-site.vercel.app`.

4) Add Redirect URI in Spotify Developer Dashboard

- Go to https://developer.spotify.com/dashboard and open your app.
- Edit Settings → Add Redirect URI: use your deployed site root with a trailing slash, e.g.:

```
https://your-site.vercel.app/
```

Note: the app uses the implicit flow `response_type=token` so Spotify will redirect back to your site root and include the access_token in the URL hash.

5) Optional — local HTTPS testing with ngrok

1. Start the dev server: `npm run dev` (http://localhost:5173)
2. Start ngrok: `ngrok http 5173`
3. Copy the HTTPS forwarding URL from ngrok (e.g. `https://abcd1234.ngrok.io`) and add this exact URL (with trailing slash) to the Spotify app Redirect URI list.
4. Visit the ngrok URL and click Sign in.

If you'd like, I can:
- Initialize git and make an initial commit for you here.
- Prepare exact Vercel instructions and try to trigger a deploy (I cannot push to your GitHub account automatically without credentials).
- Remove the leftover `server/` folder entirely from the repository to avoid confusion.

Tell me which of the above you'd like me to run next (init git + commit, start dev server now, delete server folder, or prepare Vercel deploy steps). 

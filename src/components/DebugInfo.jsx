import React from 'react'
import { getAccessToken } from '../utils/spotifyAuth'

function maskId(id) {
  if (!id) return '(none)'
  if (id.length <= 8) return id
  return id.slice(0, 4) + '…' + id.slice(-4)
}

export default function DebugInfo() {
  if (typeof window === 'undefined') return null
  const viteId = import.meta.env.VITE_SPOTIFY_CLIENT_ID || null
  const token = getAccessToken()
  const urlParams = new URLSearchParams(window.location.search)
  const show = urlParams.get('debug') === '1'
  if (!show) return null

  // compute what the authorize URL would be for the new server-backed flow
  const clientIdPlain = import.meta.env.VITE_SPOTIFY_CLIENT_ID || ''
  const redirectUri = `${window.location.origin}/api/callback`
  const scope = 'user-library-read'
  const authParams = new URLSearchParams({ response_type: 'code', client_id: clientIdPlain, redirect_uri: redirectUri, scope })
  const authorizeUrl = `https://accounts.spotify.com/authorize?${authParams.toString()}`

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-70 text-white text-sm p-3 rounded shadow-lg z-50">
      <div><strong>Debug</strong></div>
        <div>VITE_SPOTIFY_CLIENT_ID: {maskId(viteId)}</div>
        <div>client_id used for auth: {clientIdPlain ? clientIdPlain : '(none exposed)'}</div>
        <div>Redirect URI used for auth: <div className="break-words">{redirectUri}</div></div>
        <div>Authorize URL: <div className="break-words text-xs">{authorizeUrl}</div></div>
        <div>Access token present: {token ? 'yes' : 'no'}</div>
      <div className="text-xs text-gray-300 mt-1">Use <code>?debug=1</code> to show this panel.</div>
    </div>
  )
}

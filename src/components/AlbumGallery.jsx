import React from 'react'
import useSpotifyAlbums from '../hooks/useSpotifyAlbums'

export default function AlbumGallery() {
  const { albums, loading, error, authenticated } = useSpotifyAlbums()

  if (!authenticated) {
    // client-side implicit flow (simple) — prefer env var but fall back to the
    // public client id you provided so the deployed site works immediately.
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID || ''
    const redirect = window.location.origin + window.location.pathname
    const scope = 'user-library-read'
    const params = new URLSearchParams({ response_type: 'token', client_id: clientId, redirect_uri: redirect, scope })
    const authorizeUrl = `https://accounts.spotify.com/authorize?${params.toString()}`

    return (
      <div className="p-6 text-center">
        <a
          className="inline-block bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded"
          href={authorizeUrl}
        >
          Sign in with Spotify
        </a>
        <p className="mt-3 text-sm text-gray-500">You must sign in to view your saved albums.</p>
      </div>
    )
  }

  if (loading) return <div className="p-6">Loading albums…</div>
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>
  if (!albums.length) return <div className="p-6">No saved albums found.</div>

  return (
    <div className="p-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {albums.map((album) => {
          const image = album.images?.[0]?.url
          const artists = album.artists?.map((a) => a.name).join(', ')
          return (
            <div
              key={album.id}
              className="relative bg-gray-800 rounded overflow-hidden shadow-lg hover:scale-105 transform transition duration-200"
            >
              <img src={image} alt={album.name} className="w-full h-56 object-cover" />
              <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-50 transition duration-200 flex items-end">
                <div className="p-3 text-left text-white opacity-0 hover:opacity-100 transition duration-200">
                  <div className="font-semibold">{album.name}</div>
                  <div className="text-sm text-gray-200">{artists}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

import React, { useMemo, useState, useRef } from 'react'
import useSpotifyAlbums from '../hooks/useSpotifyAlbums'
import Collage from './CollageExport'
import { logout } from '../utils/spotifyAuth'

export default function AlbumGallery() {
  const { albums, loading, error, authenticated } = useSpotifyAlbums()
  const [showGrid, setShowGrid] = useState(false)
  const [seed, setSeed] = useState(1)
  const [density, setDensity] = useState(12)
  const [selectionCount, setSelectionCount] = useState(16)
  const collageRef = useRef(null)

  // keep images memo for potential grid rendering
  const images = useMemo(() => albums.map((a) => a.images?.[0]?.url).filter(Boolean), [albums])

  // helper to create a grid PNG (4x4) and trigger download
  async function downloadGrid(selection = []) {
    const size = 2400 // final image size
    const cols = 4
    const rows = 4
    const cell = Math.floor(size / cols)

    const loadImage = (src) => new Promise((res, rej) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => res(img)
      img.onerror = rej
      img.src = src
    })

    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    // background black
    ctx.fillStyle = '#050505'
    ctx.fillRect(0,0,canvas.width,canvas.height)

    for (let i=0;i<cols*rows;i++){
      const imgUrl = selection[i]?.images?.[0]?.url
      if (!imgUrl) continue
      try{
        const img = await loadImage(imgUrl)
        const x = (i % cols) * cell
        const y = Math.floor(i / cols) * cell
        // draw cover filling the cell with cover centered and cropped
        // compute aspect-fit crop
        const ratio = Math.max(cell / img.width, cell / img.height)
        const nw = img.width * ratio
        const nh = img.height * ratio
        const sx = (nw - cell) / 2 / ratio
        const sy = (nh - cell) / 2 / ratio
        ctx.drawImage(img, sx, sy, img.width - sx*2, img.height - sy*2, x, y, cell, cell)
      }catch(e){ console.warn('grid image load failed', e) }
    }

    const data = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = data
    a.download = `album-party-grid-16.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  if (!authenticated) {
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID || ''
    const redirectUri = `${window.location.origin}/api/callback`
    const scope = 'user-library-read'
    const params = new URLSearchParams({ response_type: 'code', client_id: clientId, redirect_uri: redirectUri, scope })
    const authorizeUrl = `https://accounts.spotify.com/authorize?${params.toString()}`

    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="max-w-2xl text-center">
          <h2 className="text-4xl font-extrabold mb-4">Album Party</h2>
          <p className="text-gray-300 mb-6">A beautiful collage of your saved Spotify albums — sign in to generate your album art mosaic.</p>
          <a href={authorizeUrl} className="spotify-btn inline-flex items-center gap-3">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2v20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Sign in with Spotify
          </a>
        </div>
      </div>
    )
  }

  if (loading) return <div className="p-6 text-center">Loading albums…</div>
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>
  if (!albums.length) return <div className="p-6 text-center">No saved albums found.</div>

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <section className="text-center mb-8">
          <h3 className="text-3xl font-extrabold mb-2">Your Album Collection</h3>
          <p className="text-gray-300 mb-4">A visual collage of your saved albums — generate a unique artwork or browse your collection below.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 controls-row">
            <div className="flex items-center gap-2">
              <button onClick={() => setSeed(Math.floor(Math.random() * 100000))} className="bg-white text-black font-semibold py-2 px-4 rounded shadow">Generate Collage</button>
              <button onClick={() => setDensity(d => Math.max(6, d - 2))} className="text-sm px-3 py-2 bg-gray-800 rounded">- Density</button>
              <div className="px-2 text-gray-300">{density} tiles</div>
              <button onClick={() => setDensity(d => Math.min(32, d + 2))} className="text-sm px-3 py-2 bg-gray-800 rounded">+ Density</button>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm muted">Select:</label>
              <button onClick={() => setSelectionCount(8)} className={`px-3 py-2 rounded ${selectionCount===8?'bg-spotify-accent text-white':'bg-gray-800 text-gray-200'}`}>Top 8</button>
              <button onClick={() => setSelectionCount(16)} className={`px-3 py-2 rounded ${selectionCount===16?'bg-spotify-accent text-white':'bg-gray-800 text-gray-200'}`}>Top 16</button>
              <button onClick={() => setSelectionCount(Infinity)} className={`px-3 py-2 rounded ${selectionCount===Infinity?'bg-spotify-accent text-white':'bg-gray-800 text-gray-200'}`}>All</button>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => location.reload()} className="bg-spotify-accent hover:brightness-95 text-white py-2 px-4 rounded spotify-accent">Regenerate</button>
              <button onClick={() => logout()} className="ml-2 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded">Sign out</button>
              <button onClick={async () => {
                try {
                  if (selectionCount === 16) {
                    await downloadGrid(albums.slice(0,16))
                    return
                  }
                  const data = collageRef.current?.toDataURL(3)
                  if (!data) return
                  const a = document.createElement('a')
                  a.href = data
                  a.download = `album-party-${selectionCount===Infinity?albums.length:selectionCount}.png`
                  document.body.appendChild(a)
                  a.click()
                  a.remove()
                } catch (e) {
                  console.error('download failed', e)
                }
              }} className="ml-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded">Download</button>
            </div>
          </div>
        </section>

        <section className="flex justify-center mb-8">
          <div className="frame-wrap">
            <div className="frame-panel glass-panel">
              <div className="frame-inner">
                {selectionCount === 16 ? (
                  <div className="album-grid" style={{margin:0}}>
                    {albums.slice(0,16).map(alb => (
                      <img key={alb.id} src={alb.images?.[0]?.url} alt={alb.name} className="album-tile" />
                    ))}
                  </div>
                ) : (
                  <Collage ref={collageRef} albums={selectionCount === Infinity ? albums : albums.slice(0, selectionCount)} size={720} density={density} seed={seed} />
                )}
              </div>
            </div>

            <div className="side-export">
              <button className="export-btn" title="Download" onClick={async () => {
                try{
                  if (selectionCount === 16) {
                    await downloadGrid(albums.slice(0,16))
                    return
                  }
                  const data = collageRef.current?.toDataURL(3)
                  if (!data) return
                  const a = document.createElement('a')
                  a.href = data
                  a.download = `album-party-${selectionCount===Infinity?albums.length:selectionCount}.png`
                  document.body.appendChild(a)
                  a.click()
                  a.remove()
                }catch(e){ console.error('download failed', e) }
              }}>Download</button>
              <select className="export-size" onChange={(e)=>{/* placeholder for size selection */}} defaultValue="3">
                <option value="2">2x</option>
                <option value="3">3x</option>
                <option value="4">4x</option>
              </select>
            </div>
          </div>
        </section>

        <section>
          <h4 className="text-xl font-semibold mb-3">Saved albums</h4>
          {showGrid ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {albums.map((album) => (
                <div key={album.id} className="bg-gray-900 rounded overflow-hidden shadow hover:scale-105 transform transition duration-200">
                  <img src={album.images?.[0]?.url} alt={album.name} className="w-full h-36 object-cover" />
                  <div className="p-3 text-xs text-gray-200">
                    <div className="font-semibold truncate">{album.name}</div>
                    <div className="text-gray-400 truncate">{album.artists?.map(a => a.name).join(', ')}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-400">Click "Show All Covers" to explore each album.</div>
          )}
        </section>
      </div>
    </div>
  )
}

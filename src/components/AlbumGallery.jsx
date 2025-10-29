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
  const [layoutMode, setLayoutMode] = useState('grid') // 'grid' | 'collage'
  const collageRef = useRef(null)

  // keep images memo for potential grid rendering
  const images = useMemo(() => albums.map((a) => a.images?.[0]?.url).filter(Boolean), [albums])

  // compute grid dimensions in N x (N-1) style, minimally covering count
  function getGridDims(count) {
    if (count === 16) return { cols: 4, rows: 4 }
    let n = 3
    while (n * (n - 1) < count) n++
    return { cols: n, rows: n - 1 }
  }

  // helper to create a grid PNG and trigger download
  async function downloadGrid(selection = []) {
    const size = 2400 // final image size
    const { cols, rows } = getGridDims(selection.length || selectionCount)
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
    a.download = `album-party-grid-${cols}x${rows}.png`
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
      <>
        <nav className="topnav">
          <div className="topnav-inner">
            <div className="nav-brand">Album Party</div>
            <div className="nav-actions">
              <a href={authorizeUrl} className="nav-btn">Login with Spotify</a>
            </div>
          </div>
        </nav>
        <div className="hero-wrap">
          <div className="max-w-3xl glass-card">
            <h1 className="hero-title gradient-text">Showcase Your <em>Album Collection</em></h1>
            <p className="hero-sub">A refined, Spotify‑synced gallery of your saved albums. Sign in to view and share a beautiful collection, designed with modern typography and subtle flair.</p>
            <a href={authorizeUrl} className="spotify-cta" aria-label="Login with Spotify">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12c6.627 0 12-5.373 12-12S18.627 0 12 0Zm5.5 17.3a.87.87 0 0 1-1.195.29c-3.27-2.003-7.393-2.46-12.257-1.36a.875.875 0 0 1-.37-1.712c5.25-1.135 9.77-.62 13.35 1.5.41.25.54.79.27 1.28Zm1.59-3.17a1.09 1.09 0 0 1-1.494.362c-3.742-2.29-9.454-2.956-13.877-1.634a1.093 1.093 0 0 1-.63-2.09c5.092-1.538 11.348-.804 15.6 1.767.52.32.68 1 .4 1.6Zm.16-3.3c-4.19-2.49-11.12-2.72-15.12-1.54a1.31 1.31 0 0 1-.76-2.51c4.64-1.4 12.3-1.12 17.12 1.76a1.31 1.31 0 1 1-1.25 2.29Z"/></svg>
              <span>Login with Spotify</span>
            </a>
            <div className="hero-divider" />
          </div>
        </div>
      </>
    )
  }

  if (loading) return <div className="p-6 text-center">Loading albums…</div>
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>
  if (!albums.length) return <div className="p-6 text-center">No saved albums found.</div>

  return (
    <>
      <nav className="topnav">
        <div className="topnav-inner">
          <div className="nav-brand">Album Party</div>
          <div className="nav-actions">
            <button onClick={() => logout()} className="nav-btn">Sign out</button>
          </div>
        </div>
      </nav>
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
        <section className="collection-hero">
          <h3 className="collection-title">Showcase Your Album Collection</h3>
          <p className="collection-sub">Create a poster‑worthy collage or browse a crisp grid of your saved albums. Elegantly designed for clarity and vibe.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 controls-row">
            <div className="flex items-center gap-2">
              <button onClick={() => setSeed(Math.floor(Math.random() * 100000))} className="bg-white text-black font-semibold py-2 px-4 rounded shadow">Generate Collage</button>
              <button onClick={() => setDensity(d => Math.max(6, d - 2))} className="text-sm px-3 py-2 bg-gray-800 rounded">- Density</button>
              <div className="px-2 text-gray-300">{density} tiles</div>
              <button onClick={() => setDensity(d => Math.min(32, d + 2))} className="text-sm px-3 py-2 bg-gray-800 rounded">+ Density</button>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm muted">Select:</label>
              <button onClick={() => { setSelectionCount(8); setLayoutMode('grid') }} className={`px-3 py-2 rounded ${selectionCount===8?'bg-spotify-accent text-white':'bg-gray-800 text-gray-200'}`}>Top 8</button>
              <button onClick={() => { setSelectionCount(16); setLayoutMode('grid') }} className={`px-3 py-2 rounded ${selectionCount===16?'bg-spotify-accent text-white':'bg-gray-800 text-gray-200'}`}>Top 16</button>
              <button onClick={() => { setSelectionCount(Infinity); setLayoutMode('collage') }} className={`px-3 py-2 rounded ${selectionCount===Infinity?'bg-spotify-accent text-white':'bg-gray-800 text-gray-200'}`}>All</button>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm muted">Layout:</label>
              <button onClick={() => setLayoutMode('grid')} className={`px-3 py-2 rounded ${layoutMode==='grid'?'bg-spotify-accent text-white':'bg-gray-800 text-gray-200'}`}>Grid</button>
              <button onClick={() => setLayoutMode('collage')} className={`px-3 py-2 rounded ${layoutMode==='collage'?'bg-spotify-accent text-white':'bg-gray-800 text-gray-200'}`}>Collage</button>
              <button onClick={() => location.reload()} className="bg-spotify-accent hover:brightness-95 text-white py-2 px-4 rounded spotify-accent">Regenerate</button>
              <button onClick={() => logout()} className="ml-2 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded">Sign out</button>
              <button onClick={async () => {
                try {
                  if (layoutMode === 'grid') {
                    const chosen = selectionCount===Infinity?albums:albums.slice(0, selectionCount)
                    await downloadGrid(chosen)
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
                {layoutMode === 'grid' ? (
                  (() => {
                    const chosen = selectionCount===Infinity?albums:albums.slice(0, selectionCount)
                    const dims = selectionCount===16?{cols:4,rows:4}:getGridDims(chosen.length)
                    const style = { margin:0, display:'grid', gridTemplateColumns:`repeat(${dims.cols}, 1fr)` }
                    const slots = dims.cols * dims.rows
                    return (
                      <div className="album-grid" style={style}>
                        {Array.from({length: slots}).map((_,i)=>{
                          const alb = chosen[i]
                          return alb ? <img key={alb.id} src={alb.images?.[0]?.url} alt={alb.name} className="album-tile"/> : <div key={`empty-${i}`} />
                        })}
                      </div>
                    )
                  })()
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
    </>
  )
}

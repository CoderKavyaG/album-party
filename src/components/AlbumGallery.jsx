import React, { useMemo, useState, useRef } from 'react'
import useSpotifyAlbums from '../hooks/useSpotifyAlbums'
import Collage from './CollageExport'
import { logout } from '../utils/spotifyAuth'

// Helper function to calculate optimal grid dimensions (n×n or n×(n-1))
function calculateGridDimensions(totalAlbums) {
  if (totalAlbums === 0) return { rows: 0, cols: 0, count: 0, type: 'square' }
  
  // Try to find perfect square first
  const sqrt = Math.sqrt(totalAlbums)
  const sqrtFloor = Math.floor(sqrt)
  
  // Check if it's a perfect square
  if (sqrtFloor * sqrtFloor === totalAlbums) {
    return { rows: sqrtFloor, cols: sqrtFloor, count: totalAlbums, type: 'square' }
  }
  
  // Try n×(n-1) rectangle
  const n = sqrtFloor + 1
  const rectCount = n * (n - 1)
  
  if (totalAlbums >= rectCount) {
    return { rows: n - 1, cols: n, count: rectCount, type: 'rectangle' }
  }
  
  // Fall back to largest square that fits
  return { rows: sqrtFloor, cols: sqrtFloor, count: sqrtFloor * sqrtFloor, type: 'square' }
}

export default function AlbumGallery() {
  const { albums, loading, error, authenticated } = useSpotifyAlbums()
  const [seed, setSeed] = useState(0)
  const [density, setDensity] = useState(16)
  const [currentPage, setCurrentPage] = useState('home') // 'home' or 'library'
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'collage'
  const [gridSize, setGridSize] = useState(4) // 3, 4, 5, 6, etc.
  const collageRef = useRef(null)
  
  // Calculate optimal grid dimensions based on available albums
  const gridDimensions = useMemo(() => calculateGridDimensions(albums.length), [albums.length])

  // keep images memo for potential grid rendering
  const images = useMemo(() => albums.map((a) => a.images?.[0]?.url).filter(Boolean), [albums])

  // helper to create a grid PNG and trigger download
  async function downloadGrid(selection = [], size = gridSize) {
    const imageSize = 2400 // final image size
    const cols = size
    const rows = size
    const cell = Math.floor(imageSize / cols)

    const loadImage = (src) => new Promise((res, rej) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => res(img)
      img.onerror = rej
      img.src = src
    })

    const canvas = document.createElement('canvas')
    canvas.width = imageSize
    canvas.height = imageSize
    const ctx = canvas.getContext('2d')
    // background black
    ctx.fillStyle = '#0a0a0a'
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
    a.download = `album-party-${cols}x${rows}-grid.png`
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
        <nav className="navbar">
          <div className="brand-name">Album Party</div>
        </nav>
        
        <div className="landing-container">
          {/* Floating CD Elements */}
          <div className="floating-cds">
            <div className="cd-element cd-1"></div>
            <div className="cd-element cd-2"></div>
            <div className="cd-element cd-3"></div>
          </div>
          
          <div className="landing-content">
            <h1 className="main-heading">
              Find Your <span className="highlight">Playlist</span>
            </h1>
            <p className="subheading">
              A Spotify-synced album art gallery — sign in to view your saved albums and create stunning visual collages of your music journey.
            </p>
            <a href={authorizeUrl} className="spotify-btn">
              <svg className="spotify-icon" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
              Login with Spotify
            </a>
            <div className="divider"></div>
            
            {/* Feature Cards */}
            <div className="features-section">
              <div className="feature-card">
                <div className="feature-icon icon-gallery"></div>
                <h3 className="feature-title">Visual Gallery</h3>
                <p className="feature-description">
                  Transform your saved albums into beautiful, shareable art grids
                </p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon icon-layout"></div>
                <h3 className="feature-title">Smart Layouts</h3>
                <p className="feature-description">
                  Automatically arranged in perfect square or rectangular grids
                </p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon icon-export"></div>
                <h3 className="feature-title">Export & Share</h3>
                <p className="feature-description">
                  Download high-quality images to share your music taste
                </p>
              </div>
            </div>
            
            {/* Stats Section */}
            <div className="stats-section">
              <div className="stat-item">
                <span className="stat-number">∞</span>
                <span className="stat-label">Albums Supported</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">100%</span>
                <span className="stat-label">Spotify Synced</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">HD</span>
                <span className="stat-label">Export Quality</span>
              </div>
            </div>
            
            {/* Showcase Section */}
            <div className="showcase-section">
              <div className="example-grid">
                <div className="example-album example-album-1"></div>
                <div className="example-album example-album-2"></div>
                <div className="example-album example-album-3"></div>
                <div className="example-album example-album-4"></div>
                <div className="example-album example-album-5"></div>
                <div className="example-album example-album-6"></div>
                <div className="example-album example-album-7"></div>
                <div className="example-album example-album-8"></div>
                <div className="example-album example-album-9"></div>
                <div className="example-album example-album-10"></div>
                <div className="example-album example-album-11"></div>
                <div className="example-album example-album-12"></div>
                <div className="example-album example-album-13"></div>
                <div className="example-album example-album-14"></div>
                <div className="example-album example-album-15"></div>
                <div className="example-album example-album-16"></div>
              </div>
              
              <div className="showcase-features">
                <div className="showcase-feature">
                  <span className="showcase-feature-icon">✨</span>
                  <span>Auto-organized layouts</span>
                </div>
                <div className="showcase-feature">
                  <span className="showcase-feature-icon">🎨</span>
                  <span>High-quality exports</span>
                </div>
                <div className="showcase-feature">
                  <span className="showcase-feature-icon">🔄</span>
                  <span>Real-time sync</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Vinyl Record Illustration */}
          <div className="vinyl-illustration">
            <div className="vinyl-record"></div>
          </div>
        </div>
      </>
    )
  }

  if (loading) return <div className="p-6 text-center">Loading albums…</div>
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>
  if (!albums.length) return <div className="p-6 text-center">No saved albums found.</div>

  const { rows, cols, count } = gridDimensions
  const gridClass = rows === cols ? `album-grid-${rows}x${cols}` : `album-grid-${rows}x${cols}`
  
  return (
    <>
      <nav className="navbar">
        <div className="brand-name">Album Party</div>
        <div className="nav-links">
          <button 
            onClick={() => setCurrentPage('home')} 
            className={`nav-link ${currentPage === 'home' ? 'active' : ''}`}
          >
            Home
          </button>
          <button 
            onClick={() => setCurrentPage('library')} 
            className={`nav-link ${currentPage === 'library' ? 'active' : ''}`}
          >
            Library
          </button>
        </div>
        <button onClick={() => logout()} className="btn btn-danger">Sign Out</button>
      </nav>
      
      <div className="app-container">
        {currentPage === 'home' ? (
          <div className="max-w-6xl mx-auto px-6">
            <header className="page-header">
              <h1 className="page-title">Your Sound Journey</h1>
              <p className="page-subtitle">
                {count} albums arranged in a {rows}×{cols} {gridDimensions.type === 'square' ? 'square' : 'rectangle'} grid
              </p>
            </header>

          <div className="controls-section">
            {/* View Mode Toggle */}
            <div className="control-group">
              <button 
                onClick={() => setViewMode('grid')} 
                className={`btn ${viewMode === 'grid' ? 'btn-active' : 'btn-secondary'}`}
              >
                Grid View
              </button>
              <button 
                onClick={() => setViewMode('collage')} 
                className={`btn ${viewMode === 'collage' ? 'btn-active' : 'btn-secondary'}`}
              >
                CD Collage
              </button>
            </div>

            {/* Grid Size Control */}
            {viewMode === 'grid' && (
              <div className="control-group">
                <button onClick={() => setGridSize(s => Math.max(3, s - 1))} className="btn btn-secondary">-</button>
                <span className="muted" style={{padding: '0 0.5rem'}}>{gridSize}×{gridSize} grid</span>
                <button onClick={() => setGridSize(s => Math.min(10, s + 1))} className="btn btn-secondary">+</button>
              </div>
            )}

            {/* Download Button */}
            <div className="control-group">
              <button onClick={async () => {
                const albumsToUse = albums.slice(0, gridSize * gridSize)
                await downloadGrid(albumsToUse, gridSize)
              }} className="btn btn-primary">Download Image</button>
            </div>

            <div className="control-group">
              <button onClick={() => setSeed(Math.floor(Math.random() * 100000))} className="btn btn-primary">
                Generate Collage
              </button>
              <button onClick={() => setDensity(d => Math.max(6, d - 2))} className="btn btn-secondary">-</button>
              <span className="muted" style={{padding: '0 0.5rem'}}>{density} tiles</span>
              <button onClick={() => setDensity(d => Math.min(32, d + 2))} className="btn btn-secondary">+</button>
            </div>

            <div className="control-group">
              <button onClick={() => location.reload()} className="btn btn-primary">Regenerate</button>
            </div>

            <div className="control-group">
              <button onClick={async () => {
                try {
                  const data = collageRef.current?.toDataURL(3)
                  if (!data) return
                  const a = document.createElement('a')
                  a.href = data
                  a.download = `album-party-${count}.png`
                  document.body.appendChild(a)
                  a.click()
                  a.remove()
                } catch (e) {
                  console.error('download failed', e)
                }
              }} className="btn btn-primary">Download</button>
            </div>
          </div>

          {/* Main Display Section */}
          <section className="flex justify-center mb-12">
            {viewMode === 'grid' ? (
              <div className={`album-grid album-grid-${gridSize}x${gridSize}`} style={{gridTemplateColumns: `repeat(${gridSize}, 1fr)`}}>
                {albums.slice(0, gridSize * gridSize).map(alb => (
                  <img key={alb.id} src={alb.images?.[0]?.url} alt={alb.name} className="album-tile" />
                ))}
              </div>
            ) : (
              <div className="cd-collage-container">
                {albums.slice(0, Math.min(20, albums.length)).map(alb => (
                  <div key={alb.id} className="cd-album">
                    <img src={alb.images?.[0]?.url} alt={alb.name} />
                  </div>
                ))}
              </div>
            )}
          </section>
          </div>
        ) : (
          <div className="library-page">
            <header className="page-header">
              <h1 className="page-title">Your Music Library</h1>
              <p className="page-subtitle">{albums.length} albums in your collection</p>
            </header>

            <div className="library-grid">
              {albums.map((album) => (
                <div key={album.id} className="library-card">
                  <div className="library-card-image">
                    <img src={album.images?.[0]?.url} alt={album.name} />
                  </div>
                  <div className="library-card-content">
                    <h3 className="library-card-title">{album.name}</h3>
                    <p className="library-card-artist">{album.artists?.map(a => a.name).join(', ')}</p>
                    <div className="library-card-meta">
                      <span>{album.total_tracks} tracks</span>
                      <span>•</span>
                      <span>{new Date(album.release_date).getFullYear()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

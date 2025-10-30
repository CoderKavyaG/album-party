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

// Vibe-based color themes
const VIBES = {
  dark: { name: 'Dark', color: '#0a0a0a' },
  midnight: { name: 'Midnight', color: '#1b263b' },
  sunset: { name: 'Sunset', color: '#2d1b00' },
  forest: { name: 'Forest', color: '#0f1a0f' }
}

export default function AlbumGallery() {
  const { albums, user, loading, error, authenticated } = useSpotifyAlbums()
  const [seed, setSeed] = useState(0)
  const [density, setDensity] = useState(16)
  const [currentPage, setCurrentPage] = useState('home') // 'home' or 'library'
  const [viewMode, setViewMode] = useState('collage') // 'grid' or 'collage' - default to collage
  
  // Auto-calculate best grid size based on album count
  const autoGridSize = useMemo(() => {
    const count = albums.length
    if (count <= 9) return 3
    if (count <= 16) return 4
    if (count <= 25) return 5
    if (count <= 36) return 6
    return Math.min(Math.ceil(Math.sqrt(count)), 10)
  }, [albums.length])
  
  const [gridSize, setGridSize] = useState(autoGridSize)
  const [cdCount, setCdCount] = useState(12) // Number of CDs to display in collage
  const [backgroundColor, setBackgroundColor] = useState('#0a0a0a') // Grid background color
  const [previewImage, setPreviewImage] = useState(null) // Preview before download
  const [selectedAlbum, setSelectedAlbum] = useState(null) // For track list modal
  const collageRef = useRef(null)
  
  // Update grid size when albums change
  useEffect(() => {
    setGridSize(autoGridSize)
  }, [autoGridSize])
  
  // Calculate optimal grid dimensions based on available albums
  const gridDimensions = useMemo(() => calculateGridDimensions(albums.length), [albums.length])

  // keep images memo for potential grid rendering
  const images = useMemo(() => albums.map((a) => a.images?.[0]?.url).filter(Boolean), [albums])

  // helper to create a grid PNG and trigger download
  async function downloadGrid(selection = [], size = gridSize) {
    const albumCount = selection.length
    const cols = size
    const rows = Math.ceil(albumCount / cols) // Only as many rows as needed
    
    // Calculate optimal cell size for quality
    const cellSize = size <= 4 ? 600 : size <= 6 ? 450 : 350
    const padding = 60
    const gap = 20
    
    // Calculate canvas size to fit content exactly (rectangular, not square)
    const imageWidth = (padding * 2) + (cellSize * cols) + (gap * (cols - 1))
    const imageHeight = (padding * 2) + (cellSize * rows) + (gap * (rows - 1))
    const cell = cellSize

    const loadImage = (src) => new Promise((res, rej) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => res(img)
      img.onerror = rej
      img.src = src
    })

    const canvas = document.createElement('canvas')
    canvas.width = imageWidth
    canvas.height = imageHeight
    const ctx = canvas.getContext('2d')
    // background with custom color
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    for (let i = 0; i < albumCount; i++){
      const imgUrl = selection[i]?.images?.[0]?.url
      if (!imgUrl) continue
      try{
        const img = await loadImage(imgUrl)
        const col = i % cols
        const row = Math.floor(i / cols)
        const x = padding + (col * cell) + (col * gap)
        const y = padding + (row * cell) + (row * gap)
        
        // Draw with rounded corners
        const radius = cell * 0.08 // 8% radius for rounded corners
        ctx.save()
        ctx.beginPath()
        ctx.moveTo(x + radius, y)
        ctx.lineTo(x + cell - radius, y)
        ctx.quadraticCurveTo(x + cell, y, x + cell, y + radius)
        ctx.lineTo(x + cell, y + cell - radius)
        ctx.quadraticCurveTo(x + cell, y + cell, x + cell - radius, y + cell)
        ctx.lineTo(x + radius, y + cell)
        ctx.quadraticCurveTo(x, y + cell, x, y + cell - radius)
        ctx.lineTo(x, y + radius)
        ctx.quadraticCurveTo(x, y, x + radius, y)
        ctx.closePath()
        ctx.clip()
        
        // draw cover filling the cell with cover centered and cropped
        const ratio = Math.max(cell / img.width, cell / img.height)
        const nw = img.width * ratio
        const nh = img.height * ratio
        const sx = (nw - cell) / 2 / ratio
        const sy = (nh - cell) / 2 / ratio
        ctx.drawImage(img, sx, sy, img.width - sx*2, img.height - sy*2, x, y, cell, cell)
        ctx.restore()
      }catch(e){ console.warn('grid image load failed', e) }
    }

    // Add watermark with username
    if (user?.display_name) {
      const watermarkPadding = 30
      const fontSize = 28
      ctx.font = `600 ${fontSize}px Inter, sans-serif`
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'bottom'
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
      ctx.shadowBlur = 10
      ctx.shadowOffsetX = 2
      ctx.shadowOffsetY = 2
      ctx.fillText(`@${user.display_name}`, imageWidth - watermarkPadding, imageHeight - watermarkPadding)
    }

    const data = canvas.toDataURL('image/png')
    return { data, filename: `album-party-${cols}x${rows}-grid.png` }
  }

  // Function to actually download the image
  function triggerDownload(dataUrl, filename) {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  // Helper to create CD collage download
  async function downloadCDCollage(selection = [], count = cdCount) {
    const maxCDs = Math.min(count, selection.length)
    
    // Match display: flexible wrapping layout
    const cdSize = 320
    const margin = -30 // Negative margin for overlap (matches CSS margin: -20px scaled up)
    const padding = 60
    const containerWidth = 1600 // Max width before wrapping
    
    // Calculate how many CDs fit per row
    const effectiveCdWidth = cdSize + margin
    const maxPerRow = Math.floor((containerWidth - padding * 2) / effectiveCdWidth)
    const cdsPerRow = Math.min(maxPerRow, maxCDs)
    const rows = Math.ceil(maxCDs / cdsPerRow)
    
    // Calculate actual canvas size
    const canvasWidth = padding * 2 + (cdsPerRow * effectiveCdWidth) + cdSize - effectiveCdWidth
    const canvasHeight = padding * 2 + (rows * effectiveCdWidth) + cdSize - effectiveCdWidth
    
    const loadImage = (src) => new Promise((res, rej) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => res(img)
      img.onerror = rej
      img.src = src
    })

    const canvas = document.createElement('canvas')
    canvas.width = canvasWidth
    canvas.height = canvasHeight
    const ctx = canvas.getContext('2d')
    
    // Background
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    // Arrange CDs in wrapping pattern (like flexbox)
    const positions = []
    for (let i = 0; i < maxCDs; i++) {
      const col = i % cdsPerRow
      const row = Math.floor(i / cdsPerRow)
      const x = padding + col * effectiveCdWidth
      const y = padding + row * effectiveCdWidth
      
      positions.push({ x, y })
    }

    // Draw CDs
    for (let i = 0; i < maxCDs; i++) {
      const imgUrl = selection[i]?.images?.[0]?.url
      if (!imgUrl) continue
      
      try {
        const img = await loadImage(imgUrl)
        const pos = positions[i]
        const radius = cdSize / 2
        
        // Draw shadow
        ctx.save()
        ctx.shadowColor = 'rgba(0,0,0,0.5)'
        ctx.shadowBlur = 20
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 10
        ctx.beginPath()
        ctx.arc(pos.x + radius, pos.y + radius, radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
        
        // Draw album cover (circular)
        ctx.save()
        ctx.beginPath()
        ctx.arc(pos.x + radius, pos.y + radius, radius, 0, Math.PI * 2)
        ctx.closePath()
        ctx.clip()
        ctx.drawImage(img, pos.x, pos.y, cdSize, cdSize)
        ctx.restore()
        
        // Draw border
        ctx.save()
        ctx.strokeStyle = 'rgba(255,255,255,0.1)'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(pos.x + radius, pos.y + radius, radius, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
        
        // Add CD center hole
        ctx.save()
        ctx.fillStyle = 'rgba(0,0,0,0.9)'
        ctx.shadowColor = 'rgba(0,0,0,0.8)'
        ctx.shadowBlur = 10
        ctx.beginPath()
        ctx.arc(pos.x + radius, pos.y + radius, 25, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
        
        // Add shine effect
        ctx.save()
        const gradient = ctx.createLinearGradient(pos.x, pos.y, pos.x + cdSize, pos.y + cdSize)
        gradient.addColorStop(0, 'rgba(255,255,255,0.15)')
        gradient.addColorStop(0.5, 'transparent')
        gradient.addColorStop(1, 'rgba(0,0,0,0.2)')
        ctx.globalCompositeOperation = 'overlay'
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(pos.x + radius, pos.y + radius, radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      } catch (e) {
        console.warn('CD image load failed', e)
      }
    }

    // Add watermark
    if (user?.display_name) {
      ctx.font = '600 32px Inter, sans-serif'
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'bottom'
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
      ctx.shadowBlur = 10
      ctx.fillText(`@${user.display_name}`, canvasSize - 40, canvasSize - 40)
    }

    const data = canvas.toDataURL('image/png')
    return { data, filename: 'album-party-cd-collage.png' }
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
              <h1 className="page-title">Create Your Album Art Party</h1>
              <p className="page-subtitle">
                Design stunning album grids and share with your friends
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

            {/* CD Count Control */}
            {viewMode === 'collage' && (
              <div className="control-group">
                <button onClick={() => setCdCount(c => Math.max(6, c - 2))} className="btn btn-secondary">-</button>
                <span className="muted" style={{padding: '0 0.5rem'}}>{cdCount} CDs</span>
                <button onClick={() => setCdCount(c => Math.min(30, c + 2))} className="btn btn-secondary">+</button>
              </div>
            )}

            {/* Vibe Themes */}
            <div className="control-group" style={{flexWrap: 'wrap', gap: '0.5rem'}}>
              {Object.entries(VIBES).map(([key, vibe]) => (
                <button 
                  key={key}
                  onClick={() => setBackgroundColor(vibe.color)} 
                  className="vibe-btn" 
                  style={{background: vibe.color}}
                  title={vibe.name}
                >
                  {vibe.name}
                </button>
              ))}
              <input 
                type="color" 
                value={backgroundColor} 
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="color-picker"
                title="Custom Color"
              />
            </div>

            {/* Download Button */}
            <div className="control-group">
              <button onClick={async () => {
                try {
                  console.log('Download button clicked, viewMode:', viewMode)
                  let result
                  if (viewMode === 'grid') {
                    const albumsToUse = albums.slice(0, gridSize * gridSize)
                    console.log('Generating grid with', albumsToUse.length, 'albums')
                    result = await downloadGrid(albumsToUse, gridSize)
                  } else {
                    const albumsToUse = albums.slice(0, Math.min(cdCount, albums.length))
                    console.log('Generating CD collage with', albumsToUse.length, 'albums')
                    result = await downloadCDCollage(albumsToUse, cdCount)
                  }
                  console.log('Result:', result ? 'Success' : 'Failed')
                  if (result) {
                    setPreviewImage(result)
                  } else {
                    alert('Failed to generate preview. Please try again.')
                  }
                } catch (error) {
                  console.error('Download error:', error)
                  alert('Error generating image: ' + error.message)
                }
              }} className="btn btn-primary">Preview & Download</button>
            </div>
          </div>

          {/* Main Display Section */}
          <section className="flex justify-center mb-12">
            {viewMode === 'grid' ? (
              <div className={`album-grid album-grid-${gridSize}x${gridSize}`} style={{gridTemplateColumns: `repeat(${gridSize}, 1fr)`, background: backgroundColor}}>
                {albums.slice(0, gridSize * gridSize).map(alb => (
                  <img key={alb.id} src={alb.images?.[0]?.url} alt={alb.name} className="album-tile" />
                ))}
              </div>
            ) : (
              <div className="cd-collage-container" style={{background: backgroundColor}}>
                {albums.slice(0, Math.min(cdCount, albums.length)).map(alb => (
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
                <div key={album.id} className="library-card" onClick={() => setSelectedAlbum(album)}>
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

      {/* Preview Modal */}
      {previewImage && (
        <div className="preview-modal" onClick={() => setPreviewImage(null)}>
          <div className="preview-content" onClick={(e) => e.stopPropagation()}>
            <button className="preview-close" onClick={() => setPreviewImage(null)}>✕</button>
            <h2 className="preview-title">Preview Your Grid</h2>
            <div className="preview-image-container">
              <img src={previewImage.data} alt="Preview" className="preview-image" />
            </div>
            <div className="preview-actions">
              <button 
                onClick={() => {
                  triggerDownload(previewImage.data, previewImage.filename)
                  setPreviewImage(null)
                }} 
                className="btn btn-primary"
              >
                Download Image
              </button>
              <button onClick={() => setPreviewImage(null)} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Track List Modal */}
      {selectedAlbum && (
        <div className="preview-modal" onClick={() => setSelectedAlbum(null)}>
          <div className="preview-content track-modal" onClick={(e) => e.stopPropagation()}>
            <button className="preview-close" onClick={() => setSelectedAlbum(null)}>✕</button>
            <div className="track-modal-header">
              <img src={selectedAlbum.images?.[0]?.url} alt={selectedAlbum.name} className="track-modal-cover" />
              <div>
                <h2 className="preview-title">{selectedAlbum.name}</h2>
                <p className="track-modal-artist">{selectedAlbum.artists?.map(a => a.name).join(', ')}</p>
                <p className="track-modal-meta">{selectedAlbum.total_tracks} tracks • {new Date(selectedAlbum.release_date).getFullYear()}</p>
              </div>
            </div>
            <div className="track-list">
              {selectedAlbum.tracks?.items?.map((track, idx) => (
                <div key={track.id} className="track-item">
                  <span className="track-number">{idx + 1}</span>
                  <span className="track-name">{track.name}</span>
                  <span className="track-duration">{Math.floor(track.duration_ms / 60000)}:{String(Math.floor((track.duration_ms % 60000) / 1000)).padStart(2, '0')}</span>
                </div>
              ))}
            </div>
            <div className="preview-actions">
              <a 
                href={selectedAlbum.external_urls?.spotify} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                Open in Spotify
              </a>
              <button onClick={() => setSelectedAlbum(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

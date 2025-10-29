import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react'

const CollageExport = forwardRef(function CollageExport({ albums = [], size = 520, density = 12, seed = 1 }, ref) {
  const canvasRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let mounted = true
    async function draw() {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      const dpr = window.devicePixelRatio || 1
      canvas.width = size * dpr
      canvas.height = size * dpr
      canvas.style.width = `${size}px`
      canvas.style.height = `${size}px`
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const imageUrls = albums
        .slice(0, Math.max(6, density))
        .map(a => a.images?.[0]?.url)
        .filter(Boolean)

      const loadImage = (src) => new Promise((res, rej) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => res(img)
        img.onerror = rej
        img.src = src
      })

      const items = imageUrls.slice(0, Math.max(6, density))
      const loaded = []
      for (let i = 0; i < items.length; i++) {
        try {
          const img = await loadImage(items[i])
          loaded.push(img)
        } catch (e) {
          // ignore
        }
      }

      // background
      const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
      g.addColorStop(0, '#07100d')
      g.addColorStop(1, '#08120f')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // vignette
      const cx = canvas.width / 2
      const cy = canvas.height / 2
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, canvas.width)
      grd.addColorStop(0, 'rgba(0,0,0,0)')
      grd.addColorStop(1, 'rgba(0,0,0,0.45)')
      ctx.fillStyle = grd
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      if (!mounted) return

      const baseSize = (canvas.width / dpr) * 0.36
      for (let i = 0; i < loaded.length; i++) {
        const img = loaded[i]
        const angle = (i - (loaded.length - 1) / 2) * (Math.PI / 18)
        const radius = (canvas.width / dpr) * 0.06 + Math.abs(i - loaded.length / 2) * ((canvas.width / dpr) * 0.02)
        const x = (cx / dpr) + Math.cos(angle) * radius - baseSize / 2
        const y = (cy / dpr) + Math.sin(angle) * radius - baseSize / 2

        ctx.save()
        ctx.translate((x + baseSize / 2) * dpr, (y + baseSize / 2) * dpr)
        ctx.rotate(((seed % 10) - 5) * 0.02 + (i - loaded.length / 2) * 0.02)
        ctx.drawImage(img, -baseSize / 2 * dpr, -baseSize / 2 * dpr, baseSize * dpr, baseSize * dpr)
        ctx.lineWidth = 6 * dpr
        ctx.strokeStyle = 'rgba(0,0,0,0.35)'
        ctx.strokeRect(-baseSize / 2 * dpr, -baseSize / 2 * dpr, baseSize * dpr, baseSize * dpr)
        ctx.restore()
      }

      if (mounted) setReady(true)
    }

    draw()
    return () => { mounted = false }
  }, [albums, size, density, seed])

  useImperativeHandle(ref, () => ({
    toDataURL: (scale = 2) => {
      const canvas = canvasRef.current
      if (!canvas) return null
      const tmp = document.createElement('canvas')
      tmp.width = canvas.width * scale
      tmp.height = canvas.height * scale
      const tctx = tmp.getContext('2d')
      tctx.drawImage(canvas, 0, 0, tmp.width, tmp.height)
      return tmp.toDataURL('image/png')
    }
  }))

  return (
    <div className="w-full flex items-center justify-center">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 rounded-2xl shadow-2xl">
        <canvas ref={canvasRef} className="rounded-lg" aria-hidden={!ready} />
      </div>
    </div>
  )
})

export default CollageExport

import React from 'react'
import AlbumGallery from './components/AlbumGallery'
import './App.css'

export default function App() {
    return (
        <div className="app-bg min-h-screen text-white relative overflow-hidden">
            <div className="brand-badge">Album Party</div>
            <main>
                <AlbumGallery />
            </main>
        </div>
    )
}

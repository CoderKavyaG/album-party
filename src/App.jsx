import React from 'react'
import AlbumGallery from './components/AlbumGallery'
import './App.css'
import DebugInfo from './components/DebugInfo'

export default function App() {
	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 text-white">
			<header className="py-8 text-center">
				<h1 className="text-3xl font-bold">Album Party</h1>
				<p className="mt-2 text-gray-300">A Spotify-synced album art gallery — sign in to view your saved albums.</p>
			</header>
			<main>
				<AlbumGallery />
			</main>
			<DebugInfo />
		</div>
	)
}

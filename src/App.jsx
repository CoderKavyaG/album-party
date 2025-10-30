import React from 'react'
import AlbumGallery from './components/AlbumGallery'
import AdminDashboard from './components/AdminDashboard'
import './App.css'

export default function App() {
    // Simple routing based on URL path
    const isAdminRoute = window.location.pathname === '/admin'
    
    return (
        <div className="min-h-screen text-white relative overflow-hidden">
            {isAdminRoute ? <AdminDashboard /> : <AlbumGallery />}
        </div>
    )
}

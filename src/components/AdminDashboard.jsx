import React, { useState, useEffect } from 'react'

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [adminKey, setAdminKey] = useState('')
  const [authenticated, setAuthenticated] = useState(false)

  const fetchAnalytics = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/analytics', {
        headers: {
          'X-Admin-Key': adminKey
        }
      })
      
      if (!response.ok) {
        throw new Error('Unauthorized or failed to fetch')
      }
      
      const data = await response.json()
      setAnalytics(data)
      setAuthenticated(true)
      
      // Save key to sessionStorage
      sessionStorage.setItem('admin_key', adminKey)
    } catch (err) {
      setError(err.message)
      setAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Check if admin key exists in session
    const savedKey = sessionStorage.getItem('admin_key')
    if (savedKey) {
      setAdminKey(savedKey)
      fetchAnalytics()
    }
  }, [])

  if (!authenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-dark)',
        padding: '2rem'
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          padding: '3rem',
          borderRadius: '16px',
          maxWidth: '400px',
          width: '100%'
        }}>
          <h1 style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '1.75rem',
            marginBottom: '1rem',
            color: 'var(--text-primary)'
          }}>
            Admin Dashboard
          </h1>
          <p style={{
            fontFamily: 'Inter, sans-serif',
            color: 'var(--text-secondary)',
            marginBottom: '2rem'
          }}>
            Enter your admin secret key to access analytics
          </p>
          
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="Admin Secret Key"
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(0,0,0,0.3)',
              color: 'var(--text-primary)',
              fontFamily: 'Inter, sans-serif',
              marginBottom: '1rem'
            }}
            onKeyPress={(e) => e.key === 'Enter' && fetchAnalytics()}
          />
          
          {error && (
            <p style={{
              color: '#ef4444',
              fontSize: '0.875rem',
              marginBottom: '1rem'
            }}>
              {error}
            </p>
          )}
          
          <button
            onClick={fetchAnalytics}
            disabled={loading || !adminKey}
            className="btn btn-primary"
            style={{ width: '100%' }}
          >
            {loading ? 'Authenticating...' : 'Access Dashboard'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-dark)',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem'
        }}>
          <h1 style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '2rem',
            color: 'var(--text-primary)'
          }}>
            Album Party Analytics
          </h1>
          <button
            onClick={() => {
              sessionStorage.removeItem('admin_key')
              setAuthenticated(false)
              setAdminKey('')
            }}
            className="btn btn-secondary"
          >
            Logout
          </button>
        </div>

        {analytics && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            <div className="stat-card">
              <div className="stat-number">{analytics.totalUsers}</div>
              <div className="stat-label">Total Users</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-number">{analytics.activeToday}</div>
              <div className="stat-label">Active Today</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-number">{analytics.activeLast7Days}</div>
              <div className="stat-label">Last 7 Days</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-number">{analytics.activeLast30Days}</div>
              <div className="stat-label">Last 30 Days</div>
            </div>
          </div>
        )}

        {analytics?.message && (
          <div style={{
            background: 'rgba(29,185,84,0.1)',
            border: '1px solid rgba(29,185,84,0.3)',
            borderRadius: '12px',
            padding: '1.5rem',
            color: 'var(--spotify-green)',
            fontFamily: 'Inter, sans-serif'
          }}>
            <strong>Note:</strong> {analytics.message}
          </div>
        )}

        <button
          onClick={fetchAnalytics}
          className="btn btn-primary"
          style={{ marginTop: '2rem' }}
        >
          Refresh Data
        </button>
      </div>
    </div>
  )
}

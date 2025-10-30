// Simple analytics endpoint to track user logins
// This stores data in Vercel KV (you'll need to set this up in Vercel dashboard)

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Check for admin secret key
  const adminKey = req.headers['x-admin-key']
  const correctKey = process.env.ADMIN_SECRET_KEY
  
  if (!adminKey || adminKey !== correctKey) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    // For now, return mock data
    // In production, you'd connect to Vercel KV or a database
    const analytics = {
      totalUsers: 0,
      activeToday: 0,
      activeLast7Days: 0,
      activeLast30Days: 0,
      message: 'Analytics tracking not yet configured. Add Vercel KV to enable.'
    }

    res.json(analytics)
  } catch (error) {
    console.error('Analytics error:', error)
    res.status(500).json({ error: 'Failed to fetch analytics' })
  }
}

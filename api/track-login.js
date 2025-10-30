// Track user logins (called after successful OAuth)
// This would store login events in Vercel KV or database

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, timestamp } = req.body
    
    // In production, you would:
    // 1. Store in Vercel KV: await kv.zadd('user_logins', timestamp, userId)
    // 2. Or use a database to track login events
    
    console.log('User login tracked:', { userId, timestamp })
    
    res.json({ success: true })
  } catch (error) {
    console.error('Track login error:', error)
    res.status(500).json({ error: 'Failed to track login' })
  }
}

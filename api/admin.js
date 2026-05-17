import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    // List all users
    const keys = await redis.keys('user:*');
    const users = [];
    for (const key of keys) {
      const raw = await redis.get(key);
      if (raw) {
        const u = typeof raw === 'string' ? JSON.parse(raw) : raw;
        users.push({ name: u.name, email: u.email, status: u.status, createdAt: u.createdAt });
      }
    }
    users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.status(200).json({ users });
  }

  if (req.method === 'POST') {
    const { email, action } = req.body || {};
    if (!email || !action) return res.status(400).json({ error: 'Missing fields' });

    const raw = await redis.get(`user:${email}`);
    if (!raw) return res.status(404).json({ error: 'User not found' });

    const user = typeof raw === 'string' ? JSON.parse(raw) : raw;
    user.status = action === 'approve' ? 'approved' : action === 'suspend' ? 'suspended' : user.status;
    await redis.set(`user:${email}`, JSON.stringify(user));

    if (action === 'approve') await redis.srem('users:pending', email);
    if (action === 'delete') await redis.del(`user:${email}`);

    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}

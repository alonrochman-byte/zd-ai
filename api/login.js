import { Redis } from '@upstash/redis';
import bcrypt from 'bcryptjs';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

  const raw = await redis.get(`user:${email}`);
  if (!raw) return res.status(401).json({ error: 'User not found' });

  const user = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (user.status !== 'approved') return res.status(403).json({ error: user.status === 'pending' ? 'Your account is pending approval' : 'Account suspended' });

  const valid = await bcrypt.compare(password, user.hash);
  if (!valid) return res.status(401).json({ error: 'Wrong password' });

  res.status(200).json({ ok: true, name: user.name, email: user.email });
}

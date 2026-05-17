import { Redis } from '@upstash/redis';
import bcrypt from 'bcryptjs';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });

  const existing = await redis.get(`user:${email}`);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const hash = await bcrypt.hash(password, 10);
  const user = { name, email, hash, status: 'pending', createdAt: new Date().toISOString() };
  await redis.set(`user:${email}`, JSON.stringify(user));
  await redis.sadd('users:pending', email);

  // Notify admin
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    // Send notification via simple fetch to email service if configured
    console.log(`New registration pending: ${name} (${email})`);
  }

  res.status(200).json({ ok: true });
}

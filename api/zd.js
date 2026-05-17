export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-ZD-Auth, X-ZD-Subdomain');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = req.headers['x-zd-auth'];
  const subdomain = req.headers['x-zd-subdomain'];
  if (!auth || !subdomain) return res.status(400).json({ error: 'Missing credentials' });

  const path = req.query.path || '';
  const queryString = Object.entries(req.query)
    .filter(([k]) => k !== 'path')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');

  const url = `https://${subdomain}.zendesk.com/api/v2/${path}${queryString ? '?' + queryString : ''}`;

  try {
    const response = await fetch(url, {
      method: req.method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

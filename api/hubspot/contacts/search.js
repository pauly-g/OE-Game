// Vercel serverless function for HubSpot contacts search API
const HUBSPOT_ACCESS_TOKEN = process.env.VITE_HUBSPOT_ACCESS_TOKEN;
const HUBSPOT_API_BASE = 'https://api.hubapi.com';

// Helper function to make HubSpot API requests
async function hubspotRequest(endpoint, options = {}) {
  const url = `${HUBSPOT_API_BASE}${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
    ...options.headers
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`HubSpot API error: ${errorData.message || response.statusText}`);
  }

  return response.json();
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (!HUBSPOT_ACCESS_TOKEN) {
    console.error('[Vercel] VITE_HUBSPOT_ACCESS_TOKEN not found in environment variables');
    res.status(500).json({ error: 'HubSpot configuration missing' });
    return;
  }

  try {
    if (req.method === 'POST') {
      console.log('[Vercel] Searching for contact:', req.body);
      const result = await hubspotRequest('/crm/v3/objects/contacts/search', {
        method: 'POST',
        body: JSON.stringify(req.body)
      });
      res.json(result);
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('[Vercel] Contact search error:', error);
    res.status(500).json({ error: error.message });
  }
} 
// Vercel serverless function for HubSpot contact update API
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
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, OPTIONS');
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

  const { id } = req.query;

  try {
    if (req.method === 'PATCH') {
      console.log('[Vercel] Updating contact:', id);
      console.log('[Vercel] Update properties:', JSON.stringify(req.body.properties, null, 2));
      
      try {
        const result = await hubspotRequest(`/crm/v3/objects/contacts/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(req.body)
        });
        console.log('[Vercel] HubSpot contact update successful');
        res.json(result);
      } catch (error) {
        console.error('[Vercel] Contact update error:', error);
        
        // If the error is about missing properties, try again without those properties
        if (error.message.includes('Property') && error.message.includes('does not exist')) {
          console.log('[Vercel] Retrying without problematic properties...');
          try {
            const cleanedProperties = { ...req.body.properties };
            
            // Remove potentially problematic properties
            if (error.message.includes('game_session_duration')) {
              delete cleanedProperties.game_session_duration;
              console.log('[Vercel] Removed game_session_duration property');
            }
            if (error.message.includes('game_high_score')) {
              delete cleanedProperties.game_high_score;
              console.log('[Vercel] Removed game_high_score property');
            }
            
            const retryResult = await hubspotRequest(`/crm/v3/objects/contacts/${id}`, {
              method: 'PATCH',
              body: JSON.stringify({ properties: cleanedProperties })
            });
            
            console.log('[Vercel] Retry successful with cleaned properties');
            res.json(retryResult);
            return;
          } catch (retryError) {
            console.error('[Vercel] Retry also failed:', retryError);
          }
        }
        
        res.status(500).json({ error: error.message });
      }
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('[Vercel] API error:', error);
    res.status(500).json({ error: error.message });
  }
} 
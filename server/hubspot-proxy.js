import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PROXY_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// HubSpot API Configuration
const HUBSPOT_ACCESS_TOKEN = process.env.VITE_HUBSPOT_ACCESS_TOKEN;
const HUBSPOT_API_BASE = 'https://api.hubapi.com';

if (!HUBSPOT_ACCESS_TOKEN) {
  console.error('VITE_HUBSPOT_ACCESS_TOKEN not found in environment variables');
  process.exit(1);
}

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

// Proxy endpoints
app.post('/api/hubspot/contacts/search', async (req, res) => {
  try {
    console.log('Searching for contact:', req.body);
    const result = await hubspotRequest('/crm/v3/objects/contacts/search', {
      method: 'POST',
      body: JSON.stringify(req.body)
    });
    res.json(result);
  } catch (error) {
    console.error('Contact search error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/hubspot/contacts', async (req, res) => {
  try {
    console.log('Creating contact with properties:', JSON.stringify(req.body.properties, null, 2));
    const result = await hubspotRequest('/crm/v3/objects/contacts', {
      method: 'POST',
      body: JSON.stringify(req.body)
    });
    console.log('HubSpot contact creation successful:', result.id);
    res.json(result);
  } catch (error) {
    console.error('Contact creation error:', error);
    
    // If the error is about missing properties, try again without those properties
    if (error.message.includes('Property') && error.message.includes('does not exist')) {
      console.log('Property error detected:', error.message);
      console.log('Retrying contact creation without problematic properties...');
      try {
        // Remove problematic properties and retry
        const cleanedProperties = { ...req.body.properties };
        
        // Remove potentially problematic properties
        if (error.message.includes('game_session_duration')) {
          delete cleanedProperties.game_session_duration;
          console.log('Removed game_session_duration property');
        }
        if (error.message.includes('game_high_score')) {
          delete cleanedProperties.game_high_score;
          console.log('Removed game_high_score property');
        }
        
        console.log('Retrying with cleaned properties:', JSON.stringify(cleanedProperties, null, 2));
        
        const retryResult = await hubspotRequest('/crm/v3/objects/contacts', {
          method: 'POST',
          body: JSON.stringify({ properties: cleanedProperties })
        });
        
        console.log('Contact creation retry successful with cleaned properties, ID:', retryResult.id);
        res.json(retryResult);
        return;
      } catch (retryError) {
        console.error('Contact creation retry also failed:', retryError);
      }
    }
    
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/hubspot/contacts/:contactId', async (req, res) => {
  try {
    console.log('Updating contact:', req.params.contactId);
    console.log('Update properties:', JSON.stringify(req.body.properties, null, 2));
    const result = await hubspotRequest(`/crm/v3/objects/contacts/${req.params.contactId}`, {
      method: 'PATCH',
      body: JSON.stringify(req.body)
    });
    console.log('HubSpot contact update successful');
    res.json(result);
  } catch (error) {
    console.error('Contact update error:', error);
    
    // If the error is about missing properties, try again without those properties
    if (error.message.includes('Property') && error.message.includes('does not exist')) {
      console.log('Retrying without problematic properties...');
      try {
        // Remove problematic properties and retry
        const cleanedProperties = { ...req.body.properties };
        delete cleanedProperties.game_session_duration; // Remove if it doesn't exist
        
        const retryResult = await hubspotRequest(`/crm/v3/objects/contacts/${req.params.contactId}`, {
          method: 'PATCH',
          body: JSON.stringify({ properties: cleanedProperties })
        });
        
        console.log('Retry successful with cleaned properties');
        res.json(retryResult);
        return;
      } catch (retryError) {
        console.error('Retry also failed:', retryError);
      }
    }
    
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint
app.get('/api/hubspot/test', async (req, res) => {
  try {
    const result = await hubspotRequest('/crm/v3/objects/contacts?limit=1');
    res.json({ success: true, message: 'HubSpot connection successful' });
  } catch (error) {
    console.error('Connection test error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`HubSpot proxy server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
}); 
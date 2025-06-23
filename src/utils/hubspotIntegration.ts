// HubSpot API Configuration
const HUBSPOT_ACCESS_TOKEN = import.meta.env.VITE_HUBSPOT_ACCESS_TOKEN;
const HUBSPOT_PORTAL_ID = import.meta.env.VITE_HUBSPOT_PORTAL_ID;
const PROXY_BASE_URL = import.meta.env.PROD ? '' : 'http://localhost:3001';

// Types for contact data
export interface GameContactData {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  acceptsMarketing: boolean;
  gameScore?: number;
  sessionDuration?: number; // in minutes
}

// Custom properties that should exist in your HubSpot account
const CUSTOM_PROPERTIES = {
  ACCEPTS_MARKETING: 'accepts_marketing',
  PLAYED_ORDER_EDITING_GAME: 'played_order_editing_game',
  GAME_HIGH_SCORE: 'game_high_score',
  FIRST_GAME_PLAY_DATE: 'first_game_play_date',
  LAST_GAME_PLAY_DATE: 'last_game_play_date',
  GAME_SESSION_DURATION: 'game_session_duration'
};

// Error types
export class HubSpotError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'HubSpotError';
  }
}

/**
 * Make authenticated request to HubSpot API via proxy server
 */
async function hubspotRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  const url = `${PROXY_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    ...options
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new HubSpotError(
      `Proxy API error: ${errorData.error || response.statusText}`,
      response.status
    );
  }

  return response.json();
}

/**
 * Create or update a contact in HubSpot with game data and marketing consent
 */
export async function createOrUpdateContact(contactData: GameContactData): Promise<boolean> {
  if (!HUBSPOT_ACCESS_TOKEN) {
    console.warn('HubSpot access token not found. HubSpot integration disabled.');
    return false;
  }

  try {
    console.log('Creating/updating HubSpot contact:', contactData.email);

    // Prepare contact properties
    const properties: Record<string, any> = {
      email: contactData.email,
      [CUSTOM_PROPERTIES.ACCEPTS_MARKETING]: contactData.acceptsMarketing.toString(),
      [CUSTOM_PROPERTIES.PLAYED_ORDER_EDITING_GAME]: 'true',
      [CUSTOM_PROPERTIES.LAST_GAME_PLAY_DATE]: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
    };

    // Add session duration if the property exists in HubSpot (convert minutes to seconds)
    if (contactData.sessionDuration !== undefined) {
      const durationInSeconds = Math.round(contactData.sessionDuration * 60);
      properties[CUSTOM_PROPERTIES.GAME_SESSION_DURATION] = durationInSeconds;
      console.log('Adding session duration:', durationInSeconds, 'seconds');
    }

    // Try to find existing contact first
    const existingContact = await findContactByEmail(contactData.email);

    if (existingContact) {
      // Update existing contact
      console.log('Updating existing contact:', existingContact.id);
      
      // Only update company if provided (never update firstName/lastName to prevent duplication)
      if (contactData.company) properties.company = contactData.company;
      
      // Preserve high score (only update if new score is higher)
      if (contactData.gameScore !== undefined) {
        const currentHighScore = existingContact.properties[CUSTOM_PROPERTIES.GAME_HIGH_SCORE];
        const newScore = contactData.gameScore;
        
        if (!currentHighScore || newScore > parseInt(currentHighScore)) {
          properties[CUSTOM_PROPERTIES.GAME_HIGH_SCORE] = newScore;
        }
      }

      // Set first play date only if it's not already set
      if (!existingContact.properties[CUSTOM_PROPERTIES.FIRST_GAME_PLAY_DATE]) {
        properties[CUSTOM_PROPERTIES.FIRST_GAME_PLAY_DATE] = new Date().toISOString().split('T')[0];
        console.log('Setting first game play date for existing contact');
      }

      // Update the contact
      await hubspotRequest(`/api/hubspot/contacts/${existingContact.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ properties })
      });

      console.log('Successfully updated HubSpot contact');
    } else {
      // Create new contact
      console.log('Creating new contact');
      
      // Add optional properties if provided (only when creating new contact)
      if (contactData.firstName) properties.firstname = contactData.firstName;
      if (contactData.lastName) properties.lastname = contactData.lastName;
      if (contactData.company) properties.company = contactData.company;
      
      // Set high score for new contact
      if (contactData.gameScore !== undefined) {
        properties[CUSTOM_PROPERTIES.GAME_HIGH_SCORE] = contactData.gameScore;
      }
      
      // Set first play date for new contact
      properties[CUSTOM_PROPERTIES.FIRST_GAME_PLAY_DATE] = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

      await hubspotRequest('/api/hubspot/contacts', {
        method: 'POST',
        body: JSON.stringify({ properties })
      });

      console.log('Successfully created HubSpot contact');
    }

    return true;
  } catch (error: any) {
    console.error('Error creating/updating HubSpot contact:', error);
    throw new HubSpotError(`Failed to update contact: ${error.message}`);
  }
}

/**
 * Find a contact by email address
 */
async function findContactByEmail(email: string): Promise<any | null> {
  try {
    const searchRequest = {
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'email',
              operator: 'EQ',
              value: email
            }
          ]
        }
      ],
      properties: [
        'email',
        'firstname',
        'lastname',
        'company',
        CUSTOM_PROPERTIES.GAME_HIGH_SCORE,
        CUSTOM_PROPERTIES.ACCEPTS_MARKETING,
        CUSTOM_PROPERTIES.FIRST_GAME_PLAY_DATE
      ]
    };

    const searchResult = await hubspotRequest('/api/hubspot/contacts/search', {
      method: 'POST',
      body: JSON.stringify(searchRequest)
    });
    
    return searchResult.results && searchResult.results.length > 0 
      ? searchResult.results[0] 
      : null;
  } catch (error: any) {
    console.error('Error searching for contact:', error);
    return null;
  }
}

/**
 * Update marketing consent for an existing contact
 */
export async function updateMarketingConsent(email: string, acceptsMarketing: boolean): Promise<boolean> {
  if (!HUBSPOT_ACCESS_TOKEN) {
    console.warn('HubSpot access token not found. HubSpot integration disabled.');
    return false;
  }

  try {
    const existingContact = await findContactByEmail(email);
    
    if (!existingContact) {
      console.warn('Contact not found for marketing consent update:', email);
      return false;
    }

    await hubspotRequest(`/api/hubspot/contacts/${existingContact.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        properties: {
          [CUSTOM_PROPERTIES.ACCEPTS_MARKETING]: acceptsMarketing.toString()
        }
      })
    });

    console.log('Successfully updated marketing consent for:', email);
    return true;
  } catch (error: any) {
    console.error('Error updating marketing consent:', error);
    throw new HubSpotError(`Failed to update marketing consent: ${error.message}`);
  }
}

/**
 * Update a contact's high score
 */
export async function updateHighScore(email: string, newScore: number): Promise<boolean> {
  if (!HUBSPOT_ACCESS_TOKEN) {
    console.warn('HubSpot access token not found. HubSpot integration disabled.');
    return false;
  }

  try {
    const existingContact = await findContactByEmail(email);
    
    if (!existingContact) {
      console.warn('Contact not found for high score update:', email);
      return false;
    }

    // Only update if new score is higher
    const currentHighScore = existingContact.properties[CUSTOM_PROPERTIES.GAME_HIGH_SCORE];
    if (currentHighScore && newScore <= parseInt(currentHighScore)) {
      console.log('New score is not higher than current high score, skipping update');
      return true;
    }

    await hubspotRequest(`/api/hubspot/contacts/${existingContact.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        properties: {
          [CUSTOM_PROPERTIES.GAME_HIGH_SCORE]: newScore,
          [CUSTOM_PROPERTIES.LAST_GAME_PLAY_DATE]: new Date().toISOString().split('T')[0] // YYYY-MM-DD format
        }
      })
    });

    console.log('Successfully updated high score for:', email);
    return true;
  } catch (error: any) {
    console.error('Error updating high score:', error);
    throw new HubSpotError(`Failed to update high score: ${error.message}`);
  }
}


/**
 * Get device type for tracking
 */
export function getDeviceType(): string {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (/mobile|android|iphone|ipad|phone|tablet/.test(userAgent)) {
    return 'Mobile';
  } else {
    return 'Desktop';
  }
}

/**
 * Validate HubSpot configuration
 */
export function validateHubSpotConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!HUBSPOT_ACCESS_TOKEN) {
    errors.push('VITE_HUBSPOT_ACCESS_TOKEN is not set');
  }
  
  if (!HUBSPOT_PORTAL_ID) {
    errors.push('VITE_HUBSPOT_PORTAL_ID is not set');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Test HubSpot connection
 */
export async function testHubSpotConnection(): Promise<boolean> {
  try {
    await hubspotRequest('/api/hubspot/test');
    console.log('HubSpot connection test successful');
    return true;
  } catch (error) {
    console.error('HubSpot connection test failed:', error);
    return false;
  }
} 
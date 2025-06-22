import { Client } from '@hubspot/api-client';

// HubSpot API Configuration
const HUBSPOT_ACCESS_TOKEN = import.meta.env.VITE_HUBSPOT_ACCESS_TOKEN;
const HUBSPOT_PORTAL_ID = import.meta.env.VITE_HUBSPOT_PORTAL_ID;

// Initialize HubSpot client
let hubspotClient: Client | null = null;

if (HUBSPOT_ACCESS_TOKEN) {
  hubspotClient = new Client({ accessToken: HUBSPOT_ACCESS_TOKEN });
} else {
  console.warn('HubSpot access token not found. HubSpot integration disabled.');
}

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
 * Create or update a contact in HubSpot with game data and marketing consent
 */
export async function createOrUpdateContact(contactData: GameContactData): Promise<boolean> {
  if (!hubspotClient) {
    console.warn('HubSpot client not initialized. Skipping contact update.');
    return false;
  }

  try {
    console.log('Creating/updating HubSpot contact:', contactData.email);

    // Prepare contact properties
    const properties: Record<string, any> = {
      email: contactData.email,
      [CUSTOM_PROPERTIES.ACCEPTS_MARKETING]: contactData.acceptsMarketing.toString(),
      [CUSTOM_PROPERTIES.PLAYED_ORDER_EDITING_GAME]: 'true',
      [CUSTOM_PROPERTIES.LAST_GAME_PLAY_DATE]: new Date().toISOString(),
    };

    // Add optional properties if provided
    if (contactData.firstName) properties.firstname = contactData.firstName;
    if (contactData.lastName) properties.lastname = contactData.lastName;
    if (contactData.company) properties.company = contactData.company;
    if (contactData.sessionDuration !== undefined) properties[CUSTOM_PROPERTIES.GAME_SESSION_DURATION] = contactData.sessionDuration;

    // Try to find existing contact first
    const existingContact = await findContactByEmail(contactData.email);

    if (existingContact) {
      // Update existing contact
      console.log('Updating existing contact:', existingContact.id);
      
      // Preserve high score (only update if new score is higher)
      if (contactData.gameScore !== undefined) {
        const currentHighScore = existingContact.properties[CUSTOM_PROPERTIES.GAME_HIGH_SCORE];
        const newScore = contactData.gameScore;
        
        if (!currentHighScore || newScore > parseInt(currentHighScore)) {
          properties[CUSTOM_PROPERTIES.GAME_HIGH_SCORE] = newScore;
        }
      }

      // Update the contact
      await hubspotClient.crm.contacts.basicApi.update(existingContact.id, {
        properties
      });

      console.log('Successfully updated HubSpot contact');
    } else {
      // Create new contact
      console.log('Creating new contact');
      
      // Set high score for new contact
      if (contactData.gameScore !== undefined) {
        properties[CUSTOM_PROPERTIES.GAME_HIGH_SCORE] = contactData.gameScore;
      }
      
      // Set first play date for new contact
      properties[CUSTOM_PROPERTIES.FIRST_GAME_PLAY_DATE] = new Date().toISOString();

      await hubspotClient.crm.contacts.basicApi.create({
        properties
      });

      console.log('Successfully created HubSpot contact');
    }

    return true;
  } catch (error: any) {
    console.error('Error creating/updating HubSpot contact:', error);
    
    if (error.response) {
      console.error('HubSpot API Error:', error.response.status, error.response.data);
      throw new HubSpotError(
        `HubSpot API error: ${error.response.data?.message || 'Unknown error'}`,
        error.response.status
      );
    }
    
    throw new HubSpotError(`Failed to update contact: ${error.message}`);
  }
}

/**
 * Find a contact by email address
 */
async function findContactByEmail(email: string): Promise<any | null> {
  if (!hubspotClient) return null;

  try {
    const searchRequest = {
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'email',
              operator: 'EQ' as any,
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

    const searchResult = await hubspotClient.crm.contacts.searchApi.doSearch(searchRequest);
    
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
  if (!hubspotClient) {
    console.warn('HubSpot client not initialized. Skipping marketing consent update.');
    return false;
  }

  try {
    const existingContact = await findContactByEmail(email);
    
    if (!existingContact) {
      console.warn('Contact not found for marketing consent update:', email);
      return false;
    }

    await hubspotClient.crm.contacts.basicApi.update(existingContact.id, {
      properties: {
        [CUSTOM_PROPERTIES.ACCEPTS_MARKETING]: acceptsMarketing.toString()
      }
    });

    console.log('Successfully updated marketing consent for:', email);
    return true;
  } catch (error: any) {
    console.error('Error updating marketing consent:', error);
    throw new HubSpotError(`Failed to update marketing consent: ${error.message}`);
  }
}

/**
 * Detect device type from user agent
 */
export function getDeviceType(): string {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (/mobile|android|iphone|ipad|phone/i.test(userAgent)) {
    return 'Mobile';
  } else if (/tablet|ipad/i.test(userAgent)) {
    return 'Tablet';
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
    errors.push('VITE_HUBSPOT_ACCESS_TOKEN environment variable is required');
  }

  if (!HUBSPOT_PORTAL_ID) {
    errors.push('VITE_HUBSPOT_PORTAL_ID environment variable is required');
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
  if (!hubspotClient) {
    console.error('HubSpot client not initialized');
    return false;
  }

  try {
    // Try to get account info to test connection
    await hubspotClient.crm.contacts.basicApi.getPage(1);
    console.log('HubSpot connection test successful');
    return true;
  } catch (error: any) {
    console.error('HubSpot connection test failed:', error);
    return false;
  }
} 
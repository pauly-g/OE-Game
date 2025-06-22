import { createOrUpdateContact, updateMarketingConsent, type GameContactData } from './hubspotIntegration';

// Game session tracking
let gameStartTime: Date | null = null;

/**
 * Start tracking a game session
 */
export function startGameSession() {
  gameStartTime = new Date();
  console.log('Game session started:', gameStartTime);
}

/**
 * Handle marketing consent acceptance and send to HubSpot
 */
export async function handleMarketingConsent(
  email: string,
  firstName?: string,
  lastName?: string,
  company?: string,
  acceptsMarketing: boolean = true
): Promise<boolean> {
  try {
    console.log('Processing marketing consent for:', email);

    // Calculate session duration in fractional minutes for accurate formatting
    const sessionDuration = gameStartTime 
      ? (new Date().getTime() - gameStartTime.getTime()) / 60000 // in fractional minutes
      : undefined;

    const contactData: GameContactData = {
      email,
      firstName,
      lastName,
      company,
      acceptsMarketing,
      sessionDuration
    };

    const success = await createOrUpdateContact(contactData);
    
    if (success) {
      console.log('Successfully processed marketing consent and game data');
    }

    return success;
  } catch (error) {
    console.error('Error processing marketing consent:', error);
    return false;
  }
}

/**
 * Handle game completion and send final stats to HubSpot
 */
export async function handleGameCompletion(
  email: string,
  finalScore: number,
  acceptsMarketing: boolean = false
): Promise<boolean> {
  try {
    console.log('Processing game completion for:', email);

    // Calculate session duration in fractional minutes for accurate formatting
    const sessionDuration = gameStartTime 
      ? (new Date().getTime() - gameStartTime.getTime()) / 60000 // in fractional minutes
      : undefined;

    const contactData: GameContactData = {
      email,
      acceptsMarketing,
      gameScore: finalScore,
      sessionDuration
    };

    const success = await createOrUpdateContact(contactData);
    
    if (success) {
      console.log('Successfully processed game completion data');
      // Reset session data
      gameStartTime = null;
    }

    return success;
  } catch (error) {
    console.error('Error processing game completion:', error);
    return false;
  }
}

/**
 * Handle high score achievement
 */
export async function handleHighScore(
  email: string,
  newHighScore: number,
  acceptsMarketing: boolean = false
): Promise<boolean> {
  try {
    console.log('Processing high score for:', email, 'Score:', newHighScore, 'Marketing consent:', acceptsMarketing);

    const sessionDuration = gameStartTime 
      ? (new Date().getTime() - gameStartTime.getTime()) / 60000
      : undefined;

    const contactData: GameContactData = {
      email,
      acceptsMarketing,
      gameScore: newHighScore,
      sessionDuration
    };

    return await createOrUpdateContact(contactData);
  } catch (error) {
    console.error('Error processing high score:', error);
    return false;
  }
}

/**
 * Update marketing consent only (for existing contacts)
 */
export async function updateContactMarketingConsent(
  email: string,
  acceptsMarketing: boolean
): Promise<boolean> {
  try {
    return await updateMarketingConsent(email, acceptsMarketing);
  } catch (error) {
    console.error('Error updating marketing consent:', error);
    return false;
  }
}

/**
 * Get current session duration in minutes
 */
export function getCurrentSessionDuration(): number | null {
  if (!gameStartTime) return null;
  return (new Date().getTime() - gameStartTime.getTime()) / 60000;
}

/**
 * Reset session data (useful for new games)
 */
export function resetSession() {
  gameStartTime = null;
  console.log('Game session reset');
}

/**
 * Check if a session is currently active
 */
export function isSessionActive(): boolean {
  return gameStartTime !== null;
} 
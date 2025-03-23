import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  getDocs,
  where,
  doc,
  getDoc,
  startAfter,
  endBefore,
  limitToLast,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './config';

// Set this to true to force real Firebase data even in development mode
const FORCE_REAL_DATA = true;

// Interface for leaderboard entry
export interface LeaderboardEntry {
  id?: string;
  userId: string;
  score: number;
  timestamp: Date;
  displayName?: string | null;
  company?: string | null;
  photoURL?: string | null;
}

/**
 * Submit a score to the leaderboard
 * 
 * @param userId - The user's ID
 * @param score - The score to submit
 * @param displayName - The user's display name
 * @param photoURL - The user's photo URL
 * @param company - The user's company name
 * @returns The ID of the newly created leaderboard entry, or null if submission failed or wasn't a high score
 */
export const submitScore = async (
  userId: string,
  score: number,
  displayName: string | null,
  photoURL: string | null,
  company: string | null
): Promise<string | null> => {
  try {
    // Log start of operation
    console.log('[FIREBASE] Attempting to submit score for user:', userId);
    
    // Validate score
    if (isNaN(score) || !isFinite(score) || score < 0) {
      console.error('[FIREBASE] Invalid score value:', score);
      return null;
    }
    
    // First check if this is a high score for the user
    const userPreviousBest = await getUserBestScore(userId);
    
    // If a previous best exists and the new score isn't higher, don't submit
    if (userPreviousBest && userPreviousBest.score >= score) {
      console.log('[FIREBASE] Score not submitted - not a new high score', { 
        newScore: score, 
        previousBest: userPreviousBest.score 
      });
      return null;
    }
    
    console.log('[FIREBASE] Score will be submitted - either first score or new high score');
    
    // Create a new leaderboard entry
    const leaderboardRef = collection(db, 'leaderboard');
    const entryData = {
      userId,
      score,
      displayName,
      photoURL,
      company,
      timestamp: serverTimestamp()
    };
    
    console.log('[FIREBASE] Submitting leaderboard entry:', entryData);
    
    const docRef = await addDoc(leaderboardRef, entryData);
    console.log('[FIREBASE] Score submitted successfully with ID:', docRef.id);
    
    return docRef.id;
  } catch (error) {
    console.error('[FIREBASE] Error submitting score:', error);
    return null;
  }
};

// Mock leaderboard data for offline/development use
export const generateMockLeaderboardData = (userScore?: number): LeaderboardEntry[] => {
  // Company names for random assignment
  const companies = [
    'Cursor Inc',
    'Google',
    'Microsoft',
    'Apple',
    'Amazon',
    'Meta',
    'Netflix',
    'Tesla',
    'IBM',
    'Intel',
    'Oracle',
    'Salesforce',
    'Adobe',
    'Cisco',
    'Dell',
    'HP',
    'Shopify',
    'Twitter',
    'Spotify',
    'Slack'
  ];
  
  // Player names for random assignment
  const playerNames = [
    'Alex Johnson',
    'Taylor Smith',
    'Jordan Lee',
    'Casey Brown',
    'Morgan Davis',
    'Riley Wilson',
    'Quinn Miller',
    'Cameron Moore',
    'Avery Williams',
    'Sam Thompson',
    'Jordan Clark',
    'Jamie Rodriguez',
    'Drew Martinez',
    'Pat Garcia',
    'Chris Harris',
    'Kyle Lewis',
    'Terry Walker',
    'Robin Hall',
    'Blake Young',
    'Dylan King'
  ];
  
  // Generate high scores that are better than the user's score
  const mockScores: LeaderboardEntry[] = [];
  
  // Default starting score if userScore not provided
  const startingScore = userScore ? userScore + Math.floor(Math.random() * 100) + 50 : 10000;
  
  // Generate 20 random entries with guaranteed company names
  for (let i = 0; i < 20; i++) {
    // Calculate a score that decreases as we go
    // The first few entries will have higher scores
    const scoreAdjustment = Math.floor(Math.random() * 30) - 5; // Random variation
    const score = Math.max(0, startingScore - (i * 40) + scoreAdjustment);
    
    // Randomize the player name and company, ensuring company is always set
    const nameIndex = Math.floor(Math.random() * playerNames.length);
    const companyIndex = Math.floor(Math.random() * companies.length);
    
    mockScores.push({
      id: `mock-entry-${i}`,
      userId: `mock-user-${i}`,
      score,
      timestamp: new Date(Date.now() - i * 3600000), // Spread out over the last few hours
      displayName: playerNames[nameIndex],
      company: companies[companyIndex], // This will never be null or undefined
      photoURL: null
    });
  }
  
  // Add current user's mock data if available in window
  if (typeof window !== 'undefined' && (window as any).mockUserData) {
    const { displayName, company, userId } = (window as any).mockUserData;
    
    // Only add if we have valid data
    if (displayName && company) {
      const userScore = Math.floor(Math.random() * 5000) + 3000; // Random good score
      
      mockScores.push({
        id: 'current-user-entry',
        userId: userId || 'mock-current-user',
        score: userScore,
        timestamp: new Date(),
        displayName,
        company,
        photoURL: null
      });
    }
  }
  
  // Sort by score, highest first
  return mockScores.sort((a, b) => b.score - a.score);
};

// Function to get top scores
export const getTopScores = async (topCount: number = 10): Promise<LeaderboardEntry[]> => {
  try {
    // For development/testing purposes, return mock data
    if (!FORCE_REAL_DATA && (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost')) {
      console.log('[Leaderboard] Using mock leaderboard data');
      const mockData = generateMockLeaderboardData();
      return mockData.slice(0, topCount);
    }
    
    console.log('[Leaderboard] Fetching real leaderboard data from Firebase');
    const q = query(
      collection(db, 'leaderboard'),
      orderBy('score', 'desc'),
      limit(topCount)
    );
    
    const querySnapshot = await getDocs(q);
    console.log(`[Leaderboard] Found ${querySnapshot.docs.length} entries in Firebase`);
    
    if (querySnapshot.empty) {
      console.log('[Leaderboard] No scores found in Firestore, returning empty array');
      return [];
    }
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      
      // Log the raw data to debug
      console.log(`[Leaderboard] Entry data:`, {
        id: doc.id,
        userId: data.userId,
        score: data.score,
        displayName: data.displayName,
        company: data.company,
        photoURL: data.photoURL,
        timestamp: data.timestamp ? 'timestamp exists' : 'no timestamp'
      });
      
      // Handle timestamp conversion safely
      let timestamp = new Date();
      if (data.timestamp) {
        if (typeof data.timestamp.toDate === 'function') {
          timestamp = data.timestamp.toDate();
        } else if (data.timestamp instanceof Date) {
          timestamp = data.timestamp;
        } else if (data.timestamp.seconds) {
          // Firestore timestamp object with seconds and nanoseconds
          timestamp = new Date(data.timestamp.seconds * 1000);
        }
      } else if (data.createdAt) {
        // Fall back to createdAt if timestamp is missing
        timestamp = new Date(data.createdAt);
      }
      
      return {
        id: doc.id,
        userId: data.userId,
        score: data.score || 0,
        displayName: data.displayName || 'Anonymous',
        company: data.company || 'Unknown Company',
        photoURL: data.photoURL || null,
        timestamp: timestamp
      };
    });
  } catch (error) {
    console.error('Error getting top scores:', error);
    return [];
  }
};

// Function to get user's best score
export const getUserBestScore = async (userId: string): Promise<LeaderboardEntry | null> => {
  try {
    if (!userId) {
      console.error('[Leaderboard] Cannot get best score: userId is empty or undefined');
      return null;
    }
    
    console.log(`[Leaderboard] Getting best score for user: ${userId}`);
    
    const q = query(
      collection(db, 'leaderboard'),
      where('userId', '==', userId),
      orderBy('score', 'desc'),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    console.log(`[Leaderboard] User best score query returned ${querySnapshot.docs.length} results`);
    
    if (querySnapshot.empty) {
      console.log(`[Leaderboard] No scores found for user ${userId}`);
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    const data = doc.data();
    
    console.log(`[Leaderboard] User best score data:`, {
      id: doc.id,
      userId: data.userId,
      score: data.score,
      displayName: data.displayName,
      company: data.company,
      timestamp: data.timestamp ? 'timestamp exists' : 'no timestamp'
    });
    
    // Ensure score is a number
    const score = typeof data.score === 'number' ? data.score : Number(data.score);
    if (isNaN(score)) {
      console.error(`[Leaderboard] Invalid score in document ${doc.id}: ${data.score}`);
      return null;
    }
    
    // Handle timestamp conversion safely (same as in getTopScores)
    let timestamp = new Date();
    if (data.timestamp) {
      if (typeof data.timestamp.toDate === 'function') {
        timestamp = data.timestamp.toDate();
      } else if (data.timestamp instanceof Date) {
        timestamp = data.timestamp;
      } else if (data.timestamp.seconds) {
        // Firestore timestamp object with seconds and nanoseconds
        timestamp = new Date(data.timestamp.seconds * 1000);
      }
    } else if (data.createdAt) {
      // Fall back to createdAt if timestamp is missing
      timestamp = new Date(data.createdAt);
    }
    
    console.log(`[Leaderboard] User best score: ${score}, timestamp: ${timestamp}`);
    
    return {
      id: doc.id,
      userId: data.userId,
      score: score,
      displayName: data.displayName || 'Anonymous',
      company: data.company || 'Unknown Company',
      photoURL: data.photoURL || null,
      timestamp: timestamp
    };
  } catch (error) {
    console.error('Error getting user best score:', error);
    return null;
  }
};

// Function to get user's score rank
export const getUserScoreRank = async (score: number): Promise<number> => {
  try {
    // For development/testing purposes, return mock rank
    if (!FORCE_REAL_DATA && (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost')) {
      console.log('[Leaderboard] Using mock rank calculation for score:', score);
      
      // Create a consistent mock leaderboard with a fixed set of scores
      const fixedMockScores = [
        9750, // Top player's score (much higher than most players will achieve)
        8500, // Second highest score
        7200, // Third highest score
        5800, // Fourth highest score
        4600, // Fifth highest score
      ];
      
      // Count how many fixed scores are higher than the user's score
      let rank = 1; // Start at rank 1
      for (const mockScore of fixedMockScores) {
        if (mockScore > score) {
          rank++;
        }
      }
      
      console.log(`[Leaderboard] Determined rank ${rank} for score ${score}`);
      return rank;
    }
    
    console.log('[Leaderboard] Calculating real rank from Firebase for score:', score);
    // Query to count how many scores are higher than the user's score
    const q = query(
      collection(db, 'leaderboard'),
      where('score', '>', score)
    );
    
    const querySnapshot = await getDocs(q);
    // Rank is the count of higher scores + 1
    const rank = querySnapshot.size + 1;
    console.log(`[Leaderboard] Determined real rank ${rank} for score ${score}`);
    return rank;
  } catch (error) {
    console.error('Error getting user score rank:', error);
    return 0;
  }
};

// Function to get scores around user's score
export const getScoresAroundUser = async (score: number, count: number = 3): Promise<{
  above: LeaderboardEntry[],
  below: LeaderboardEntry[]
}> => {
  try {
    // For development/testing purposes, return mock data
    if (!FORCE_REAL_DATA && (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost')) {
      console.log('[Leaderboard] Using mock nearby scores');
      const mockScores = generateMockLeaderboardData(score);
      
      // Find the position where the user's score would be
      const userScoreIndex = mockScores.findIndex(entry => entry.score <= score);
      
      // Get scores above the user's score
      const above = mockScores
        .slice(Math.max(0, userScoreIndex - count), userScoreIndex)
        .reverse();
      
      // Get scores below the user's score
      const below = mockScores
        .slice(userScoreIndex, userScoreIndex + count);
      
      return { above, below };
    }
    
    console.log('[Leaderboard] Fetching real nearby scores from Firebase');
    // Get scores above user's score
    const aboveQuery = query(
      collection(db, 'leaderboard'),
      where('score', '>', score),
      orderBy('score', 'asc'),
      limit(count)
    );
    
    // Get scores below user's score
    const belowQuery = query(
      collection(db, 'leaderboard'),
      where('score', '<', score),
      orderBy('score', 'desc'),
      limit(count)
    );
    
    const [aboveSnapshot, belowSnapshot] = await Promise.all([
      getDocs(aboveQuery),
      getDocs(belowQuery)
    ]);
    
    console.log(`[Leaderboard] Found ${aboveSnapshot.docs.length} scores above and ${belowSnapshot.docs.length} scores below`);
    
    const above = aboveSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...(data as Omit<LeaderboardEntry, 'id'>),
        timestamp: data.timestamp ? 
          (data.timestamp.toDate ? data.timestamp.toDate() : data.timestamp) : 
          new Date()
      };
    }).reverse(); // Reverse to show highest scores first
    
    const below = belowSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...(data as Omit<LeaderboardEntry, 'id'>),
        timestamp: data.timestamp ? 
          (data.timestamp.toDate ? data.timestamp.toDate() : data.timestamp) : 
          new Date()
      };
    });
    
    return { above, below };
  } catch (error) {
    console.error('Error getting scores around user:', error);
    return { above: [], below: [] };
  }
}; 
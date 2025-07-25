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
  Timestamp,
  runTransaction,
  DocumentReference,
  setDoc
} from 'firebase/firestore';
import { db } from './config';
import { validateScoreSubmission, logSecurityEvent, detectInjectionAttempt } from '../utils/validation';

// Set this to true to force real Firebase data even in development mode
const FORCE_REAL_DATA = true;

// Simple cache for leaderboard data to reduce Firebase calls
let leaderboardCache: {
  topScores?: { data: LeaderboardEntry[], timestamp: number },
  userRanks?: Map<string, { rank: number, timestamp: number }>
} = {
  userRanks: new Map()
};

const CACHE_DURATION = 30000; // 30 seconds cache

// Function to clear cache when new scores are submitted
const clearCache = () => {
  console.log('[Leaderboard] Clearing cache after score submission');
  leaderboardCache.topScores = undefined;
  leaderboardCache.userRanks?.clear();
};

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
 * Submit a score to the leaderboard using a Transaction for atomicity.
 * Ensures score is only added if it's strictly higher than the user's current best.
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
  console.log('[FIREBASE Transaction] ===========================================');
  console.log('[FIREBASE Transaction] Starting score submission process');
  console.log('[FIREBASE Transaction] Input parameters:', {
    userId,
    score,
    displayName,
    photoURL: photoURL ? 'Has photo URL' : 'No photo URL',
    company
  });

  // SECURITY: Comprehensive input validation
  const validationResult = validateScoreSubmission({
    userId,
    score,
    displayName,
    company
  });

  if (!validationResult.isValid) {
    console.error('[SECURITY] Score submission validation failed:', validationResult.error);
    logSecurityEvent('VALIDATION_FAILED', {
      userId,
      error: validationResult.error,
      input: `score:${score}, company:${company}, displayName:${displayName}`
    });
    return null;
  }

  // Use sanitized values from validation
  const sanitizedData = validationResult.sanitizedData!;
  const finalUserId = sanitizedData.userId;
  const finalScore = sanitizedData.score;
  const finalDisplayName = sanitizedData.displayName || 'Anonymous Player';
  const finalCompany = sanitizedData.company || 'Unknown Company';

  // SECURITY: Check for injection attempts in text fields
  const textInputs = [displayName, company].filter(Boolean) as string[];
  for (const input of textInputs) {
    if (detectInjectionAttempt(input)) {
      console.error('[SECURITY] Potential injection attempt detected');
      logSecurityEvent('INJECTION_ATTEMPT', {
        userId: finalUserId,
        input
      });
      return null;
    }
  }

  console.log('[FIREBASE Transaction] Validated and sanitized values:', {
    userId: finalUserId,
    score: finalScore,
    displayName: finalDisplayName,
    company: finalCompany
  });

  try {
    const leaderboardCol = collection(db, 'leaderboard');
    console.log('[FIREBASE Transaction] Leaderboard collection reference created');

    // 1. Query OUTSIDE transaction to find the reference of the current best score document
    const userBestScoreQuery = query(
      leaderboardCol,
      where('userId', '==', finalUserId),
      orderBy('score', 'desc'),
      limit(1)
    );
    
    console.log('[FIREBASE Transaction] Querying for user\'s current best score...');
    const querySnapshot = await getDocs(userBestScoreQuery);
    let bestScoreDocRef: DocumentReference | null = null;
    
    if (!querySnapshot.empty) {
      const bestDoc = querySnapshot.docs[0];
      bestScoreDocRef = doc(db, 'leaderboard', bestDoc.id); // Get the DocumentReference
      console.log(`[FIREBASE Pre-Transaction] Found user's current best score doc ref (ID: ${bestScoreDocRef.id})`);
      console.log(`[FIREBASE Pre-Transaction] Current best score: ${bestDoc.data().score}`);
    } else {
      console.log(`[FIREBASE Pre-Transaction] No previous score found for user ${finalUserId}.`);
    }

    // 2. Run the score submission within a transaction
    console.log('[FIREBASE Transaction] Starting Firestore transaction...');
    const newDocId = await runTransaction(db, async (transaction) => {
      console.log('[FIREBASE Transaction] Transaction started.');
      
      let scoreToCheck = -1; // Default score to check against if no previous entry exists

      // 3. Read the current best score *again* inside the transaction for consistency
      if (bestScoreDocRef) {
        const currentBestDocSnap = await transaction.get(bestScoreDocRef);
        if (currentBestDocSnap.exists()) {
          // Ensure score field exists and is a number
          const currentScoreData = currentBestDocSnap.data();
          if (typeof currentScoreData.score === 'number') {
             scoreToCheck = currentScoreData.score;
             console.log(`[FIREBASE Transaction] Read current best score inside transaction: ${scoreToCheck}`);
          } else {
             console.warn(`[FIREBASE Transaction] Best score document ${bestScoreDocRef.id} exists but score field is not a number. Treating as -1.`);
             scoreToCheck = -1;
          }
        } else {
           // Document might have been deleted between the query and the transaction start
           console.log(`[FIREBASE Transaction] Best score document ${bestScoreDocRef.id} no longer exists.`);
           scoreToCheck = -1;
        }
      } else {
        console.log('[FIREBASE Transaction] No previous best score document reference.');
        scoreToCheck = -1; 
      }

      // 4. Compare the new score with the current best read inside the transaction
      // Use strict inequality (>)
      console.log(`[FIREBASE Transaction] Comparing new score ${finalScore} with scoreToCheck ${scoreToCheck}`);
      
      // If this is a first-time submission (scoreToCheck === -1) OR the new score is higher, accept it
      if (scoreToCheck === -1 || finalScore > scoreToCheck) {
        // For first-time submissions, provide a clear log message
        if (scoreToCheck === -1) {
          console.log(`[FIREBASE Transaction] ✅ First score submission for user. Accepting score: ${finalScore}`);
        } else {
          console.log(`[FIREBASE Transaction] ✅ New score ${finalScore} IS strictly higher than ${scoreToCheck}. Proceeding with write.`);
        }
        
        // 5. If higher, create the new score document *within the transaction*
        const newScoreRef = doc(leaderboardCol); // Generate a new doc ref for the new entry
        const scoreData = {
          userId: finalUserId,
          score: finalScore, // Use the validated and sanitized score
          displayName: finalDisplayName, // Use sanitized value
          photoURL,
          company: finalCompany, // Use sanitized value
          timestamp: serverTimestamp() // Use server timestamp
        };
        
        console.log('[FIREBASE Transaction] Score data to be written:', scoreData);
        transaction.set(newScoreRef, scoreData);
        console.log('[FIREBASE Transaction] New score document queued for write with ID:', newScoreRef.id);
        return newScoreRef.id; // Return the new document ID from the transaction
      } else {
        // 6. If not strictly higher, abort the transaction
        console.log(`[FIREBASE Transaction] ❌ New score ${finalScore} is NOT strictly higher than ${scoreToCheck}. Aborting submission.`);
        // Returning null signals failure/abort due to not being a high score
        return null; 
      }
    });

    // Transaction completed
    if (newDocId) {
      console.log('[FIREBASE Transaction] ✅ SUBMISSION SUCCESSFUL! New document ID:', newDocId);
      console.log('[FIREBASE Transaction] Score should now appear in leaderboard collection');
      
      // Clear cache after successful submission
      clearCache();
      
      return newDocId;
    } else {
      // This means the transaction callback returned null (score not high enough)
      console.log('[FIREBASE Transaction] ❌ Submission aborted (score not strictly higher).');
      return null;
    }

  } catch (error) {
    // This catches errors during the transaction execution itself
    console.error('[FIREBASE Transaction] ❌ ERROR running score submission transaction:', error);
    console.error('[FIREBASE Transaction] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    
    // Log security event for monitoring
    logSecurityEvent('VALIDATION_FAILED', {
      userId: finalUserId,
      error: error instanceof Error ? error.message : 'Transaction failed'
    });
    
    return null;
  } finally {
    console.log('[FIREBASE Transaction] ===========================================');
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
    
    // Check cache first
    const now = Date.now();
    if (leaderboardCache.topScores && (now - leaderboardCache.topScores.timestamp) < CACHE_DURATION) {
      console.log('[Leaderboard] Using cached leaderboard data');
      return leaderboardCache.topScores.data.slice(0, topCount);
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
    
    const results = querySnapshot.docs.map(doc => {
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
    
    // Cache the results
    leaderboardCache.topScores = {
      data: results,
      timestamp: Date.now()
    };
    
    return results;
  } catch (error) {
    console.error('Error getting top scores:', error);
    return [];
  }
};

// Function to get user's best score
export const getUserBestScore = async (userId: string): Promise<LeaderboardEntry | null> => {
  try {
    if (!userId) {
      console.error('[Leaderboard] getUserBestScore: userId is empty or undefined');
      return null;
    }
    
    console.log(`[Leaderboard] getUserBestScore: Getting best score for user: ${userId}`);
    
    // Make sure the leaderboard collection exists
    const leaderboardCol = collection(db, 'leaderboard');
    
    // If collection doesn't exist or is empty, it will simply return empty results
    // which is handled correctly in the code below
    
    const q = query(
      leaderboardCol,
      where('userId', '==', userId),
      orderBy('score', 'desc'),
      limit(1)
    );
    
    // Try to execute the query, catching any specific index-related errors
    let querySnapshot;
    try {
      querySnapshot = await getDocs(q);
    } catch (error) {
      console.error('[Leaderboard] getUserBestScore: Error executing query:', error);
      // Log specific error information to help diagnose index issues
      if (error instanceof Error) {
        console.error('[Leaderboard] Error message:', error.message);
        if (error.message.includes('index')) {
          console.error('[Leaderboard] This appears to be an index error. Please check Firebase console to create the required index.');
        }
      }
      return null;
    }
    
    if (querySnapshot.empty) {
      console.log(`[Leaderboard] getUserBestScore: No previous scores found for user ${userId}.`);
      return null;
    } else {
      // Should only be one document due to limit(1)
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      console.log(`[Leaderboard] getUserBestScore: Found previous best score for user ${userId}:`, data);
      
      // Handle timestamp conversion safely (copying logic from getTopScores)
      let timestamp = new Date();
      if (data.timestamp) {
        if (typeof data.timestamp.toDate === 'function') {
          timestamp = data.timestamp.toDate();
        } else if (data.timestamp instanceof Date) {
          timestamp = data.timestamp;
        } else if (data.timestamp.seconds) {
          timestamp = new Date(data.timestamp.seconds * 1000);
        }
      } else if (data.createdAt) {
        timestamp = new Date(data.createdAt);
      }
      
      const bestScoreEntry: LeaderboardEntry = {
        id: doc.id,
        userId: data.userId,
        score: data.score || 0,
        displayName: data.displayName || 'Anonymous',
        company: data.company || 'Unknown Company',
        photoURL: data.photoURL || null,
        timestamp: timestamp
      };
      
      console.log(`[Leaderboard] getUserBestScore: Returning best score entry for user ${userId}:`, bestScoreEntry);
      return bestScoreEntry;
    }
  } catch (error) {
    console.error(`[Leaderboard] getUserBestScore: Error getting best score for user ${userId}:`, error);
    return null; // Return null on error
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
    const leaderboardCol = collection(db, 'leaderboard');
    
    const q = query(
      leaderboardCol,
      where('score', '>', score)
    );
    
    // Try to execute the query, catching any specific index-related errors
    let querySnapshot;
    try {
      querySnapshot = await getDocs(q);
    } catch (error) {
      console.error('[Leaderboard] getUserScoreRank: Error executing query:', error);
      // Log specific error information to help diagnose index issues
      if (error instanceof Error) {
        console.error('[Leaderboard] Error message:', error.message);
        if (error.message.includes('index')) {
          console.error('[Leaderboard] This appears to be an index error. Please check Firebase console to create the required index.');
        }
      }
      return 1; // Default to rank 1 if we can't determine
    }
    
    // Rank is the count of higher scores + 1
    const rank = querySnapshot.size + 1;
    console.log(`[Leaderboard] Determined real rank ${rank} for score ${score}`);
    return rank;
  } catch (error) {
    console.error('Error getting user score rank:', error);
    return 1; // Default to rank 1 in case of error
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
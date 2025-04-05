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
  console.log('[FIREBASE Transaction] Attempting to submit score for user:', userId, 'Score:', score);

  // Validate score before starting transaction
  if (isNaN(score) || !isFinite(score) || score < 0) {
    console.error('[FIREBASE Transaction] Invalid score value:', score);
    return null;
  }

  try {
    // Make sure the leaderboard collection exists by writing a dummy doc if needed
    const leaderboardCol = collection(db, 'leaderboard');
    
    // Check if the collection exists by trying to get any document
    const checkQuery = query(leaderboardCol, limit(1));
    const checkSnapshot = await getDocs(checkQuery);
    
    // If collection is empty or doesn't exist, create a placeholder document to ensure it exists
    // This will be deleted or replaced by the real score if needed
    if (checkSnapshot.empty) {
      console.log('[FIREBASE Transaction] Leaderboard collection appears empty, creating placeholder document');
      try {
        const placeholderRef = doc(leaderboardCol);
        await setDoc(placeholderRef, {
          userId: 'placeholder',
          score: -1,
          displayName: 'System',
          timestamp: serverTimestamp(),
          placeholderDoc: true
        });
        console.log('[FIREBASE Transaction] Created placeholder document to ensure collection exists');
      } catch (err) {
        console.error('[FIREBASE Transaction] Error creating placeholder document:', err);
        // Continue with transaction attempt even if this fails
      }
    }

    // 1. Query OUTSIDE transaction to find the reference of the current best score document
    const userBestScoreQuery = query(
      leaderboardCol,
      where('userId', '==', userId),
      orderBy('score', 'desc'),
      limit(1)
    );
    
    const querySnapshot = await getDocs(userBestScoreQuery);
    let bestScoreDocRef: DocumentReference | null = null;
    
    if (!querySnapshot.empty) {
      const bestDoc = querySnapshot.docs[0];
      bestScoreDocRef = doc(db, 'leaderboard', bestDoc.id); // Get the DocumentReference
      console.log(`[FIREBASE Pre-Transaction] Found user's current best score doc ref (ID: ${bestScoreDocRef.id})`);
    } else {
      console.log(`[FIREBASE Pre-Transaction] No previous score found for user ${userId}.`);
    }

    // 2. Run the score submission within a transaction
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
      console.log(`[FIREBASE Transaction] Comparing new score ${score} with scoreToCheck ${scoreToCheck}`);
      if (score > scoreToCheck) {
        console.log(`[FIREBASE Transaction] New score ${score} IS strictly higher. Proceeding with write.`);
        
        // 5. If higher, create the new score document *within the transaction*
        const newScoreRef = doc(leaderboardCol); // Generate a new doc ref for the new entry
        transaction.set(newScoreRef, {
          userId,
          score, // Use the validated score
          displayName,
          photoURL,
          company,
          timestamp: serverTimestamp() // Use server timestamp
        });
        console.log('[FIREBASE Transaction] New score document queued for write with ID:', newScoreRef.id);
        return newScoreRef.id; // Return the new document ID from the transaction
      } else {
        // 6. If not strictly higher, abort the transaction
        console.log(`[FIREBASE Transaction] New score ${score} is NOT strictly higher than ${scoreToCheck}. Aborting submission.`);
        // Returning null signals failure/abort due to not being a high score
        return null; 
      }
    });

    // Transaction completed
    if (newDocId) {
      console.log('[FIREBASE Transaction] Submission successful. New document ID:', newDocId);
      return newDocId;
    } else {
      // This means the transaction callback returned null (score not high enough)
      console.log('[FIREBASE Transaction] Submission aborted (score not strictly higher).');
      return null;
    }

  } catch (error) {
    // This catches errors during the transaction execution itself
    console.error('[FIREBASE Transaction] Error running score submission transaction:', error);
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
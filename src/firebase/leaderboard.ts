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
  limitToLast
} from 'firebase/firestore';
import { db } from './config';

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

// Function to submit score to leaderboard
export const submitScore = async (
  userId: string, 
  score: number, 
  displayName?: string | null, 
  photoURL?: string | null,
  company?: string | null
): Promise<string | null> => {
  try {
    const entry: LeaderboardEntry = {
      userId,
      score,
      timestamp: new Date(),
      displayName: displayName || null,
      company: company || null,
      photoURL: photoURL || null
    };
    
    const docRef = await addDoc(collection(db, 'leaderboard'), entry);
    return docRef.id;
  } catch (error) {
    console.error('Error submitting score:', error);
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
  const startingScore = userScore ? userScore + Math.floor(Math.random() * 100) + 50 : 1000;
  
  // Generate 20 random entries
  for (let i = 0; i < 20; i++) {
    // Calculate a score that decreases as we go
    // The first few entries will have higher scores
    const scoreAdjustment = Math.floor(Math.random() * 30) - 5; // Random variation
    const score = startingScore - (i * 40) + scoreAdjustment;
    
    // Randomize the player name and company
    const nameIndex = Math.floor(Math.random() * playerNames.length);
    const companyIndex = Math.floor(Math.random() * companies.length);
    
    mockScores.push({
      id: `mock-entry-${i}`,
      userId: `mock-user-${i}`,
      score,
      timestamp: new Date(Date.now() - i * 3600000), // Spread out over the last few hours
      displayName: playerNames[nameIndex],
      company: companies[companyIndex],
      photoURL: null
    });
  }
  
  // Sort by score, highest first
  return mockScores.sort((a, b) => b.score - a.score);
};

// Function to get top scores
export const getTopScores = async (topCount: number = 10): Promise<LeaderboardEntry[]> => {
  try {
    // For development/testing purposes, return mock data
    if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
      console.log('[Leaderboard] Using mock leaderboard data');
      return generateMockLeaderboardData().slice(0, topCount);
    }
    
    const q = query(
      collection(db, 'leaderboard'),
      orderBy('score', 'desc'),
      limit(topCount)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Omit<LeaderboardEntry, 'id'>),
      timestamp: doc.data().timestamp.toDate() // Convert Firestore timestamp to JS Date
    }));
  } catch (error) {
    console.error('Error getting top scores:', error);
    return [];
  }
};

// Function to get user's best score
export const getUserBestScore = async (userId: string): Promise<LeaderboardEntry | null> => {
  try {
    const q = query(
      collection(db, 'leaderboard'),
      where('userId', '==', userId),
      orderBy('score', 'desc'),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    return {
      id: doc.id,
      ...(doc.data() as Omit<LeaderboardEntry, 'id'>),
      timestamp: doc.data().timestamp.toDate()
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
    if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
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
    
    // Query to count how many scores are higher than the user's score
    const q = query(
      collection(db, 'leaderboard'),
      where('score', '>', score)
    );
    
    const querySnapshot = await getDocs(q);
    // Rank is the count of higher scores + 1
    return querySnapshot.size + 1;
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
    if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
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
    
    const above = aboveSnapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Omit<LeaderboardEntry, 'id'>),
      timestamp: doc.data().timestamp.toDate()
    })).reverse(); // Reverse to show highest scores first
    
    const below = belowSnapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Omit<LeaderboardEntry, 'id'>),
      timestamp: doc.data().timestamp.toDate()
    }));
    
    return { above, below };
  } catch (error) {
    console.error('Error getting scores around user:', error);
    return { above: [], below: [] };
  }
}; 
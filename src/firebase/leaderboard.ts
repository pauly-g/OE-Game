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
  photoURL?: string | null;
}

// Function to submit score to leaderboard
export const submitScore = async (userId: string, score: number, displayName?: string | null, photoURL?: string | null): Promise<string | null> => {
  try {
    const entry: LeaderboardEntry = {
      userId,
      score,
      timestamp: new Date(),
      displayName: displayName || null,
      photoURL: photoURL || null
    };
    
    const docRef = await addDoc(collection(db, 'leaderboard'), entry);
    return docRef.id;
  } catch (error) {
    console.error('Error submitting score:', error);
    return null;
  }
};

// Function to get top scores
export const getTopScores = async (topCount: number = 10): Promise<LeaderboardEntry[]> => {
  try {
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
import React, { useState, useEffect } from 'react';
import { getTopScores, getUserScoreRank, getScoresAroundUser, LeaderboardEntry } from '../firebase/leaderboard';
import { useAuth } from '../firebase/AuthContext';
import SignInButton from './SignInButton';

interface LeaderboardProps {
  isOpen: boolean;
  onClose: () => void;
  userScore?: number;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ isOpen, onClose, userScore }) => {
  const [topScores, setTopScores] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [nearbyScores, setNearbyScores] = useState<{
    above: LeaderboardEntry[];
    below: LeaderboardEntry[];
  }>({ above: [], below: [] });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showSignIn, setShowSignIn] = useState<boolean>(false);
  
  const { currentUser, submitUserScore } = useAuth();
  
  // Fetch leaderboard data when component mounts or when isOpen changes
  useEffect(() => {
    if (isOpen) {
      fetchLeaderboardData();
      
      // Check if user is not authenticated and needs to sign in
      if (!currentUser && userScore !== undefined) {
        setShowSignIn(true);
      } else {
        setShowSignIn(false);
      }
    }
  }, [isOpen, userScore, currentUser]);
  
  const fetchLeaderboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get top 10 scores
      const scores = await getTopScores(10);
      setTopScores(scores);
      
      // If user has a score and is logged in, get their rank and nearby scores
      if (userScore !== undefined && currentUser) {
        const rank = await getUserScoreRank(userScore);
        setUserRank(rank);
        
        // If user is not in top 10, get scores around them
        const isInTopTen = scores.some(score => 
          score.userId === currentUser.uid && score.score === userScore
        );
        
        if (!isInTopTen && rank > 10) {
          const nearby = await getScoresAroundUser(userScore, 3);
          setNearbyScores(nearby);
        }
      }
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
      setError('Failed to load leaderboard data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignInSuccess = async () => {
    setShowSignIn(false);
    
    // If user just signed in and we have a current score, submit it
    if (currentUser && userScore !== undefined) {
      try {
        await submitUserScore(userScore);
        fetchLeaderboardData(); // Refresh the leaderboard data
      } catch (error) {
        console.error('[Leaderboard] Error submitting score after sign in:', error);
      }
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-blue-600 p-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Global Leaderboard</h2>
        <button 
          onClick={onClose}
          className="text-white hover:text-gray-200 text-xl"
        >
          ✕
        </button>
      </div>
      
      {/* Content */}
      <div className="flex-grow overflow-y-auto p-6 max-w-4xl mx-auto w-full">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="text-red-400 text-center py-8 text-xl">{error}</div>
        ) : showSignIn ? (
          <div className="flex flex-col items-center justify-center py-12">
            <h3 className="text-xl font-bold mb-6 text-white text-center">
              Sign in to view your position on the leaderboard
            </h3>
            <SignInButton 
              onSuccess={handleSignInSuccess}
              onError={(error) => setError(error)}
              className="py-3 px-6 text-lg"
            />
          </div>
        ) : (
          <>
            {/* Top Scores */}
            <h3 className="text-xl font-bold text-white mb-4">Top 10 Players</h3>
            <div className="mb-8 bg-gray-800 rounded-lg overflow-hidden shadow-lg">
              {topScores.length > 0 ? (
                <table className="w-full text-base">
                  <thead>
                    <tr className="text-gray-300 border-b border-gray-700 bg-gray-700">
                      <th className="text-left py-3 px-4">Rank</th>
                      <th className="text-left py-3 px-4">Player</th>
                      <th className="text-right py-3 px-4">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topScores.map((score, index) => (
                      <tr 
                        key={score.id}
                        className={`border-b border-gray-700 ${
                          currentUser && score.userId === currentUser.uid
                            ? 'bg-yellow-800 bg-opacity-40'
                            : index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'
                        }`}
                      >
                        <td className="py-3 px-4 font-mono">{index + 1}</td>
                        <td className="py-3 px-4 flex items-center">
                          {score.photoURL && (
                            <img 
                              src={score.photoURL} 
                              alt={score.displayName || 'Player'} 
                              className="w-8 h-8 rounded-full mr-3"
                            />
                          )}
                          <span className="font-medium">{score.displayName || 'Anonymous'}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold">{score.score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-gray-400 text-center py-6 text-lg">No scores yet. Be the first!</div>
              )}
            </div>
            
            {/* User's Score (if not in top 10) */}
            {userScore !== undefined && currentUser && userRank && userRank > 10 && (
              <>
                <h3 className="text-xl font-bold text-white mb-4">Your Position: #{userRank}</h3>
                <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
                  <table className="w-full text-base">
                    <thead>
                      <tr className="text-gray-300 border-b border-gray-700 bg-gray-700">
                        <th className="text-left py-3 px-4">Rank</th>
                        <th className="text-left py-3 px-4">Player</th>
                        <th className="text-right py-3 px-4">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Scores above user */}
                      {nearbyScores.above.map((score, index) => (
                        <tr key={score.id} className="border-b border-gray-700 bg-gray-800">
                          <td className="py-3 px-4 font-mono">{userRank - (nearbyScores.above.length - index)}</td>
                          <td className="py-3 px-4 flex items-center">
                            {score.photoURL && (
                              <img 
                                src={score.photoURL} 
                                alt={score.displayName || 'Player'} 
                                className="w-8 h-8 rounded-full mr-3"
                              />
                            )}
                            <span className="font-medium">{score.displayName || 'Anonymous'}</span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold">{score.score}</td>
                        </tr>
                      ))}
                      
                      {/* User's score */}
                      <tr className="bg-yellow-800 bg-opacity-60 border-t-2 border-b-2 border-yellow-600">
                        <td className="py-4 px-4 font-mono font-bold">{userRank}</td>
                        <td className="py-4 px-4 flex items-center">
                          {currentUser.photoURL && (
                            <img 
                              src={currentUser.photoURL} 
                              alt={currentUser.displayName || 'You'} 
                              className="w-8 h-8 rounded-full mr-3"
                            />
                          )}
                          <span className="font-bold text-lg">{currentUser.displayName || 'You'}</span>
                          <span className="ml-2 bg-yellow-600 text-white text-xs px-2 py-1 rounded">YOU</span>
                        </td>
                        <td className="py-4 px-4 text-right font-mono font-bold text-lg">{userScore}</td>
                      </tr>
                      
                      {/* Scores below user */}
                      {nearbyScores.below.map((score, index) => (
                        <tr key={score.id} className={`border-b border-gray-700 ${index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}`}>
                          <td className="py-3 px-4 font-mono">{userRank + 1 + index}</td>
                          <td className="py-3 px-4 flex items-center">
                            {score.photoURL && (
                              <img 
                                src={score.photoURL} 
                                alt={score.displayName || 'Player'} 
                                className="w-8 h-8 rounded-full mr-3"
                              />
                            )}
                            <span className="font-medium">{score.displayName || 'Anonymous'}</span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold">{score.score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>
      
      {/* Footer */}
      <div className="bg-gray-900 p-4 border-t border-gray-800 flex justify-center">
        <button
          onClick={onClose}
          className="py-3 px-8 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-white font-medium text-lg"
        >
          Return to Game
        </button>
      </div>
    </div>
  );
};

export default Leaderboard; 
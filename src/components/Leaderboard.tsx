import React, { useState, useEffect } from 'react';
import { getTopScores, getUserScoreRank, getScoresAroundUser, LeaderboardEntry } from '../firebase/leaderboard';
import { useAuth } from '../firebase/AuthContext';

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
  
  const { currentUser } = useAuth();
  
  // Fetch leaderboard data when component mounts or when isOpen changes
  useEffect(() => {
    if (isOpen) {
      fetchLeaderboardData();
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
        
        if (!isInTopTen) {
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
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-lg max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Leaderboard</h2>
          <button 
            onClick={onClose}
            className="text-white hover:text-gray-200"
          >
            ✕
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 overflow-y-auto flex-grow">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="text-red-400 text-center py-4">{error}</div>
          ) : (
            <>
              {/* Top Scores */}
              <h3 className="text-lg font-bold text-white mb-2">Top 10 Scores</h3>
              <div className="mb-6">
                {topScores.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-700">
                        <th className="text-left py-2">Rank</th>
                        <th className="text-left py-2">Player</th>
                        <th className="text-right py-2">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topScores.map((score, index) => (
                        <tr 
                          key={score.id}
                          className={`border-b border-gray-700 ${
                            currentUser && score.userId === currentUser.uid
                              ? 'bg-yellow-800 bg-opacity-30'
                              : ''
                          }`}
                        >
                          <td className="py-2">{index + 1}</td>
                          <td className="py-2 flex items-center">
                            {score.photoURL && (
                              <img 
                                src={score.photoURL} 
                                alt={score.displayName || 'Player'} 
                                className="w-6 h-6 rounded-full mr-2"
                              />
                            )}
                            {score.displayName || 'Anonymous'}
                          </td>
                          <td className="py-2 text-right font-mono">{score.score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-gray-400 text-center py-4">No scores yet. Be the first!</div>
                )}
              </div>
              
              {/* User's Score (if not in top 10) */}
              {userScore !== undefined && currentUser && userRank && userRank > 10 && (
                <>
                  <h3 className="text-lg font-bold text-white mb-2">Your Rank: #{userRank}</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-700">
                        <th className="text-left py-2">Rank</th>
                        <th className="text-left py-2">Player</th>
                        <th className="text-right py-2">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Scores above user */}
                      {nearbyScores.above.map((score, index) => (
                        <tr key={score.id} className="border-b border-gray-700">
                          <td className="py-2">{userRank - (nearbyScores.above.length - index)}</td>
                          <td className="py-2 flex items-center">
                            {score.photoURL && (
                              <img 
                                src={score.photoURL} 
                                alt={score.displayName || 'Player'} 
                                className="w-6 h-6 rounded-full mr-2"
                              />
                            )}
                            {score.displayName || 'Anonymous'}
                          </td>
                          <td className="py-2 text-right font-mono">{score.score}</td>
                        </tr>
                      ))}
                      
                      {/* User's score */}
                      <tr className="bg-yellow-800 bg-opacity-50 border-b border-gray-700">
                        <td className="py-2">{userRank}</td>
                        <td className="py-2 flex items-center">
                          {currentUser.photoURL && (
                            <img 
                              src={currentUser.photoURL} 
                              alt={currentUser.displayName || 'You'} 
                              className="w-6 h-6 rounded-full mr-2"
                            />
                          )}
                          {currentUser.displayName || 'You'}
                        </td>
                        <td className="py-2 text-right font-mono">{userScore}</td>
                      </tr>
                      
                      {/* Scores below user */}
                      {nearbyScores.below.map((score, index) => (
                        <tr key={score.id} className="border-b border-gray-700">
                          <td className="py-2">{userRank + 1 + index}</td>
                          <td className="py-2 flex items-center">
                            {score.photoURL && (
                              <img 
                                src={score.photoURL} 
                                alt={score.displayName || 'Player'} 
                                className="w-6 h-6 rounded-full mr-2"
                              />
                            )}
                            {score.displayName || 'Anonymous'}
                          </td>
                          <td className="py-2 text-right font-mono">{score.score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </>
          )}
        </div>
        
        {/* Footer */}
        <div className="bg-gray-900 p-4">
          <button
            onClick={onClose}
            className="w-full py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard; 
import React, { useState, useEffect } from 'react';
import { getTopScores, getUserScoreRank, getScoresAroundUser, LeaderboardEntry } from '../firebase/leaderboard';
import { useAuth } from '../firebase/AuthContext';
import MockSignIn from './MockSignIn';
import '../styles/customScrollbar.css';

interface LeaderboardProps {
  isOpen: boolean;
  onClose: () => void;
  userScore?: number;
  inGameFrame?: boolean; // New prop to determine rendering style
}

const Leaderboard: React.FC<LeaderboardProps> = ({ isOpen, onClose, userScore, inGameFrame = true }) => {
  const [topScores, setTopScores] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [nearbyScores, setNearbyScores] = useState<{
    above: LeaderboardEntry[];
    below: LeaderboardEntry[];
  }>({ above: [], below: [] });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showSignIn, setShowSignIn] = useState<boolean>(false);
  
  const { currentUser, submitUserScore, mockSignIn, userData } = useAuth();
  
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
  
  const handleMockSignIn = async (name: string, company: string) => {
    try {
      console.log('[Leaderboard] handleMockSignIn called with:', { name, company });
      
      // Sign in with the provided name and company
      const userData = await mockSignIn(name, company);
      console.log('[Leaderboard] mockSignIn result:', userData);
      
      // If we have a score, submit it
      if (userScore !== undefined) {
        console.log('[Leaderboard] Submitting score:', userScore);
        await submitUserScore(userScore);
      }
      
      // Refresh the leaderboard data
      console.log('[Leaderboard] Refreshing leaderboard data');
      fetchLeaderboardData();
      
      // Hide the sign-in form
      setShowSignIn(false);
    } catch (error) {
      console.error('[Leaderboard] Error during mock sign in:', error);
      setError('Failed to sign in. Please try again.');
    }
  };
  
  // Add a function to explicitly re-enable game inputs when closing the leaderboard
  const handleClose = () => {
    // Create and dispatch custom event to re-enable game inputs
    setTimeout(() => {
      const inputEvent = new CustomEvent('gameInputState', { 
        detail: { inputsDisabled: false, forceReset: true }
      });
      window.dispatchEvent(inputEvent);
      
      // Set global flag to indicate leaderboard is closed
      (window as any).isLeaderboardOpen = false;
    }, 50);
    
    // Call the original onClose callback
    onClose();
  };
  
  if (!isOpen) return null;
  
  // Update the container className to make it wider and use the game font
  const containerClassName = inGameFrame
    ? "absolute inset-0 bg-black bg-opacity-80 z-50 flex flex-col rounded-lg overflow-hidden border-2 border-gray-700 shadow-xl font-pixel"
    : "fixed inset-0 bg-gray-900 z-50 flex flex-col font-pixel";
  
  return (
    <div className={containerClassName}>
      {/* Header - Styled to fit within game canvas when inGameFrame=true */}
      <div className={`${inGameFrame ? 'bg-gray-800' : 'bg-blue-600'} p-4 flex items-center justify-between`}>
        <h2 className={`${inGameFrame ? 'text-xl' : 'text-2xl'} font-bold text-white`}>
          🏆 GLOBAL LEADERBOARD
        </h2>
        <button 
          onClick={handleClose}
          className="text-white hover:text-gray-200 font-bold px-3 py-1 rounded hover:bg-gray-700"
        >
          × CLOSE
        </button>
      </div>
      
      {/* Content - Make it wider and better padded */}
      <div className="flex-grow overflow-y-auto p-6 mx-auto w-full thin-scrollbar-dark" style={{ maxWidth: inGameFrame ? '850px' : '1000px' }}>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="text-red-400 text-center py-8 text-xl">{error}</div>
        ) : showSignIn ? (
          <div className="flex flex-col items-center justify-center py-8">
            <MockSignIn 
              onSuccess={(name, company) => {
                console.log('[Leaderboard] MockSignIn onSuccess callback called with:', { name, company });
                handleMockSignIn(name, company);
              }}
              onClose={() => {
                console.log('[Leaderboard] MockSignIn onClose callback called');
                handleClose();
              }}
              score={userScore || 0}
            />
          </div>
        ) : (
          <>
            {/* Top Scores */}
            <h3 className={`${inGameFrame ? 'text-lg' : 'text-xl'} font-bold text-white mb-3`}>
              TOP 10 PLAYERS
            </h3>
            <div className="mb-8 bg-gray-800 rounded-lg overflow-hidden shadow-lg">
              {topScores.length > 0 ? (
                <table className="w-full text-base">
                  <thead>
                    <tr className="text-gray-300 border-b border-gray-700 bg-gray-700">
                      <th className="text-left py-3 px-4">RANK</th>
                      <th className="text-left py-3 px-4">NAME</th>
                      <th className="text-left py-3 px-4">COMPANY</th>
                      <th className="text-right py-3 px-4">SCORE</th>
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
                              className="w-6 h-6 rounded-full mr-2"
                            />
                          )}
                          <span className="font-medium">{score.displayName || 'Anonymous'}</span>
                        </td>
                        <td className="py-3 px-4">
                          {score.company || '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold">{score.score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-gray-400 text-center py-6 text-lg">NO SCORES YET. BE THE FIRST!</div>
              )}
            </div>
            
            {/* User's Score (if not in top 10) */}
            {userScore !== undefined && currentUser && (
              <>
                <h3 className={`${inGameFrame ? 'text-lg' : 'text-xl'} font-bold text-white mb-3`}>
                  YOUR POSITION: #{userRank || 'N/A'}
                </h3>
                <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
                  <table className="w-full text-base">
                    <thead>
                      <tr className="text-gray-300 border-b border-gray-700 bg-gray-700">
                        <th className="text-left py-3 px-4">RANK</th>
                        <th className="text-left py-3 px-4">NAME</th>
                        <th className="text-left py-3 px-4">COMPANY</th>
                        <th className="text-right py-3 px-4">SCORE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* User's score */}
                      <tr className="bg-yellow-800 bg-opacity-60 border-t-2 border-b-2 border-yellow-600">
                        <td className="py-3 px-4 font-mono font-bold">{userRank || '--'}</td>
                        <td className="py-3 px-4 flex items-center">
                          {currentUser.photoURL && (
                            <img 
                              src={currentUser.photoURL} 
                              alt={currentUser.displayName || 'You'} 
                              className="w-6 h-6 rounded-full mr-2"
                            />
                          )}
                          <span className="font-bold">{currentUser.displayName || 'You'}</span>
                          <span className="ml-2 bg-yellow-600 text-white text-xs px-2 py-1 rounded">YOU</span>
                        </td>
                        <td className="py-3 px-4">
                          {userData?.company || '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold">{userScore}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>
      
      {/* Footer */}
      <div className={`${inGameFrame ? 'bg-gray-800' : 'bg-gray-900'} p-3 ${inGameFrame ? 'border-t border-gray-700' : 'border-t border-gray-800'} flex justify-center`}>
        <button
          onClick={handleClose}
          className="py-2 px-6 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-white font-medium"
        >
          Return to Game
        </button>
      </div>
    </div>
  );
};

export default Leaderboard; 
import React, { useState, useEffect } from 'react';
import { getTopScores, getUserScoreRank, getScoresAroundUser, LeaderboardEntry } from '../firebase/leaderboard';
import { useAuth } from '../firebase/AuthContext';
import MockSignIn from './MockSignIn';
import '../styles/customScrollbar.css';

interface LeaderboardProps {
  isOpen: boolean;
  onClose: () => void;
  userScore?: number;
  inGameFrame?: boolean; // For styling, true by default
}

const Leaderboard: React.FC<LeaderboardProps> = ({ 
  isOpen, 
  onClose, 
  userScore, 
  inGameFrame = true 
}) => {
  // State for leaderboard data
  const [topScores, setTopScores] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [nearbyScores, setNearbyScores] = useState<{
    above: LeaderboardEntry[];
    below: LeaderboardEntry[];
  }>({ above: [], below: [] });
  
  // UI state
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showSignIn, setShowSignIn] = useState<boolean>(false);
  const [debug, setDebug] = useState<string>('');

  // Authentication context
  const { 
    currentUser, 
    userData, 
    submitUserScore, 
    updateUserCompany,
    refreshUserData
  } = useAuth();

  // Fetch leaderboard data when component mounts or when dependencies change
  useEffect(() => {
    if (isOpen) {
      console.log('Leaderboard opened, fetching data...');
      fetchLeaderboardData();
      
      // Check if user is not authenticated and has a score to submit
      if (!currentUser && userScore !== undefined) {
        setShowSignIn(true);
      } 
      // Don't automatically hide the sign-in form when user authenticates
      // This allows them to complete the company submission process
      // setShowSignIn will be set to false in handleMockSignIn after submission
    }
  }, [isOpen, userScore]);  // Remove currentUser and userData as dependencies

  // Function to fetch all leaderboard data
  const fetchLeaderboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch top scores
      console.log('Fetching top scores...');
      const scores = await getTopScores(10);
      console.log('Received top scores:', scores);
      
      // Debug log for company names
      scores.forEach((score, index) => {
        console.log(`Score ${index+1} - User: ${score.displayName}, Company: "${score.company}", ID: ${score.userId}`);
      });
      
      setTopScores(scores);
      
      // If we have a user score, get rank and nearby scores
      if (userScore !== undefined) {
        console.log('Fetching rank for score:', userScore);
        const rank = await getUserScoreRank(userScore);
        setUserRank(rank);
        
        // If user rank is beyond top 10, get nearby scores
        if (rank > 10) {
          console.log('Fetching nearby scores for rank:', rank);
          const nearby = await getScoresAroundUser(userScore, 3);
          setNearbyScores(nearby);
        }
      }
    } catch (err) {
      console.error('Error fetching leaderboard data:', err);
      setError('Failed to load leaderboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle mock sign-in
  const handleMockSignIn = async (name: string, company: string) => {
    try {
      console.log('Company form submitted with:', { name, company });
      
      // Update the company if needed
      if (currentUser) {
        await updateUserCompany(company);
      }
      
      // Submit the score
      await submitScore();
      
      // Only now hide the sign-in form after full submission
      setShowSignIn(false);
      
      // Fetch leaderboard data again after submission
      console.log('Score submitted, refreshing leaderboard data...');
      await fetchLeaderboardData();
    } catch (error) {
      console.error('Error during form submission:', error);
      setError('Failed to submit score. Please try again.');
    }
  };

  // Submit the score to Firebase
  const submitScore = async () => {
    if (userScore === undefined || !currentUser) return;
    
    try {
      setLoading(true);
      setError(null);
      console.log('Submitting score:', userScore);
      console.log('User data before submission:', {
        userId: currentUser.uid,
        displayName: currentUser.displayName,
        company: userData?.company,
        marketingOptIn: userData?.marketingOptIn
      });
      
      // Show a message to the user
      const loadingMsg = document.createElement('div');
      loadingMsg.className = 'fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50';
      loadingMsg.innerHTML = `
        <div class="bg-gray-800 p-8 rounded-lg text-white text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p class="mt-4">Submitting your score...</p>
          <p class="text-sm mt-2 text-gray-400">Please wait while we update the leaderboard</p>
        </div>
      `;
      document.body.appendChild(loadingMsg);
      
      const submissionResult = await submitUserScore(userScore);
      
      if (submissionResult) {
        console.log('Score submitted successfully with ID:', submissionResult);
      } else {
        console.error('Score submission failed - no document ID returned');
        setError('Failed to submit score. Please try again.');
        document.body.removeChild(loadingMsg);
        return;
      }
      
      // Wait a moment before refreshing to allow Firestore to update
      console.log('Waiting for Firestore to update...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Remove the loading message
      document.body.removeChild(loadingMsg);
      
      // Refresh leaderboard data after submission
      console.log('Refreshing leaderboard data after score submission');
      await fetchLeaderboardData();
    } catch (error) {
      console.error('Error submitting score:', error);
      setError('Failed to submit score. Please try again.');
      
      // Remove loading message if it exists
      const loadingMsg = document.querySelector('.fixed.inset-0.flex.items-center.justify-center');
      if (loadingMsg) document.body.removeChild(loadingMsg);
    } finally {
      setLoading(false);
    }
  };

  // Close the leaderboard and re-enable game inputs
  const handleClose = () => {
    // Create and dispatch custom event to re-enable game inputs
    const inputEvent = new CustomEvent('gameInputState', { 
      detail: { inputsDisabled: false, forceReset: true }
    });
    window.dispatchEvent(inputEvent);
    
    // Set global flag to indicate leaderboard is closed
    (window as any).isLeaderboardOpen = false;
    
    // Call the original onClose callback
    onClose();
  };

  // Render the leaderboard content with loading state
  const renderLeaderboardContent = () => {
    if (loading) {
      return (
        <div className="loading-spinner-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
          <p className="loading-text">Loading leaderboard data...</p>
          <p className="text-sm text-gray-400 mt-2">Retrieving latest scores</p>
        </div>
      );
    }
    
    if (error) {
      return <div className="error-message">{error}</div>;
    }

    // Log entries to help with debugging
    console.log('Current user:', currentUser?.uid);
    console.log('Top scores to render:', topScores);
    
    return (
      <>
        {/* Top Scores Table */}
        <div className="leaderboard-section">
          <h3>TOP 10 SCORES</h3>
          <table className="scores-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Company</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {topScores.length === 0 ? (
                <tr>
                  <td colSpan={4} className="no-scores">No scores available yet</td>
                </tr>
              ) : (
                topScores.map((entry, index) => {
                  // Check if this entry belongs to the current user
                  const isCurrentUser = currentUser && entry.userId === currentUser.uid;
                  console.log(`Entry ${index}: userId=${entry.userId}, isCurrentUser=${isCurrentUser}, company=${entry.company}`);
                  
                  return (
                    <tr 
                      key={entry.id} 
                      className={isCurrentUser ? "current-user-row" : ""}
                    >
                      <td>#{index + 1}</td>
                      <td>
                        <div className="player-info">
                          {entry.photoURL && (
                            <img 
                              src={entry.photoURL} 
                              alt="" 
                              className="player-avatar"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                console.error("Failed to load leaderboard avatar:", e);
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                          <span>{entry.displayName || 'Anonymous'}</span>
                          {isCurrentUser && (
                            <span className="current-user-badge">YOU</span>
                          )}
                        </div>
                      </td>
                      <td>{entry.company ? entry.company : '-'}</td>
                      <td className="score-value">{entry.score}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* User's Score Section (if not in top 10) */}
        {userScore !== undefined && userRank !== null && userRank > 10 && (
          <div className="leaderboard-section user-position">
            <h3>YOUR POSITION</h3>
            <p className="user-rank">
              Your rank: <span>#{userRank}</span>
            </p>
            
            <table className="scores-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player</th>
                  <th>Company</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {/* Scores above user */}
                {nearbyScores.above.map((entry, index) => (
                  <tr key={`above-${entry.id}`}>
                    <td>#{userRank - nearbyScores.above.length + index}</td>
                    <td>
                      <div className="player-info">
                        {entry.photoURL && (
                          <img 
                            src={entry.photoURL} 
                            alt="" 
                            className="player-avatar"
                          />
                        )}
                        <span>{entry.displayName || 'Anonymous'}</span>
                      </div>
                    </td>
                    <td>{entry.company || '-'}</td>
                    <td className="score-value">{entry.score}</td>
                  </tr>
                ))}
                
                {/* User's score */}
                <tr className="current-user-row">
                  <td>#{userRank}</td>
                  <td>
                    <div className="player-info">
                      {currentUser?.photoURL && (
                        <img 
                          src={currentUser.photoURL} 
                          alt="" 
                          className="player-avatar"
                        />
                      )}
                      <span>{currentUser?.displayName || 'You'}</span>
                      <span className="current-user-badge">YOU</span>
                    </div>
                  </td>
                  <td>{userData?.company || '-'}</td>
                  <td className="score-value">{userScore}</td>
                </tr>
                
                {/* Scores below user */}
                {nearbyScores.below.map((entry, index) => (
                  <tr key={`below-${entry.id}`}>
                    <td>#{userRank + index + 1}</td>
                    <td>
                      <div className="player-info">
                        {entry.photoURL && (
                          <img 
                            src={entry.photoURL} 
                            alt="" 
                            className="player-avatar"
                          />
                        )}
                        <span>{entry.displayName || 'Anonymous'}</span>
                      </div>
                    </td>
                    <td>{entry.company || '-'}</td>
                    <td className="score-value">{entry.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Debug information - comment out for production */}
        {/* {debug && (
          <div className="mt-4 p-4 bg-gray-800 rounded text-xs">
            <pre>{debug}</pre>
          </div>
        )} */}
      </>
    );
  };

  // Don't render if not open
  if (!isOpen) return null;

  // Show the sign in form if needed
  if (showSignIn) {
    return (
      <div className="leaderboard-container">
        <div className="leaderboard-header">
          <h2>GLOBAL LEADERBOARD</h2>
          <button onClick={handleClose} className="close-button">✕</button>
        </div>
        
        <div className="leaderboard-content">
          <MockSignIn 
            onSuccess={handleMockSignIn}
            onClose={handleClose}
            score={userScore || 0}
          />
        </div>
      </div>
    );
  }

  // Render the leaderboard
  return (
    <div className="leaderboard-container">
      <div className="leaderboard-header">
        <h2>GLOBAL LEADERBOARD</h2>
        <button onClick={handleClose} className="close-button">✕</button>
      </div>
      
      <div className="leaderboard-content">
        {renderLeaderboardContent()}
      </div>
      
      <div className="leaderboard-footer">
        <div className="game-title">Order Editing - The Game</div>
        <button
          onClick={handleClose}
          className="back-to-game-button"
        >
          Back to Game
        </button>
      </div>
    </div>
  );
};

export default Leaderboard; 
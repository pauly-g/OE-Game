import React from 'react';
import { useAuth } from '../firebase/AuthContext';
import { isMobileDevice } from '../utils/mobileDetection';

const UserProfileCorner: React.FC = () => {
  const { currentUser, userData, signOutUser } = useAuth();
  const isMobile = isMobileDevice();

  if (!currentUser) return null;

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOutUser();
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  // Calculate initials for fallback avatar
  const getInitials = () => {
    if (userData?.displayName) {
      return userData.displayName.charAt(0).toUpperCase();
    }
    if (currentUser.displayName) {
      return currentUser.displayName.charAt(0).toUpperCase();
    }
    return 'U';
  };

  // Get profile photo URL
  const photoURL = userData?.photoURL || currentUser.photoURL;

  return (
    <div className={`flex items-center ${isMobile ? 'bg-black/70 rounded-lg p-2' : ''}`}>
      {/* Profile Image */}
      <div className={`relative ${isMobile ? 'w-8 h-8' : 'w-10 h-10'} rounded-full overflow-hidden bg-blue-500 flex items-center justify-center text-white font-bold mr-2`}>
        {photoURL ? (
          <img
            src={photoURL}
            alt="Profile"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            onError={(e) => {
              // If image fails to load, show initials
              console.error('Failed to load profile image');
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement!.innerText = getInitials();
            }}
          />
        ) : (
          getInitials()
        )}
      </div>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className={`bg-red-500 hover:bg-red-600 text-white rounded-md px-2 py-1 ${isMobile ? 'text-xs' : 'text-xs'}`}
        title="Logout"
      >
        Logout
      </button>
    </div>
  );
};

export default UserProfileCorner; 
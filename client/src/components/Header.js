import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, useTuition, useAppDispatch } from '../store/hooks';
import { logoutUser } from '../store/slices/authSlice';

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAuth();
  const { tuitionData } = useTuition();

  // handleTuitionClick function removed as tuition name section was removed

  const handleSettingsClick = () => {
    setShowSettings(!showSettings);
  };

  return (
    <header className="w-full bg-white dark:bg-[#0e0e12] shadow-md border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-4">
        {/* Left Side - VidhyaSetu Logo */}
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2 text-black dark:text-white font-bold text-lg tracking-wide">
            <span className="inline-block bg-blue-100 dark:bg-blue-900/30 rounded-full p-2 shadow-sm">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2a7 7 0 0 1 7 7c0 3.87-3.13 7-7 7s-7-3.13-7-7a7 7 0 0 1 7-7zm0 18c-4.41 0-8 1.79-8 4v1h16v-1c0-2.21-3.59-4-8-4z"/>
              </svg>
            </span>
            <span className="text-base sm:text-lg">VidhyaSetu</span>
          </Link>
        </div>

        {/* Center - Search Bar (mobile optimized) */}
        {isAuthenticated && (
          <div className="flex-1 max-w-md mx-2 sm:mx-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                className="w-full px-3 py-2 pl-8 pr-3 text-sm border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#0f0f14] text-gray-900 dark:text-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <svg className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        )}

        {/* Right Side - Profile */}
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={handleSettingsClick}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden border border-gray-300 dark:border-gray-700 flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:ring-2 hover:ring-gray-200 dark:hover:ring-gray-700 transition"
                aria-label="Open profile menu"
              >
                {(() => {
                  try {
                    const img = localStorage.getItem('profileImage');
                    if (img) {
                      return <img src={img} alt="Profile" className="w-full h-full object-cover" />;
                    }
                  } catch (_) {}
                  return (
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  );
                })()}
              </button>
              {showSettings && (
                <div className="absolute right-0 mt-2 w-40 sm:w-44 bg-white dark:bg-[#0e0e12] border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg z-50">
                  <button
                    onClick={() => { setShowSettings(false); navigate('/tuition-details'); }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Profile
                  </button>
                  <button
                    onClick={async () => { await dispatch(logoutUser()); setShowSettings(false); navigate('/login'); }}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-gray-800"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/register" className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">Sign up</Link>
              <Link to="/login" className="px-3 py-1.5 text-sm bg-black text-white rounded-lg hover:bg-gray-900">Sign in</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header; 
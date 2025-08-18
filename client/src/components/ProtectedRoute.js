import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, useAppDispatch } from '../store/hooks';
import { checkAuthStatus } from '../store/slices/authSlice';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading, userRole, tuitionId } = useAuth();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check auth status when component mounts
    dispatch(checkAuthStatus());
  }, [dispatch]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }

    // After auth, ensure tuition connection flow
    if (!isLoading && isAuthenticated) {
      const notConnected = !tuitionId || tuitionId === 'owner' || tuitionId === null;
      if (notConnected) {
        // Allow users to stay on choice page or setup pages
        if (location.pathname === '/post-login-choice' || 
            location.pathname === '/setup-tuition' || 
            location.pathname === '/import-data' ||
            location.pathname === '/public-registrations' ||
            location.pathname === '/attendance') {
          console.log('ProtectedRoute: Allowing access to', location.pathname);
          return; // Allow these pages
        }
        
        console.log('ProtectedRoute: Redirecting from', location.pathname, 'because notConnected:', notConnected, 'userRole:', userRole);
        
        if (userRole === 'tuition_owner') {
          // New tuition owner must register tuition first
          navigate('/setup-tuition');
        } else {
          // Other roles should join existing tuition
          navigate('/tuition-login');
        }
      }
    }
  }, [isAuthenticated, isLoading, navigate, userRole, tuitionId, location.pathname]);

  // Show loading while checking auth status
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // If authenticated, render children
  if (isAuthenticated) {
    return children;
  }

  // If not authenticated, don't render anything (will redirect)
  return null;
};

export default ProtectedRoute; 
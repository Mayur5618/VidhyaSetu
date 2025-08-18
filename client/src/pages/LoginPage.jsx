import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useAppDispatch } from '../store/hooks';
import { loginUser, clearError } from '../store/slices/authSlice';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isLoading, error, isAuthenticated, user } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      // If user has a tuition_id, go to dashboard
      if (user.tuition_id) {
        navigate('/dashboard');
        return;
      }
      // For all other users, show the choice page
      navigate('/post-login-choice');
    }
  }, [isAuthenticated, user, navigate]);

  // Clear error when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(loginUser({ email, password }));
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-white dark:bg-[#0b0b0e] px-4">
      <div className="w-full max-w-md bg-white dark:bg-[#0e0e12] sm:rounded-2xl sm:shadow-xl sm:border sm:border-gray-100 dark:border-gray-800 px-4 sm:px-8 py-6 sm:py-8 flex flex-col items-center mt-2 mb-6">
        <h1 className="text-2xl font-extrabold text-center mb-6 mt-2 text-gray-900 dark:text-gray-100">VidhyaSetu</h1>
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          <input
            type="email"
            autoComplete="email"
            inputMode="email"
            className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 h-11 bg-white dark:bg-[#0f0f14] placeholder-gray-400 text-base focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-700 text-gray-900 dark:text-gray-100"
            placeholder="Enter Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
          />
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
            className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 h-11 bg-white dark:bg-[#0f0f14] placeholder-gray-400 text-base focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-700 pr-10 text-gray-900 dark:text-gray-100"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-300 p-1"
              onClick={() => setShowPassword(s => !s)}
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                // Open eye icon
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              ) : (
                // Closed eye icon
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.657.336-3.233.938-4.675m2.122-2.122A9.956 9.956 0 0112 3c5.523 0 10 4.477 10 10 0 1.657-.336 3.233-.938 4.675m-2.122 2.122A9.956 9.956 0 0112 21c-5.523 0-10-4.477-10-10 0-1.657.336-3.233.938-4.675" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                </svg>
              )}
            </button>
          </div>
          <button
            type="submit"
            className="w-full bg-black text-white rounded-lg h-11 font-bold shadow-sm hover:bg-gray-900 transition disabled:opacity-60 text-base"
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
          {error && <div className="text-red-500 text-center text-xs mt-1">{error}</div>}
        </form>
        <div className="w-full text-center mt-2 mb-2">
          <a href="#" className="text-gray-500 text-xs hover:underline">Forgot Password?</a>
        </div>
        {/* Divider */}
        <div className="flex items-center w-full my-4">
          <div className="flex-grow h-px bg-gray-200" />
          <span className="mx-2 text-gray-400 text-sm">or</span>
          <div className="flex-grow h-px bg-gray-200" />
        </div>
        {/* Social login buttons (UI only) */}
        <button className="w-full flex items-center justify-center gap-2 bg-gray-100 border border-gray-200 rounded-lg py-2 mb-2 text-gray-700 font-semibold hover:bg-gray-200 transition">
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
          Continue with Google
        </button>
        <button className="w-full flex items-center justify-center gap-2 bg-gray-100 border border-gray-200 rounded-lg py-2 text-gray-700 font-semibold hover:bg-gray-200 transition">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M16.365 1.43c0 1.14-.926 2.065-2.065 2.065-1.14 0-2.065-.926-2.065-2.065C12.235.29 13.16-.635 14.3-.635c1.14 0 2.065.926 2.065 2.065zm-2.065 3.435c-1.14 0-2.065.926-2.065 2.065 0 1.14.926 2.065 2.065 2.065 1.14 0 2.065-.926 2.065-2.065 0-1.14-.926-2.065-2.065-2.065zm6.545 2.065c0-2.485-2.015-4.5-4.5-4.5s-4.5 2.015-4.5 4.5c0 2.485 2.015 4.5 4.5 4.5s4.5-2.015 4.5-4.5zm-2.065 3.435c-1.14 0-2.065.926-2.065 2.065 0 1.14.926 2.065 2.065 2.065 1.14 0 2.065-.926 2.065-2.065 0-1.14-.926-2.065-2.065-2.065z" />
          </svg>
          Continue with Apple
        </button>
        <p className="text-xs text-gray-400 text-center mt-5">
          By clicking continue, you agree to our <a href="#" className="underline">Terms of Service</a> and <a href="#" className="underline">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
};

export default LoginPage; 
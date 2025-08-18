import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/index.jsx';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Header from './components/Header';
import Footer from './components/Footer';
import TuitionProfileSetup from './pages/TuitionProfileSetup';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import RoleSelection from './pages/RoleSelection';
import TuitionLogin from './pages/TuitionLogin';
import ImportData from './pages/ImportData';
import TuitionDetails from './pages/TuitionDetails';
import PostSetupChoice from './pages/PostSetupChoice';
import PostLoginChoice from './pages/PostLoginChoice';
import PublicRegistrations from './pages/PublicRegistrations';
import Attendance from './pages/Attendance';
import StudentManagement from './pages/StudentManagement';
import StudentDetail from './pages/StudentDetail';
import AbsenceReasons from './pages/AbsenceReasons';
import FeesManagement from './pages/FeesManagement';

function AppContent() {
  useEffect(() => {
    // Force dark mode site-wide
    document.documentElement.classList.add('dark');
    return () => {
      document.documentElement.classList.remove('dark');
    };
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 dark:bg-[#0b0b0e] text-gray-900 dark:text-gray-100">
        {/* Header only on desktop */}
        <div className="hidden md:block"><Header /></div>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/role-selection" element={<ProtectedRoute><RoleSelection /></ProtectedRoute>} />
          <Route path="/tuition-login" element={<ProtectedRoute><TuitionLogin /></ProtectedRoute>} />
          <Route path="/import-data" element={<ProtectedRoute><ImportData /></ProtectedRoute>} />
          <Route path="/setup-tuition" element={<ProtectedRoute><TuitionProfileSetup /></ProtectedRoute>} />
          <Route path="/post-setup" element={<ProtectedRoute><PostSetupChoice /></ProtectedRoute>} />
          <Route path="/post-login-choice" element={<ProtectedRoute><PostLoginChoice /></ProtectedRoute>} />
                        <Route path="/public-registrations" element={<ProtectedRoute><PublicRegistrations /></ProtectedRoute>} />
              <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
              <Route path="/student-management" element={<ProtectedRoute><StudentManagement /></ProtectedRoute>} />
              <Route path="/student/:id" element={<ProtectedRoute><StudentDetail /></ProtectedRoute>} />
              <Route path="/absence-reasons" element={<ProtectedRoute><AbsenceReasons /></ProtectedRoute>} />
              <Route path="/fees-management" element={<ProtectedRoute><FeesManagement /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/tuition-details" element={<ProtectedRoute><TuitionDetails /></ProtectedRoute>} />
        </Routes>
        {/* Footer only on desktop */}
        <div className="hidden md:block"><Footer /></div>
      </div>
    </Router>
  );
}

function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

export default App;
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useTuition, useStudents, useNotifications, useAppDispatch } from '../store/hooks';
import { fetchTuitionData, fetchPendingAttendanceBatches } from '../store/slices/tuitionSlice';
import { fetchStudents } from '../store/slices/studentSlice';
import { fetchNotifications } from '../store/slices/notificationSlice';
import { logoutUser } from '../store/slices/authSlice';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, userRole, tuitionId } = useAuth();
  const { tuitionData, subTeachers, pendingAttendanceBatches, isLoading: tuitionLoading } = useTuition();
  const { students, isLoading: studentsLoading } = useStudents();
  const { notifications, unreadCount } = useNotifications();
  const dispatch = useAppDispatch();

  // Move useState to top level - before any conditional logic
  const standards = Array.from(new Set((pendingAttendanceBatches || []).map(b => b.standard || ''))).filter(Boolean);
  const [activeStandard, setActiveStandard] = useState(standards[0] || null);

  useEffect(() => {
    if (tuitionId) {
      dispatch(fetchTuitionData(tuitionId));
      dispatch(fetchStudents(tuitionId));
      dispatch(fetchNotifications());
      dispatch(fetchPendingAttendanceBatches(tuitionId));
    }
  }, [dispatch, tuitionId]);

  const handleLogout = () => {
    dispatch(logoutUser());
  };

  if (tuitionLoading || studentsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0b0b0e]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-200"></div>
      </div>
    );
  }

  // Build daily-work first UI
  const batchesForActive = (pendingAttendanceBatches || []).filter(b => (activeStandard ? b.standard === activeStandard : true));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0b0b0e]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-gray-100">Dashboard</h1>

        {/* Today - Remaining Attendance by Class */}
        <div className="bg-white dark:bg-[#0e0e12] rounded-lg shadow p-6 border border-gray-100 dark:border-gray-800 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Today: Remaining Attendance</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pick a class, then choose a batch to mark attendance</p>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">{pendingAttendanceBatches?.length || 0} pending</span>
          </div>

          {/* Standards pills */}
          <div className="flex flex-wrap gap-2 mb-4">
            {standards.length === 0 ? (
              <span className="text-sm text-gray-500">All done for today 🎉</span>
            ) : (
              standards.map(std => (
                <button
                  key={std}
                  onClick={() => setActiveStandard(std)}
                  className={`px-3 py-1 rounded-full border text-sm ${activeStandard === std ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700'}`}
                >
                  {std}
                </button>
              ))
            )}
          </div>

          {/* Batches for selected standard */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {batchesForActive.map(b => (
              <button
                key={b.id}
                onClick={() => navigate('/attendance')}
                className="w-full text-left px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{b.name}</div>
                    <div className="text-xs text-gray-500">{b.standard}</div>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Public registrations quick access */}
        <div className="bg-white dark:bg-[#0e0e12] rounded-lg shadow p-6 border border-gray-100 dark:border-gray-800 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Public Registrations</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Manage student applications</p>
            </div>
            <button
              onClick={() => navigate('/public-registrations')}
              className="inline-flex justify-center items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
            >
              View Registrations
            </button>
          </div>
        </div>

        {/* Absence Reasons Management */}
        <div className="bg-white dark:bg-[#0e0e12] rounded-lg shadow p-6 border border-gray-100 dark:border-gray-800 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Absence Reasons</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Generate WhatsApp links for students to submit absence reasons</p>
            </div>
            <button
              onClick={() => navigate('/absence-reasons')}
              className="inline-flex justify-center items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700"
            >
              Manage Absence Reasons
            </button>
          </div>
        </div>

        {/* Main Modules */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-[#0e0e12] rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer border border-gray-100 dark:border-gray-800" onClick={() => navigate('/student-management')}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Student Management</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Add, edit, and manage students</p>
              </div>
              <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
          </div>
          
          <div className="bg-white dark:bg-[#0e0e12] rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer border border-gray-100 dark:border-gray-800" onClick={() => navigate('/fees-management')}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Fee Management</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Track payments and dues</p>
              </div>
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>

          <div className="bg-white dark:bg-[#0e0e12] rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer border border-gray-100 dark:border-gray-800" onClick={() => navigate('/attendance')}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Attendance</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Mark and track attendance</p>
              </div>
              <svg className="h-8 w-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          <div className="bg-white dark:bg-[#0e0e12] rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Papers & Results</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Manage exams and results</p>
              </div>
              <svg className="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>

          <div className="bg-white dark:bg-[#0e0e12] rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Reports</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Generate detailed reports</p>
              </div>
              <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2z" />
              </svg>
            </div>
          </div>

          <div className="bg-white dark:bg-[#0e0e12] rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Backup</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Export and import data</p>
              </div>
              <svg className="h-8 w-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
          </div>
        </div>

        {/* User Role Specific Features */}
        {userRole === 'owner' && (
          <div className="mt-8 bg-white dark:bg-[#0e0e12] rounded-lg shadow p-6 border border-gray-100 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Owner Controls</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-100">
                <svg className="h-5 w-5 mr-2 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Sub-teacher
              </button>
              <button className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-100">
                <svg className="h-5 w-5 mr-2 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Tuition Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard; 
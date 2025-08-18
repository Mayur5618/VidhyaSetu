import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useTuition } from '../store/hooks';

const TuitionDetails = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tuitionData, students, subTeachers, isLoading, fetchTuitionData, fetchStudents } = useTuition();
  const [activeTab, setActiveTab] = useState('overview');
  const [hasFetched, setHasFetched] = useState(false);

  // Fetch tuition data when component mounts
  useEffect(() => {
    if (user?.tuition_id && !hasFetched && !isLoading) {
      console.log('Fetching tuition data for:', user.tuition_id);
      setHasFetched(true);
      fetchTuitionData(user.tuition_id);
      fetchStudents(user.tuition_id);
    }
  }, [user?.tuition_id, hasFetched, isLoading]); // Only depend on these values

  // Use real tuition data instead of mock data
  const realTuitionData = tuitionData || {
    name: 'Loading...',
    address: 'Loading...',
    contact_info: 'Loading...',
    email: 'Not provided',
    established: 'Not specified',
    standards_offered: [],
    subjects: [],
    totalStudents: 0,
    totalTeachers: 0
  };

  // Debug logging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('TuitionDetails - user:', user);
    console.log('TuitionDetails - tuitionData:', tuitionData);
    console.log('TuitionDetails - students:', students);
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0b0b0e]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-200"></div>
      </div>
    );
  }

  // Check if user has a tuition_id
  if (!user?.tuition_id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0b0b0e]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">No Tuition Center Assigned</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            You don't have a tuition center assigned yet.
            <br />
            <span className="text-sm">User ID: {user?.id}</span>
            <br />
            <span className="text-sm">Role: {user?.role}</span>
          </p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Check if tuition data is loaded
  if (!tuitionData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0b0b0e]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Loading Tuition Center...</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Please wait while we load your tuition center information.
            <br />
            <span className="text-sm">User ID: {user?.id}</span>
            <br />
            <span className="text-sm">Tuition ID: {user?.tuition_id}</span>
            <br />
            <span className="text-sm">Role: {user?.role}</span>
          </p>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-200 mx-auto mb-4"></div>
        </div>
      </div>
    );
  }

  // Use real fee structure from tuition data
  const totalFeeStructure = realTuitionData.fees_structure ? 
    (Array.isArray(realTuitionData.fees_structure) ? 
      realTuitionData.fees_structure.map(item => ({
        standard: item.standard,
        totalFee: item.total_fee
      })) : 
      Object.entries(realTuitionData.fees_structure).map(([standard, fee]) => ({
        standard: standard,
        totalFee: fee
      }))
    ) : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0b0b0e]">
      {/* Removed top header (back + last updated) as requested */}

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Tuition Info Card */}
        <div className="bg-white dark:bg-[#0e0e12] rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{realTuitionData.name}</h2>
              <p className="text-gray-600 dark:text-gray-300">{realTuitionData.address}</p>
            </div>
          </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span className="text-gray-700 dark:text-gray-300">{realTuitionData.contact_info}</span>
            </div>
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-gray-700 dark:text-gray-300">{realTuitionData.email || 'Not provided'}</span>
            </div>
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-gray-700 dark:text-gray-300">Est. {realTuitionData.established || 'Not specified'}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-[#0e0e12] rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z' },
                { id: 'teachers', label: 'Teachers', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z' },
                { id: 'settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                  </svg>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Students</p>
                        <p className="text-2xl font-bold text-gray-900">{students?.length || 0}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Present Today</p>
                        <p className="text-2xl font-bold text-gray-900">42</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Pending Fees</p>
                        <p className="text-2xl font-bold text-gray-900">₹15,500</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Teachers</p>
                        <p className="text-2xl font-bold text-gray-900">{subTeachers?.length || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Standards Offered</h3>
                    <div className="flex flex-wrap gap-2">
                      {realTuitionData.standards_offered && realTuitionData.standards_offered.length > 0 ? (
                        realTuitionData.standards_offered.map((standard, index) => (
                          <span key={index} className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-sm">
                            {standard}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-500 text-sm">No standards configured</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Subjects</h3>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-gray-500 text-sm">Subjects will be configured later</span>
                    </div>
                  </div>

                  {/* Fee Structure - full width */}
                  <div className="bg-white p-4 rounded-lg border shadow-sm md:col-span-2">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">Fee Structure</h3>
                      <span className="text-xs text-gray-500">Total fees (INR)</span>
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr className="text-left text-gray-600">
                            <th className="py-2 pl-4 pr-4 font-medium">Standard</th>
                            <th className="py-2 pr-4 font-medium text-right">Total Fee</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {totalFeeStructure.map((row) => (
                            <tr key={row.standard} className="hover:bg-gray-50">
                              <td className="py-2 pl-4 pr-4 text-gray-800">{row.standard}</td>
                              <td className="py-2 pr-4 font-semibold text-gray-900 text-right">₹{row.totalFee.toLocaleString('en-IN')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Teachers Tab */}
            {activeTab === 'teachers' && (
              <div className="space-y-6">
                {/* Owner Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Owner</h3>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium text-lg">{user?.name?.charAt(0) || 'U'}</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-900">{user?.name || 'User'}</h4>
                        <p className="text-sm text-gray-600">{user?.email || 'No email'}</p>
                        <p className="text-sm text-gray-600">{user?.phone || 'No phone'}</p>
                      </div>
                      <div className="text-right">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                          Owner
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sub Teachers Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Sub Teachers</h3>
                  <div className="space-y-4">
                    {subTeachers && subTeachers.length > 0 ? (
                      subTeachers.map((teacher) => (
                        <div key={teacher.id} className="bg-white border border-gray-200 p-4 rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                              <span className="text-purple-600 font-medium text-lg">{teacher.name?.charAt(0) || 'T'}</span>
                            </div>
                            <div className="flex-1">
                              <h4 className="text-lg font-semibold text-gray-900">{teacher.name || 'Teacher'}</h4>
                              <p className="text-sm text-gray-600">{teacher.email || 'No email'}</p>
                              <p className="text-sm text-gray-600">{teacher.phone || 'No phone'}</p>
                            </div>
                            <div className="text-right">
                              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                                Sub Teacher
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>No sub-teachers found</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">General Settings</h3>
                    
                    <div className="space-y-3">
                      <button className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition flex items-center gap-3">
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>Profile Settings</span>
                      </button>

                      <button className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition flex items-center gap-3">
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span>Security & Privacy</span>
                      </button>

                      <button className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition flex items-center gap-3">
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.5 19.5h15a2 2 0 002-2V7a2 2 0 00-2-2h-15a2 2 0 00-2 2v10.5a2 2 0 002 2z" />
                        </svg>
                        <span>Notifications</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Data Management</h3>
                    
                    <div className="space-y-3">
                      <button className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition flex items-center gap-3">
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Backup & Export</span>
                      </button>

                      <button className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition flex items-center gap-3">
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <span>Import Data</span>
                      </button>

                      <button className="w-full text-left p-3 bg-red-50 hover:bg-red-100 rounded-lg transition flex items-center gap-3">
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span className="text-red-600">Delete Tuition</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TuitionDetails; 
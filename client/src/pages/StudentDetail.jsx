import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../store/hooks';

const StudentDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id) {
      fetchStudentDetails();
    }
  }, [id]);

  const fetchStudentDetails = async () => {
    try {
      const response = await fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          query: `
            query GetStudent($id: ID!) {
              student(id: $id) {
                id
                name
                photo_url
                contact_info {
                  phone
                  address
                }
                standard
                batch_id
                tuition_id
                registration_source
                status
                createdAt
                updatedAt
              }
            }
          `,
          variables: { id }
        })
      });

      const data = await response.json();
      if (data.errors) {
        throw new Error(data.errors[0].message);
      }

      setStudent(data.data.student);
    } catch (error) {
      console.error('Error fetching student details:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0b0b0e]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-200"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0b0b0e]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Error</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button 
            onClick={() => navigate('/student-management')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Student Management
          </button>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0b0b0e]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Student Not Found</h2>
          <button 
            onClick={() => navigate('/student-management')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Student Management
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0b0b0e] p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                Student Details
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">
                Viewing information for {student.name}
              </p>
            </div>
            <button
              onClick={() => navigate('/student-management')}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Back</span>
            </button>
          </div>
        </div>

        {/* Student Information Card */}
        <div className="bg-white dark:bg-[#0e0e12] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name
                </label>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {student.name}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone Number
                </label>
                <p className="text-gray-900 dark:text-gray-100">
                  {student.contact_info?.phone || 'Not provided'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Address
                </label>
                <p className="text-gray-900 dark:text-gray-100">
                  {student.contact_info?.address || 'Not provided'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Class/Standard
                </label>
                <p className="text-gray-900 dark:text-gray-100">
                  Class {student.standard}
                </p>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Registration Source
                </label>
                <p className="text-gray-900 dark:text-gray-100">
                  {student.registration_source === 'public_form' ? 'Public Form' : 'Manual Entry'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                  student.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  student.status === 'approved' ? 'bg-green-100 text-green-800' :
                  student.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {student.status || 'pending'}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Student ID
                </label>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                  {student.id}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Registered On
                </label>
                <p className="text-gray-900 dark:text-gray-100">
                  {new Date(student.createdAt).toLocaleDateString('en-IN')}
                </p>
              </div>
            </div>
          </div>

          {/* Photo Section */}
          {student.photo_url && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Student Photo
              </label>
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                <img 
                  src={student.photo_url} 
                  alt={student.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400" style={{display: 'none'}}>
                  <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate('/student-management')}
            className="w-full sm:w-auto px-4 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors font-medium"
          >
            Back to List
          </button>
          <button
            onClick={() => navigate(`/attendance?batch=${student.batch_id}`)}
            className="w-full sm:w-auto px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
          >
            Mark Attendance
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentDetail;

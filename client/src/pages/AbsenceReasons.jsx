import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/hooks';

const AbsenceReasons = () => {
  const navigate = useNavigate();
  const { user, tuitionId } = useAuth();

  const [absenceReasons, setAbsenceReasons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);


  useEffect(() => {
    if (tuitionId) {
      fetchAbsenceReasons();
    }
  }, [tuitionId]);



  const fetchAbsenceReasons = async () => {
    if (!tuitionId) return;
    
    try {
      const response = await fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          query: `
            query GetAbsenceReasons($tuition_id: ID!) {
              absenceReasons(tuition_id: $tuition_id) {
                id
                student_name
                roll_number
                phone_number
                standard
                batch_name
                reason
                submitted_at
              }
            }
          `,
          variables: { 
            tuition_id: tuitionId
          }
        })
      });

      const data = await response.json();
      if (data.errors) throw new Error(data.errors[0].message);
      
      setAbsenceReasons(data.data.absenceReasons || []);
    } catch (error) {
      console.error('Error fetching absence reasons:', error);
    }
  };

  const generateCommonLink = () => {
    // Generate a common link similar to public registrations
    const formUrl = `http://localhost:4000/absence-reason/${user?.tuition_custom_id || 'TUI-001'}`;
    setGeneratedLink(formUrl);
  };

  const copyToClipboard = async () => {
    try {
      const linkToCopy = generatedLink || `http://localhost:4000/absence-reason/${user?.tuition_custom_id || 'TUI-001'}`;
      await navigator.clipboard.writeText(linkToCopy);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000); // Hide after 3 seconds
    } catch (err) {
      // Fallback for older browsers
      const linkToCopy = generatedLink || `http://localhost:4000/absence-reason/${user?.tuition_custom_id || 'TUI-001'}`;
      const textArea = document.createElement('textarea');
      textArea.value = linkToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000); // Hide after 3 seconds
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0b0b0e]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Absence Reasons Management</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              View all submitted student absence reasons
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Link Generation */}
        <div className="bg-white dark:bg-[#0e0e12] rounded-lg shadow p-6 border border-gray-100 dark:border-gray-800 mb-8">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center justify-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Generate Absence Reason Form Link
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Generate one common link that can be shared in all WhatsApp groups. Any student can use this link to submit their absence reason.
            </p>
            
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">Share this link in your WhatsApp groups for students to submit absence reasons:</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-white dark:bg-gray-700 px-4 py-3 rounded border border-gray-300 dark:border-gray-600 text-sm text-gray-800 dark:text-gray-200 font-mono break-all">
                      {generatedLink || `http://localhost:4000/absence-reason/${user?.tuition_custom_id || 'TUI-001'}`}
                    </div>
                    <button
                      onClick={copyToClipboard}
                      className={`px-6 py-3 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap h-fit font-medium flex-shrink-0 ${
                        copySuccess 
                          ? 'bg-green-600 text-white hover:bg-green-700' 
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {copySuccess ? (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy Link
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Success Banner */}
            {copySuccess && (
              <div className="mt-4 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-green-800 dark:text-green-200 text-sm font-medium">
                  Link copied successfully! You can now paste it anywhere.
                </span>
              </div>
            )}
            
            <p className="text-xs text-gray-500 mt-3">
              This link will work for all students from any class or batch
            </p>
          </div>
        </div>

        

        {/* Submitted Absence Reasons */}
        <div className="bg-white dark:bg-[#0e0e12] rounded-lg shadow border border-gray-100 dark:border-gray-800">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Submitted Absence Reasons
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              View all submitted student absence reasons
            </p>
          </div>
          
          {absenceReasons.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {absenceReasons.map((reason) => (
                <div key={reason.id} className="px-6 py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {reason.student_name} (Roll: {reason.roll_number})
                        </div>
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                        <strong>Class:</strong> {reason.standard} | <strong>Batch:</strong> {reason.batch_name}
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                        <strong>Reason:</strong> {reason.reason}
                      </div>
                      <div className="text-xs text-gray-500">
                        Submitted: {new Date(reason.submitted_at).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-8 text-center">
              <div className="text-gray-400 text-4xl mb-2">📝</div>
              <div className="text-sm text-gray-500">No absence reasons submitted yet</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AbsenceReasons;

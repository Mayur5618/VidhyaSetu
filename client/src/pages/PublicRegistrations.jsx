import React, { useState, useEffect } from 'react';
import { useAuth } from '../store/hooks';

const PublicRegistrations = () => {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [batches, setBatches] = useState([]);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    fetchRegistrations();
    fetchBatches();
  }, []);

  const fetchRegistrations = async () => {
    try {
      const response = await fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          query: `
            query GetPublicRegistrations($tuition_id: ID!) {
              publicRegistrations(tuition_id: $tuition_id) {
                id
                name
                phone
                standard
                batch_name
                total_fee
                fees_paid
                payment_mode
                status
                submitted_at
                whatsapp_group
                parent_name
                parent_phone
                notes
              }
            }
          `,
          variables: {
            tuition_id: user?.tuition_id
          }
        })
      });

      const data = await response.json();
      if (data.errors) {
        throw new Error(data.errors[0].message);
      }

      setRegistrations(data.data.publicRegistrations);
    } catch (error) {
      console.error('Error fetching registrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    const link = `http://localhost:4000/register/${user?.tuition_custom_id || 'TUI-001'}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopySuccess(true);
      // Hide success message after 3 seconds
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    }
  };

  const fetchBatches = async () => {
    try {
      const response = await fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          query: `
            query GetBatches($tuition_id: ID!) {
              batches(tuition_id: $tuition_id) {
                id
                name
                standard
              }
            }
          `,
          variables: {
            tuition_id: user?.tuition_id
          }
        })
      });

      const data = await response.json();
      if (data.errors) {
        throw new Error(data.errors[0].message);
      }

      setBatches(data.data.batches);
    } catch (error) {
      console.error('Error fetching batches:', error);
    }
  };

  const handleApprove = async (id, status, notes = '') => {
    try {
      const response = await fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          query: `
            mutation ApproveRegistration($id: ID!, $status: String!, $notes: String!) {
              approvePublicRegistration(id: $id, status: $status, notes: $notes) {
                id
                status
                notes
              }
            }
          `,
          variables: { id, status, notes }
        })
      });

      const data = await response.json();
      if (data.errors) {
        throw new Error(data.errors[0].message);
      }

      // Refresh registrations
      fetchRegistrations();
    } catch (error) {
      console.error('Error approving registration:', error);
      alert('Error: ' + error.message);
    }
  };

  const handleConvertToStudent = async (registrationId, batchId) => {
    try {
      const response = await fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          query: `
            mutation ConvertRegistration($registration_id: ID!, $batch_id: ID!) {
              convertRegistrationToStudent(registration_id: $registration_id, batch_id: $batch_id) {
                id
                name
                standard
              }
            }
          `,
          variables: { registration_id: registrationId, batch_id: batchId }
        })
      });

      const data = await response.json();
      if (data.errors) {
        throw new Error(data.errors[0].message);
      }

      alert('Student created successfully!');
      setShowModal(false);
      fetchRegistrations();
    } catch (error) {
      console.error('Error converting registration:', error);
      alert('Error: ' + error.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'converted': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0b0b0e] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Public Student Registrations
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage student registrations from public forms
          </p>
        </div>

        {/* Registration Link Section */}
        <div className="bg-white dark:bg-[#0e0e12] rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            📱 Share Registration Link
          </h2>
          <div className="flex items-center gap-4">
            <input
              type="text"
              readOnly
              value={`http://localhost:4000/register/${user?.tuition_id || 'TUI-001'}`}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
            <button
              onClick={handleCopyLink}
              className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 ${
                copySuccess 
                  ? 'bg-green-600 text-white cursor-default' 
                  : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105'
              }`}
              disabled={copySuccess}
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
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Share this link in your WhatsApp groups for students to register
          </p>
          
          {/* Success Message */}
          {copySuccess && (
            <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-800 dark:text-green-200 font-medium">
                ✅ Link copied successfully! You can now paste it anywhere.
              </span>
            </div>
          )}
        </div>

        {/* Registrations List */}
        <div className="bg-white dark:bg-[#0e0e12] rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Recent Registrations ({registrations.length})
            </h2>
          </div>

          {registrations.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 text-6xl mb-4">📝</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No registrations yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Share the registration link to start receiving student applications
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Class & Batch
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Fees
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-[#0e0e12] divide-y divide-gray-200 dark:divide-gray-800">
                  {registrations.map((registration) => (
                    <tr key={registration.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {registration.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {registration.phone}
                          </div>
                          {registration.parent_name && (
                            <div className="text-xs text-gray-400 dark:text-gray-500">
                              Parent: {registration.parent_name}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-100">
                          {registration.standard}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {registration.batch_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-100">
                          ₹{registration.total_fee}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Paid: ₹{registration.fees_paid}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          {registration.payment_mode}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(registration.status)}`}>
                          {registration.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(registration.submitted_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setSelectedRegistration(registration);
                              setShowModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            View
                          </button>
                          {registration.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(registration.id, 'approved')}
                                className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleApprove(registration.id, 'rejected')}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Registration Detail Modal */}
      {showModal && selectedRegistration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#0e0e12] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Registration Details
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{selectedRegistration.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{selectedRegistration.phone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Class</label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{selectedRegistration.standard}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Batch</label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{selectedRegistration.batch_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Total Fee</label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">₹{selectedRegistration.total_fee}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fees Paid</label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">₹{selectedRegistration.fees_paid}</p>
                  </div>
                </div>

                {selectedRegistration.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{selectedRegistration.notes}</p>
                  </div>
                )}

                {selectedRegistration.status === 'approved' && (
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                      Convert to Student
                    </h3>
                    <div className="flex gap-4">
                      <select
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        onChange={(e) => setSelectedRegistration({...selectedRegistration, selectedBatchId: e.target.value})}
                      >
                        <option value="">Select Batch</option>
                        {batches.map(batch => (
                          <option key={batch.id} value={batch.id}>
                            {batch.name} ({batch.standard})
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleConvertToStudent(selectedRegistration.id, selectedRegistration.selectedBatchId)}
                        disabled={!selectedRegistration.selectedBatchId}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Convert
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicRegistrations;


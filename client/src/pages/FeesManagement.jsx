import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/hooks';

const FeesManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [standards, setStandards] = useState([]);
  const [activeStandard, setActiveStandard] = useState(null);
  const [batches, setBatches] = useState([]);
  const [activeBatch, setActiveBatch] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tuitionData, setTuitionData] = useState(null);
  
  // Payment modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [paymentNote, setPaymentNote] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Link generation states
  const [generatedLink, setGeneratedLink] = useState('');
  const [showCopySuccess, setShowCopySuccess] = useState(false);

  useEffect(() => {
    if (user?.tuition_id) {
      fetchTuitionData();
      fetchStandards();
      generatePaymentLink();
    }
  }, [user]);

  const generatePaymentLink = () => {
    const baseUrl = window.location.origin.replace('3000', '4000');
    const link = `${baseUrl}/fee-payment/${user.tuition_id}`;
    setGeneratedLink(link);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 3000);
    } catch (error) {
      alert('Failed to copy link');
    }
  };

  const fetchTuitionData = async () => {
    try {
      const response = await fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          query: `
            query GetTuition($id: ID!) {
              tuition(id: $id) {
                id
                name
                fees_structure {
                  standard
                  total_fee
                }
              }
            }
          `,
          variables: { id: user.tuition_id }
        })
      });

      const data = await response.json();
      if (data.errors) throw new Error(data.errors[0].message);
      setTuitionData(data.data.tuition);
    } catch (error) {
      console.error('Error fetching tuition data:', error);
    }
  };

  const fetchStandards = async () => {
    try {
      const response = await fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          query: `
            query GetTuition($id: ID!) {
              tuition(id: $id) {
                standards_offered
              }
            }
          `,
          variables: { id: user.tuition_id }
        })
      });

      const data = await response.json();
      if (data.errors) throw new Error(data.errors[0].message);
      setStandards(data.data.tuition.standards_offered || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching standards:', error);
      setLoading(false);
    }
  };

  const loadBatches = async (standard) => {
    setActiveStandard(standard);
    setActiveBatch(null);
    setStudents([]);
    
    try {
      const response = await fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          query: `
            query GetBatches($tuition_id: ID!, $standard: String!) {
              batches(tuition_id: $tuition_id, standard: $standard) {
                id
                name
                standard
              }
            }
          `,
          variables: { tuition_id: user.tuition_id, standard }
        })
      });

      const data = await response.json();
      if (data.errors) throw new Error(data.errors[0].message);
      setBatches(data.data.batches || []);
    } catch (error) {
      console.error('Error fetching batches:', error);
    }
  };

  const loadStudents = async (batchId) => {
    setActiveBatch(batchId);
    
    try {
      const response = await fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          query: `
            query GetStudentsWithFees($tuition_id: ID!, $batch_id: ID!) {
              students(tuition_id: $tuition_id, batch_id: $batch_id) {
                id
                name
                standard
                batch_id
                fees_paid {
                  amount
                  mode
                  date
                  verified
                  note
                }
              }
            }
          `,
          variables: { tuition_id: user.tuition_id, batch_id: batchId }
        })
      });

      const data = await response.json();
      if (data.errors) throw new Error(data.errors[0].message);
      setStudents(data.data.students || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const getTotalFee = (standard) => {
    if (!tuitionData?.fees_structure) return 0;
    const feeStructure = tuitionData.fees_structure.find(f => f.standard === standard);
    return feeStructure ? feeStructure.total_fee : 0;
  };

  const getTotalPaid = (student) => {
    if (!student.fees_paid) return 0;
    return student.fees_paid.reduce((total, payment) => total + payment.amount, 0);
  };

  const getRemainingFee = (student) => {
    const totalFee = getTotalFee(student.standard);
    const totalPaid = getTotalPaid(student);
    return totalFee - totalPaid;
  };

  const openPaymentModal = (student) => {
    setSelectedStudent(student);
    setPaymentAmount('');
    setPaymentMode('cash');
    setPaymentNote('');
    setShowPaymentModal(true);
  };

  const submitPayment = async () => {
    if (!paymentAmount || !selectedStudent) return;
    
    setSubmittingPayment(true);
    try {
      const response = await fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          query: `
            mutation AddFeePayment($student_id: ID!, $tuition_id: ID!, $amount: Float!, $mode: String!, $date: String!, $note: String) {
              addFeePayment(
                student_id: $student_id
                tuition_id: $tuition_id
                amount: $amount
                mode: $mode
                date: $date
                note: $note
              ) {
                id
                amount
                mode
                date
                note
              }
            }
          `,
          variables: {
            student_id: selectedStudent.id,
            tuition_id: user.tuition_id,
            amount: parseFloat(paymentAmount),
            mode: paymentMode,
            date: new Date().toISOString(),
            note: paymentNote
          }
        })
      });

      const data = await response.json();
      if (data.errors) throw new Error(data.errors[0].message);
      
      // Refresh students list
      if (activeBatch) {
        loadStudents(activeBatch);
      }
      
      setShowPaymentModal(false);
      alert('Payment added successfully!');
    } catch (error) {
      console.error('Error adding payment:', error);
      alert('Error: ' + error.message);
    } finally {
      setSubmittingPayment(false);
    }
  };

  const getStatusColor = (remainingFee) => {
    if (remainingFee <= 0) return 'text-green-600 bg-green-100';
    if (remainingFee <= 1000) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatusText = (remainingFee) => {
    if (remainingFee <= 0) return 'Paid';
    if (remainingFee <= 1000) return 'Partial';
    return 'Pending';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0b0b0e]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-200"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0b0b0e] p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Fees Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage student fees, track payments, and monitor outstanding amounts
          </p>
        </div>

        {/* Public Payment Link */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Public Fee Payment Link</h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Share this link with students to allow them to submit fee payments online
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={generatedLink}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
            <button
              onClick={copyLink}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
              </svg>
              Copy Link
            </button>
          </div>
          
          {showCopySuccess && (
            <div className="mt-3 p-3 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Link copied successfully!
              </div>
            </div>
          )}
        </div>

        {/* Standards Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Classes</h2>
          <div className="flex flex-wrap gap-3">
            {standards.map((standard) => (
              <button
                key={standard}
                onClick={() => loadBatches(standard)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeStandard === standard
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Class {standard}
              </button>
            ))}
          </div>
        </div>

        {/* Batches Selection */}
        {activeStandard && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Batches - Class {activeStandard}
            </h2>
            <div className="flex flex-wrap gap-3">
              {batches.map((batch) => (
                <button
                  key={batch.id}
                  onClick={() => loadStudents(batch.id)}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    activeBatch === batch.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {batch.name}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Students List */}
        {students.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Students ({students.length})
              </h2>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total Fee: ₹{students.reduce((total, student) => total + getTotalFee(student.standard), 0).toLocaleString()}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Student</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Total Fee</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Paid</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Remaining</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const totalFee = getTotalFee(student.standard);
                    const totalPaid = getTotalPaid(student);
                    const remainingFee = getRemainingFee(student);
                    
                    return (
                      <tr key={student.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="py-4 px-4">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{student.name}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">Class {student.standard}</div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-gray-900 dark:text-white">
                          ₹{totalFee.toLocaleString()}
                        </td>
                        <td className="py-4 px-4 text-gray-900 dark:text-white">
                          ₹{totalPaid.toLocaleString()}
                        </td>
                        <td className="py-4 px-4 text-gray-900 dark:text-white">
                          ₹{remainingFee.toLocaleString()}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(remainingFee)}`}>
                            {getStatusText(remainingFee)}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <button
                            onClick={() => openPaymentModal(student)}
                            className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                          >
                            Add Payment
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Add Payment - {selectedStudent?.name}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter amount"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="cash">Cash</option>
                    <option value="online">Online</option>
                    <option value="cheque">Cheque</option>
                    <option value="card">Card</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Note (Optional)
                  </label>
                  <textarea
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    rows="3"
                    placeholder="Add any notes..."
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitPayment}
                  disabled={!paymentAmount || submittingPayment}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingPayment ? 'Adding...' : 'Add Payment'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeesManagement;

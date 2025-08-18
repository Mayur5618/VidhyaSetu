import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../store/hooks';

const Attendance = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const batchId = searchParams.get('batch');
  
  const [standards, setStandards] = useState([]);
  const [activeStandard, setActiveStandard] = useState(null);
  const [batches, setBatches] = useState([]);
  const [activeBatch, setActiveBatch] = useState(null);
  const [batch, setBatch] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [absenceReasons, setAbsenceReasons] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [selectedAbsenceReason, setSelectedAbsenceReason] = useState(null);

  useEffect(() => {
    if (batchId) {
      // If batchId is provided via URL, load that specific batch
      fetchBatchAndStudents();
      fetchExistingAttendance();
    } else {
      // Otherwise, load standards for hierarchical selection
      fetchStandards();
    }
  }, [batchId]);

  const fetchStandards = async () => {
    try {
      const res = await fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({
          query: `query GetTuition($id: ID!) { tuition(id: $id) { id standards_offered } }`,
          variables: { id: user.tuition_id }
        })
      });
      const data = await res.json();
      const list = data?.data?.tuition?.standards_offered || [];
      setStandards(list);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const fetchBatchAndStudents = async () => {
    try {
      // Fetch batch details
      const batchResponse = await fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          query: `
            query GetBatch($id: ID!) {
              batch(id: $id) {
                id
                name
                standard
                tuition_id
              }
            }
          `,
          variables: { id: batchId }
        })
      });

      const batchData = await batchResponse.json();
      if (batchData.errors) throw new Error(batchData.errors[0].message);
      setBatch(batchData.data.batch);

      // Fetch students in this batch
      const studentsResponse = await fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          query: `
            query GetStudents($tuition_id: ID!, $batch_id: ID!) {
              students(tuition_id: $tuition_id, batch_id: $batch_id) {
                id
                name
                standard
                batch_id
              }
            }
          `,
          variables: { 
            tuition_id: batchData.data.batch.tuition_id,
            batch_id: batchId
          }
        })
      });

      const studentsData = await studentsResponse.json();
      if (studentsData.errors) throw new Error(studentsData.errors[0].message);
      
      // Students are already filtered by batch_id from backend
      const batchStudents = studentsData.data.students;
      setStudents(batchStudents);
      
      // Initialize attendance state for each student
      const initialAttendance = {};
      batchStudents.forEach(student => {
        initialAttendance[student.id] = 'absent'; // Default to absent (cancel icon)
      });
      setAttendance(initialAttendance);
      
    } catch (error) {
      console.error('Error fetching batch and students:', error);
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadBatches = async (standard) => {
    setActiveStandard(standard);
    setActiveBatch(null);
    setStudents([]);
    setAttendance({});
    try {
      const res = await fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({
          query: `query GetBatches($tuition_id: ID!, $standard: String) { batches(tuition_id: $tuition_id, standard: $standard) { id name standard } }`,
          variables: { tuition_id: user.tuition_id, standard }
        })
      });
      const data = await res.json();
      setBatches(data?.data?.batches || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadStudents = async (batchId) => {
    setActiveBatch(batchId);
    try {
      const res = await fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({
          query: `query GetStudents($tuition_id: ID!, $batch_id: ID!) { students(tuition_id: $tuition_id, batch_id: $batch_id) { id name standard batch_id } }`,
          variables: { tuition_id: user.tuition_id, batch_id: batchId }
        })
      });
      const data = await res.json();
      const batchStudents = data?.data?.students || [];
      setStudents(batchStudents);
      
      // Initialize attendance state for each student
      const initialAttendance = {};
      batchStudents.forEach(student => {
        initialAttendance[student.id] = 'absent';
      });
      setAttendance(initialAttendance);
      
      // Fetch existing attendance for selected date
      fetchExistingAttendance(batchId);
      
      fetchAbsenceReasons(batchId);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchExistingAttendance = async (batchId, dateToFetch = null) => {
    if (!batchId) return;
    
    // Use the provided date or fall back to selectedDate
    const dateToUse = dateToFetch || selectedDate;
    
    try {
      console.log('Fetching attendance for batch:', batchId, 'date:', dateToUse);
      
      const response = await fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          query: `
            query GetAttendanceWithAbsenceReasons($batch_id: ID!, $date: String!) {
              getAttendanceWithAbsenceReasons(batch_id: $batch_id, date: $date) {
                id
                student_id
                status
                student {
                  id
                  name
                  standard
                }
                absenceReason {
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
            }
          `,
          variables: { batch_id: batchId, date: dateToUse }
        })
      });

      const data = await response.json();
      if (data.errors) throw new Error(data.errors[0].message);
      
      console.log('Attendance data received:', data.data.getAttendanceWithAbsenceReasons);
      
      // Update attendance state with existing data
      const existingAttendance = {};
      const absenceReasonsMap = {};
      
      data.data.getAttendanceWithAbsenceReasons.forEach(att => {
        existingAttendance[att.student_id] = att.status;
        
        // If there's an absence reason, store it
        if (att.absenceReason) {
          const studentIndex = students.findIndex(s => s.id === att.student_id);
          const rollNumber = (studentIndex + 1).toString();
          absenceReasonsMap[rollNumber] = att.absenceReason;
        }
      });
      
      console.log('Setting attendance state:', existingAttendance);
      console.log('Setting absence reasons:', absenceReasonsMap);
      
      setAttendance(prev => ({ ...prev, ...existingAttendance }));
      setAbsenceReasons(absenceReasonsMap);
    } catch (error) {
      console.error('Error fetching existing attendance:', error);
    }
  };

  const fetchAbsenceReasons = async (batchId, dateToFetch = null) => {
    if (!batchId) return;
    
    const dateToUse = dateToFetch || selectedDate;
    
    try {
      const response = await fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          query: `
            query GetAbsenceReasons($tuition_id: ID!, $batch_id: ID!, $date: String!) {
              absenceReasons(tuition_id: $tuition_id, batch_id: $batch_id, date: $date) {
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
            tuition_id: user.tuition_id, 
            batch_id: batchId, 
            date: dateToUse 
          }
        })
      });

      const data = await response.json();
      
      if (data.errors) {
        throw new Error(data.errors[0].message);
      }
      
      // Create a map using roll_number as key for easy lookup
      const reasonsMap = {};
      if (data.data?.absenceReasons) {
        data.data.absenceReasons.forEach(reason => {
          reasonsMap[reason.roll_number] = reason;
        });
      }
      
      setAbsenceReasons(reasonsMap);
    } catch (error) {
      console.error('Error fetching absence reasons:', error);
    }
  };

  const hasAbsenceReason = (student) => {
    const studentIndex = students.findIndex(s => s.id === student.id);
    const rollNumber = (studentIndex + 1).toString();
    return absenceReasons[rollNumber];
  };

  const toggleAttendance = (studentId) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'present' ? 'absent' : 'present'
    }));
  };

  const showAbsenceReason = (rollNumber) => {
    const reason = absenceReasons[rollNumber];
    if (reason) {
      setSelectedAbsenceReason(reason);
      setShowAbsenceModal(true);
    }
  };

  const saveAttendance = async () => {
    if (!activeBatch) return;
    
    setSaving(true);
    try {
      // Mark attendance for each student
      const promises = Object.entries(attendance).map(([studentId, status]) => 
        fetch('http://localhost:4000/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            query: `
              mutation MarkAttendance($date: String!, $batch_id: ID!, $student_id: ID!, $status: String!) {
                markAttendance(date: $date, batch_id: $batch_id, student_id: $student_id, status: $status) {
                  id
                  status
                }
              }
            `,
            variables: { 
              date: selectedDate, 
              batch_id: activeBatch, 
              student_id: studentId, 
              status 
            }
          })
        })
      );

      await Promise.all(promises);
      alert('Attendance saved successfully!');
      
    } catch (error) {
      console.error('Error saving attendance:', error);
      alert('Error saving attendance: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDateChange = async (newDate) => {
    setSelectedDate(newDate);
    
    // If a batch is active, fetch attendance for the new date
    if (activeBatch && students.length > 0) {
      // Clear existing attendance data immediately
      setAttendance({});
      
      // Initialize attendance state for each student as absent first
      const initialAttendance = {};
      students.forEach(student => {
        initialAttendance[student.id] = 'absent';
      });
      setAttendance(initialAttendance);
      
      // Then fetch existing attendance for the new date
      await fetchExistingAttendance(activeBatch, newDate);
      await fetchAbsenceReasons(activeBatch, newDate);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0b0b0e]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-200"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0b0b0e] p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100">Attendance Management</h1>
          <button onClick={() => navigate('/dashboard')} className="text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Back to Dashboard</span>
          </button>
        </div>

        {/* Date Selector */}
        <div className="bg-white dark:bg-[#0e0e12] rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100 dark:border-gray-800 mb-4 sm:mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Select Date</h2>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Standards */}
        <div className="bg-white dark:bg-[#0e0e12] rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100 dark:border-gray-800 mb-4 sm:mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Classes</h2>
          <div className="flex flex-wrap gap-2">
            {standards.length ? standards.map(std => (
              <button
                key={std}
                onClick={() => loadBatches(std)}
                className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${activeStandard === std ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              >
                Class {std}
              </button>
            )) : <span className="text-sm text-gray-500">No classes configured</span>}
          </div>
        </div>

        {/* Batches */}
        {activeStandard && (
          <div className="bg-white dark:bg-[#0e0e12] rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100 dark:border-gray-800 mb-4 sm:mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Batches - Class {activeStandard}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {batches.map(b => (
                <button 
                  key={b.id} 
                  onClick={() => loadStudents(b.id)} 
                  className={`w-full text-left p-4 rounded-xl transition-all border ${
                    activeBatch === b.id 
                      ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 shadow-md' 
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{b.name}</div>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                    </svg>
                  </div>
                </button>
              ))}
              {!batches.length && <div className="text-sm text-gray-500 col-span-full">No batches found</div>}
            </div>
          </div>
        )}

        {/* Students Attendance */}
        {activeBatch && students.length > 0 && (
          <div className="bg-white dark:bg-[#0e0e12] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Students ({students.length}) - {new Date(selectedDate).toLocaleDateString('en-IN')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Tap to toggle attendance status. Click the info icon (ℹ️) to view absence reasons.
              </p>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {students.map((student, index) => (
                <div key={student.id} className="px-4 sm:px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-sm font-medium text-blue-600 dark:text-blue-400">
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {student.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        Roll No: {index + 1}
                        {hasAbsenceReason(student) && (
                          <span className="ml-2 text-blue-600 dark:text-blue-400">
                            • Has absence reason
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      // Check if this student has an absence reason for today
                      const absenceReason = hasAbsenceReason(student);
                      
                      if (absenceReason) {
                        showAbsenceReason(absenceReason.roll_number);
                      } else {
                        toggleAttendance(student.id);
                      }
                    }}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm ${
                      attendance[student.id] === 'present' 
                        ? 'bg-green-100 hover:bg-green-200 shadow-green-200' 
                        : hasAbsenceReason(student)
                        ? 'bg-blue-100 hover:bg-blue-200 shadow-blue-200'
                        : 'bg-red-100 hover:bg-red-200 shadow-red-200'
                    }`}
                  >
                    {attendance[student.id] === 'present' ? (
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : hasAbsenceReason(student) ? (
                      <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </button>
                </div>
              ))}
            </div>

            {/* Save Button */}
            <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-800">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={saveAttendance}
                  disabled={saving}
                  className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Attendance'}
                </button>
                
                {/* Summary */}
                <div className="flex-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-800 dark:text-blue-200 font-medium">
                      Present: {Object.values(attendance).filter(status => status === 'present').length}
                    </span>
                    <span className="text-blue-800 dark:text-blue-200 font-medium">
                      Absent: {Object.values(attendance).filter(status => status === 'absent').length}
                    </span>
                    <span className="text-blue-800 dark:text-blue-200 font-medium">
                      Total: {students.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {activeBatch && students.length === 0 && (
          <div className="bg-white dark:bg-[#0e0e12] rounded-xl shadow-sm p-8 text-center border border-gray-200 dark:border-gray-800">
            <div className="text-gray-400 text-4xl mb-2">📝</div>
            <div className="text-sm text-gray-500">No students found in this batch</div>
          </div>
        )}

        {/* Absence Reason Modal */}
        {showAbsenceModal && selectedAbsenceReason && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Absence Reason
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedAbsenceReason.student_name} (Roll: {selectedAbsenceReason.roll_number})
                  </p>
                </div>
              </div>
              
              <div className="mb-4">
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  <strong>Reason:</strong>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded border text-sm text-gray-700 dark:text-gray-200">
                  {selectedAbsenceReason.reason}
                </div>
              </div>

              <button
                onClick={() => setShowAbsenceModal(false)}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Attendance;



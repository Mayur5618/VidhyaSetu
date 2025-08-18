import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/hooks';

const StudentManagement = () => {
  const navigate = useNavigate();
  const { tuitionId } = useAuth();

  const [standards, setStandards] = useState([]);
  const [activeStandard, setActiveStandard] = useState(null);
  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tuitionId) return;
    fetchStandards();
  }, [tuitionId]);

  const fetchStandards = async () => {
    try {
      // Pull tuition to read standards_offered
      const res = await fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({
          query: `query GetTuition($id: ID!) { tuition(id: $id) { id standards_offered } }`,
          variables: { id: tuitionId }
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

  const loadBatches = async (standard) => {
    setActiveStandard(standard);
    setStudents([]);
    try {
      const res = await fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({
          query: `query GetBatches($tuition_id: ID!, $standard: String) { batches(tuition_id: $tuition_id, standard: $standard) { id name standard } }`,
          variables: { tuition_id: tuitionId, standard }
        })
      });
      const data = await res.json();
      setBatches(data?.data?.batches || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadStudents = async (batchId) => {
    try {
      const res = await fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({
          query: `query GetStudents($tuition_id: ID!, $batch_id: ID) { students(tuition_id: $tuition_id, batch_id: $batch_id) { id name standard batch_id } }`,
          variables: { tuition_id: tuitionId, batch_id: batchId }
        })
      });
      const data = await res.json();
      setStudents(data?.data?.students || []);
    } catch (e) {
      console.error(e);
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
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100">Student Management</h1>
          <button onClick={() => navigate('/dashboard')} className="text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Back to Dashboard</span>
          </button>
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
                  className="w-full text-left p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-700 hover:shadow-md"
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

        {/* Students */}
        {activeStandard && (
          <div className="bg-white dark:bg-[#0e0e12] rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Students ({students.length})</h2>
            <div className="space-y-2">
              {students.map((s, idx) => (
                <div key={s.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-sm font-medium text-blue-600 dark:text-blue-400">
                      {idx+1}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.name}</div>
                      <div className="text-xs text-gray-500">Class {s.standard}</div>
                    </div>
                  </div>
                  <button 
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors" 
                    onClick={() => navigate(`/student/${s.id}`)}
                  >
                    View
                  </button>
                </div>
              ))}
              {!students.length && (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-2">👥</div>
                  <div className="text-sm text-gray-500">Select a batch to view students</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentManagement;



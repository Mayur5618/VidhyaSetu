import React from 'react';
import { useNavigate } from 'react-router-dom';

const PostSetupChoice = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-white dark:bg-[#0b0b0e] px-4">
      <div className="w-full max-w-md bg-white dark:bg-[#0e0e12] rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 px-6 py-8">
        <h2 className="text-2xl font-bold text-center mb-2 text-black dark:text-gray-100">Import Existing Data?</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 text-center mb-6">If you have a backup, you can import it now. Otherwise, skip and go to dashboard.</p>
        <div className="space-y-3">
          <button
            onClick={() => navigate('/import-data')}
            className="w-full bg-purple-600 text-white py-2 rounded-lg font-semibold hover:bg-purple-700"
          >
            Import from Backup
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 py-2 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostSetupChoice;




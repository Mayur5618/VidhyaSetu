import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/hooks';

const RoleSelection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedOption, setSelectedOption] = useState('');
  const [showImportOption, setShowImportOption] = useState(false);

  const handleOptionSelect = (option) => {
    setSelectedOption(option);
    
    switch (option) {
      case 'new-tuition':
        navigate('/setup-tuition');
        break;
      case 'existing-tuition':
        navigate('/tuition-login');
        break;
      case 'import-data':
        setShowImportOption(true);
        break;
      default:
        break;
    }
  };

  const handleImportData = () => {
    navigate('/import-data');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to VidhyaSetu</h1>
          <p className="text-gray-600">Hello, {user?.name || 'User'}! What would you like to do?</p>
        </div>

        {/* Options */}
        <div className="space-y-4">
          {/* New Tuition Option */}
          <div 
            className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${
              selectedOption === 'new-tuition' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleOptionSelect('new-tuition')}
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Create New Tuition</h3>
                <p className="text-sm text-gray-600">Start a new tuition center from scratch</p>
              </div>
            </div>
          </div>

          {/* Existing Tuition Option */}
          <div 
            className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${
              selectedOption === 'existing-tuition' 
                ? 'border-green-500 bg-green-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleOptionSelect('existing-tuition')}
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Join Existing Tuition</h3>
                <p className="text-sm text-gray-600">Login to an existing tuition center</p>
              </div>
            </div>
          </div>

          {/* Import Data Option */}
          <div 
            className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${
              selectedOption === 'import-data' 
                ? 'border-purple-500 bg-purple-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleOptionSelect('import-data')}
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Import Existing Data</h3>
                <p className="text-sm text-gray-600">Restore your data from backup file</p>
              </div>
            </div>
          </div>
        </div>

        {/* Import Data Modal */}
        {showImportOption && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Import Your Data</h3>
              <p className="text-gray-600 mb-6">
                If you've used this platform before, you can import your existing data from a backup file. 
                This will restore all your students, fees, attendance, and other records.
              </p>
              
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm text-gray-600 mb-2">Upload your backup ZIP file</p>
                  <p className="text-xs text-gray-500">Maximum file size: 10MB</p>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={handleImportData}
                    className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition"
                  >
                    Import Data
                  </button>
                  <button
                    onClick={() => setShowImportOption(false)}
                    className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Back to Login */}
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection; 
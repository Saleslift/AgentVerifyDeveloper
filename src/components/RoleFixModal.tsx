import React, { useState } from 'react';
import Modal from './Modal';
import { supabase } from '../utils/supabase';

interface RoleFixModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSuccess: () => void;
}

const RoleFixModal: React.FC<RoleFixModalProps> = ({ isOpen, onClose, userId, onSuccess }) => {
  const [isFixing, setIsFixing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFixRole = async () => {
    setIsFixing(true);
    setError(null);
    
    try {
      // Update the user's role in the profiles table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'developer' })
        .eq('id', userId);
      
      if (updateError) throw updateError;
      
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Error fixing role:', err);
      setError('Failed to fix role. Please try again or contact support.');
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Fix Role Mismatch">
      <div className="p-6">
        {!success ? (
          <>
            <p className="mb-4 text-gray-700">
              Your account was created as a developer but is currently set as an agent in our database.
              This can cause issues with accessing the correct dashboard.
            </p>
            <p className="mb-6 text-gray-700">
              Click the button below to automatically fix your role.
            </p>
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
                {error}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={isFixing}
              >
                Cancel
              </button>
              <button
                onClick={handleFixRole}
                className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-70"
                disabled={isFixing}
              >
                {isFixing ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Fixing...
                  </span>
                ) : (
                  'Fix Role'
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center">
            <div className="mb-4 mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-green-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-900">Role fixed successfully!</p>
            <p className="mt-2 text-sm text-gray-500">Redirecting you to the developer dashboard...</p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default RoleFixModal;
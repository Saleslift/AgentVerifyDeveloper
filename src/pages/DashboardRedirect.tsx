import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useRoleAuth } from '../hooks/useRoleAuth';
import { verifyUserRole } from '../utils/roleUtils';
import RoleFixModal from '../components/RoleFixModal';

export default function DashboardRedirect() {
  const { role, loading, debugRoleInfo } = useRoleAuth();
  const { user } = useAuth();
  const [showRoleFixModal, setShowRoleFixModal] = React.useState(false);
  const [roleMismatch, setRoleMismatch] = React.useState(false);

  // Check for role mismatch
  React.useEffect(() => {
    if (user && !loading) {
      verifyUserRole(user.id).then(result => {
        console.log('Role verification result:', result);
        // Check for any role mismatch where metadata says developer
        if (result.metadata_role === 'developer' && result.profile_role !== 'developer') {
          console.log('Role mismatch detected: metadata=developer, profile=agent');
          setRoleMismatch(true);
          setShowRoleFixModal(true);
        }
      });
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-300"></div>
      </div>
    );
  }

  // Show role fix modal if there's a mismatch
  if (roleMismatch && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Role Mismatch Detected</h2>
          <p className="text-gray-600 mb-6">
            Your account was created as a developer but is currently set as an agent.
            This can be fixed automatically.
          </p>
          <button
            onClick={() => setShowRoleFixModal(true)}
            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900"
          >
            Fix My Role
          </button>
          
          <RoleFixModal 
            isOpen={showRoleFixModal}
            onClose={() => setShowRoleFixModal(false)}
            userId={user.id}
            onSuccess={() => window.location.reload()}
          />
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect to signin if not logged in
    return <Navigate to="/signin" />;
  }

  // Only set navigation flag when we have a valid role and are ready to redirect
  if (role) {
    // Set flag to allow navigation
    sessionStorage.setItem('intentional_navigation', 'true');

    // Return to developer dashboard
    return <Navigate to="/developer-dashboard" replace />;
  }

  // If we get here, we have a user but no role yet - show loading state
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-300 mb-4"></div>
      <p className="text-gray-600">Loading your profile...</p>
    </div>
  );
}
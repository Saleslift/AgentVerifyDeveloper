import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import { useRoleAuth } from '../hooks/useRoleAuth';
import AgentPropertyForm from '../components/agent/AgentPropertyForm';
import DeveloperPropertyForm from '../components/developer/DeveloperPropertyForm';

export default function AddPropertyPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { role, loading } = useRoleAuth();

  if (!user) {
    navigate('/signin');
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-300"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6">
            {(role === 'agent' || role === 'agency') && (
              <AgentPropertyForm 
                agentId={user.id}
                onSuccess={() => navigate('/dashboard')}
              />
            )}
            {role === 'developer' && (
              <DeveloperPropertyForm 
                developerId={user.id}
                onSuccess={() => navigate('/dashboard')}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
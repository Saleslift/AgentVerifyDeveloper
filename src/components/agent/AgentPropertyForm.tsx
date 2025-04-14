import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import PropertyForm from '../PropertyForm';

interface AgentPropertyFormProps {
  agentId: string;
  onSuccess?: () => void;
}

export default function AgentPropertyForm({ agentId, onSuccess }: AgentPropertyFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (formData: any) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Create property with agent as the creator
      const { data, error } = await supabase
        .from('properties')
        .insert([{
          ...formData,
          agent_id: agentId,
          creator_id: agentId,
          creator_type: 'agent',
        }])
        .select()
        .single();

      if (error) throw error;

      if (onSuccess) {
        onSuccess();
      } else {
        navigate(`/property/${data.id}`);
      }
    } catch (err: any) {
      console.error('Error creating property:', err);
      setError(err.message || 'Failed to create property');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Add New Property</h2>
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg">
          {error}
        </div>
      )}
      
      <PropertyForm 
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
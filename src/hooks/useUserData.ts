import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase';

export function useUserData() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState(null);
  const [properties, setProperties] = useState([]);
  const fetchAttempted = useRef(false);
  const abortController = useRef<AbortController | null>(null);
  const retryCount = useRef(0);
  const MAX_RETRIES = 3;

  // Fetch user data
  const fetchUserData = useCallback(async () => {
    // Skip if we've already attempted a fetch and user hasn't changed
    if (fetchAttempted.current && !user?.id) {
      setLoading(false);
      return;
    }

    // Mark that we've attempted a fetch
    fetchAttempted.current = true;

    if (!user?.id) {
      setLoading(false);
      return;
    }

    // Cancel any in-progress fetch
    if (abortController.current) {
      abortController.current.abort();
    }
    
    // Create a new abort controller for this fetch
    abortController.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      // Get profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (abortController.current.signal.aborted) return;

      if (profileError) {
        throw profileError;
      }

      // Update states
      setProfile(profileData);
      
      // Get developer properties
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select(`
          id,
          title,
          description,
          type,
          contract_type,
          price,
          location,
          images,
          created_at,
          updated_at
        `)
        .eq('creator_type', 'developer')
        .eq('creator_id', user.id);

      if (abortController.current.signal.aborted) return;

      if (propertiesError) {
        throw propertiesError;
      }

      const transformedProperties = (propertiesData || []).map(p => ({
        ...p,
        contractType: p.contract_type,
        source: 'direct'
      }));

      setProperties(transformedProperties);
      setError(null);
      
      // Reset retry count on success
      retryCount.current = 0;
      
    } catch (err) {
      console.error('Error fetching user data:', err);
      
      // Increment retry count
      retryCount.current++;
      
      // If we haven't exceeded max retries, try again after a delay
      if (retryCount.current < MAX_RETRIES) {
        setTimeout(() => {
          fetchUserData();
        }, 1000 * Math.pow(2, retryCount.current - 1));
        return;
      }
      
      setError(err instanceof Error ? err.message : 'Failed to load user data');
    } finally {
      if (!abortController.current?.signal.aborted) {
        setLoading(false);
      }
    }
  }, [user?.id]);

  // Initial fetch
  useEffect(() => {
    fetchUserData();

    // Clean up abort controller on unmount
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, [fetchUserData]);

  return {
    loading,
    error,
    profile,
    properties,
    refresh: fetchUserData
  };
}
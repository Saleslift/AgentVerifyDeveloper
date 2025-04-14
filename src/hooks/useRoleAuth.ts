import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase';

type UserRole = 'agent' | 'agency' | 'developer';

export function useRoleAuth() {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchAttempted = useRef<boolean>(false);
  const retryCount = useRef(0);
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // 1 second
  const abortController = useRef<AbortController | null>(null);

  // Debug function to help diagnose role issues
  const debugRoleInfo = async () => {
    if (!user) return { error: 'No user logged in' };
    
    try {
      // Get user metadata
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      
      // Get profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      return {
        userId: user.id,
        email: user.email,
        metadataRole: currentUser?.user_metadata?.role,
        profileExists: !!profile,
        profileRole: profile?.role,
        error: profileError ? profileError.message : null
      };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Unknown error' };
    }
  };

  useEffect(() => {
    let mounted = true;
    let retryTimer: NodeJS.Timeout | null = null;

    async function fetchRole() {
      // Skip if we've already attempted a fetch and user hasn't changed
      if (fetchAttempted.current && !user) {
        if (mounted) {
          setRole(null);
          setLoading(false);
        }
        return;
      }

      // Mark that we've attempted a fetch
      fetchAttempted.current = true;

      if (!user) {
        if (mounted) {
          setRole(null);
          setLoading(false);
        }
        return;
      }

      // Cancel any in-progress fetch
      if (abortController.current) {
        abortController.current.abort();
      }
      
      // Create a new abort controller for this fetch
      abortController.current = new AbortController();

      try {
        setError(null);

        // First check if role is in user metadata
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
        
        if (userError) throw userError;
        
        const userRole = currentUser?.user_metadata?.role as UserRole | undefined;
        
        if (userRole && ['agent', 'agency', 'developer'].includes(userRole)) {
          if (mounted) {
            setRole(userRole);
            localStorage.setItem('user_role', userRole);
            setLoading(false);
          }
          return;
        }

        // Try to get existing profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (abortController.current.signal.aborted) return;

        if (profileError) {
          if (profileError.message?.includes('Failed to fetch')) {
            throw new Error('Network error. Please check your internet connection.');
          }
          throw profileError;
        }

        // If no profile exists and we haven't exceeded retries, wait and retry
        if (!profileData && retryCount.current < MAX_RETRIES) {
          retryCount.current++;
          const delay = RETRY_DELAY * Math.pow(2, retryCount.current - 1);
          retryTimer = setTimeout(() => {
            if (mounted) fetchRole();
          }, delay);
          return;
        }

        // Reset retry count on success
        retryCount.current = 0;

        if (!profileData) {
          // Create a default profile if none exists
          const { error: insertError } = await supabase
            .from('profiles')
            .insert([{
              id: user.id,
              email: user.email || '',
              role: 'developer', // Default role - changed to developer
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }]);
            
          if (insertError) throw insertError;
          
          if (mounted) {
            setRole('developer');
            localStorage.setItem('user_role', 'developer');
            setError(null);
            setLoading(false);
          }
          return;
        }

        if (mounted) {
          const userRole = profileData.role as UserRole;
          setRole(userRole);
          localStorage.setItem('user_role', userRole);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching user role:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load user role');
          
          // Try to get role from localStorage as fallback
          const savedRole = localStorage.getItem('user_role') as UserRole | null;
          if (savedRole && ['agent', 'agency', 'developer'].includes(savedRole)) {
            setRole(savedRole);
          }
          
          setLoading(false);
        }
      }
    }

    fetchRole();

    return () => {
      mounted = false;
      if (retryTimer) clearTimeout(retryTimer);
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, [user]);

  return { role, loading, error, debugRoleInfo };
}
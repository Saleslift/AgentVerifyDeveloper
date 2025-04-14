import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable');
}

// Create Supabase client with enhanced configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'agent-verify-auth',
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    fetch: async (...args) => {
      // Check for network connectivity
      if (!navigator.onLine) {
        const networkError = new Error('No internet connection detected. Please check your network connection and try again.');
        networkError.name = 'NetworkError';
        throw networkError;
      }
      
      try {
        const response = await fetch(...args);
        
        // Log any potential API errors for debugging
        if (!response.ok) {
          console.error(`Supabase API Error: ${response.status} ${response.statusText}`);
        }
        
        return response;
      } catch (error) {
        // Enhance error with more details for network errors
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          const enhancedError = new Error('Network connection error. Unable to reach Supabase API.');
          enhancedError.name = 'NetworkError';
          console.error('Enhanced network error:', enhancedError);
          throw enhancedError;
        }
        
        // Re-throw other errors
        throw error;
      }
    },
    headers: {
      'X-Client-Info': 'agent-verify',
      'X-Client-Version': '1.0.0'
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});
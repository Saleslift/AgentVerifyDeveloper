import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from './AuthContext';

interface DeveloperDetails {
  company_name?: string;
  company_address?: string;
  headquarters_address?: string;
  hq_lat?: number | null;
  hq_lng?: number | null;
  registered_name?: string;
  founded_date?: string;
  sales_email?: string;
  sales_phone?: string;
  vision_mission?: string;
  years_experience?: number;
  projects_uae?: number;
  units_uae?: number;
  projects_outside?: number;
  units_outside?: number;
  target_markets?: string[];
  media_images?: Array<{ type: 'upload' | 'link'; src: string }>;
  media_videos?: Array<{ type: 'upload' | 'link'; src: string }>;
  company_brochure?: { type: 'upload' | 'link'; src: string } | null;
  video_presentation?: { type: 'upload' | 'link'; src: string } | null;
  sales_agreement?: { type: 'upload' | 'link'; src: string } | null;
  commission_document?: { type: 'upload' | 'link'; src: string } | null;
  is_dld_registered?: boolean;
  is_trusted_agency_partner?: boolean;
  is_multicountry_active?: boolean;
  agent_commission?: number;
  payment_timeline?: string;
  commission_requirements?: string;
  contract_validity_start?: string;
  contract_validity_end?: string;
  eligibility_info?: string;
  registration_documents?: string;
  minimum_sales?: number;
  social_links?: {
    instagram?: string;
    linkedin?: string;
    youtube?: string;
    facebook?: string;
    twitter?: string;
  };
}

interface DeveloperProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  introduction?: string;
  whatsapp?: string;
  agency_website?: string;
  role: 'developer';
  developer_details?: DeveloperDetails;
  slug?: string;
}

interface DeveloperProfileContextType {
  profile: DeveloperProfile | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateProfile: (updates: Partial<DeveloperProfile>) => Promise<void>;
  updateDeveloperDetails: (details: Partial<DeveloperDetails>) => Promise<void>;
}

const DeveloperProfileContext = createContext<DeveloperProfileContextType | undefined>(undefined);

export function DeveloperProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<DeveloperProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchProfile = async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Ensure the role is developer
      if (data.role !== 'developer') {
        // Attempt to update the role to developer
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ role: 'developer' })
          .eq('id', user.id);
        
        if (updateError) {
          console.error('Failed to update role to developer:', updateError);
          throw new Error('Your account is not set up as a developer. Please contact support.');
        }
        
        // Update the data with developer role
        data.role = 'developer';
      }
      
      setProfile(data as DeveloperProfile);
    } catch (err) {
      console.error('Error fetching developer profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load developer profile');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchProfile();
  }, [user]);
  
  const updateProfile = async (updates: Partial<DeveloperProfile>) => {
    if (!profile) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);
      
      if (error) throw error;
      
      // Update local state
      setProfile(prev => prev ? { ...prev, ...updates } : null);
    } catch (err) {
      console.error('Error updating developer profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  const updateDeveloperDetails = async (details: Partial<DeveloperDetails>) => {
    if (!profile) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Merge with existing details
      const updatedDetails = {
        ...(profile.developer_details || {}),
        ...details
      };
      
      const { error } = await supabase
        .from('profiles')
        .update({
          developer_details: updatedDetails,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);
      
      if (error) throw error;
      
      // Update local state
      setProfile(prev => 
        prev ? { 
          ...prev, 
          developer_details: {
            ...(prev.developer_details || {}),
            ...details
          }
        } : null
      );
    } catch (err) {
      console.error('Error updating developer details:', err);
      setError(err instanceof Error ? err.message : 'Failed to update developer details');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <DeveloperProfileContext.Provider 
      value={{ 
        profile, 
        loading, 
        error, 
        refresh: fetchProfile, 
        updateProfile,
        updateDeveloperDetails
      }}
    >
      {children}
    </DeveloperProfileContext.Provider>
  );
}

export function useDeveloperProfile() {
  const context = useContext(DeveloperProfileContext);
  if (context === undefined) {
    throw new Error('useDeveloperProfile must be used within a DeveloperProfileProvider');
  }
  return context;
}
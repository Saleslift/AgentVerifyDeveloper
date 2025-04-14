import { supabase } from './supabase';

/**
 * Utility function to fix a user's role to developer
 * This can be used to manually fix users who were incorrectly assigned as agents
 */
export async function fixUserRoleToDeveloper(userId: string): Promise<boolean> {
  try {
    console.log('Attempting to fix user role to developer for:', userId);
    
    // Get user metadata
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Error getting user:', userError);
      return false;
    }
    
    // Update profile with developer role and details
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (profileError) {
      console.error('Error getting profile:', profileError);
      return false;
    }
    
    // Create developer_details object with existing data if available
    const developerDetails = {
      company_name: user.user_metadata?.developerCompanyName || profile?.full_name || user.email,
      company_address: user.user_metadata?.developerCompanyAddress || profile?.location || 'Dubai, UAE',
      phone: user.user_metadata?.developerPhone || '',
      whatsapp: user.user_metadata?.developerWhatsapp || user.user_metadata?.developerPhone || '',
      email: user.email
    };
    
    // Update profile with developer role and details
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        role: 'developer',
        developer_details: developerDetails,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    if (updateError) {
      console.error('Error updating profile:', updateError);
      return false;
    }
    
    // Generate slug if needed
    const { error: slugError } = await supabase.rpc('generate_developer_slug', { user_id: userId });
    if (slugError) {
      console.warn('Error generating slug:', slugError);
      // Non-critical error, continue
    }
    
    console.log('Successfully updated user role to developer');
    return true;
  } catch (error) {
    console.error('Exception in fixUserRoleToDeveloper:', error);
    return false;
  }
}

/**
 * Utility function to verify a user's role
 * This can be used to check if a user has the correct role
 */
export async function verifyUserRole(userId: string): Promise<{
  role: string | null;
  metadata_role: string | null;
  profile_role: string | null;
  mismatch: boolean;
}> {
  try {
    // Get user metadata
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Error getting user:', {
        message: userError.message,
        status: userError.status
      });
      throw new Error(`Authentication error: ${userError.message}`);
    }
    
    if (!user) {
      throw new Error('No authenticated user found');
    }
    
    // Get profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    
    if (profileError) {
      console.error('Error getting profile:', {
        message: profileError.message,
        code: profileError.code,
        details: profileError.details
      });
      
      return { 
        role: user.user_metadata?.role || null, 
        metadata_role: user.user_metadata?.role || null, 
        profile_role: null, 
        mismatch: true 
      };
    }
    
    const metadata_role = user.user_metadata?.role || null;
    const profile_role = profile?.role || null;
    const mismatch = metadata_role !== profile_role;
    
    return {
      role: profile_role || metadata_role,
      metadata_role,
      profile_role,
      mismatch
    };
  } catch (error) {
    console.error('Exception in verifyUserRole:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}
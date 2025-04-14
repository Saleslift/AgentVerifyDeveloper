// Edge function for updating project via API
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'PUT, OPTIONS'
};

interface UpdateProjectPayload {
  title?: string;
  description?: string;
  location?: string;
  price?: number;
  payment_plan?: string;
  handover_date?: string;
  status?: string;
  amenities?: string[];
  media_images?: Array<{ type: 'upload' | 'link', src: string }>;
  media_videos?: Array<{ type: 'upload' | 'link', src: string }>;
  floor_plan?: { type: 'upload' | 'link', src: string } | null;
  brochure?: { type: 'upload' | 'link', src: string } | null;
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Only allow PUT requests
    if (req.method !== 'PUT') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get API token from headers
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid API token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Missing API token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get project ID from URL path
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/');
    const projectId = pathSegments[pathSegments.length - 1];

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: 'Missing project ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find developer by API token
    const { data: developer, error: developerError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('api_token', token)
      .eq('role', 'developer')
      .single();

    if (developerError || !developer) {
      return new Response(
        JSON.stringify({ error: 'Invalid API token or not a developer' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if project exists and belongs to the developer
    const { data: existingProject, error: projectError } = await supabase
      .from('properties')
      .select('id, creator_id')
      .eq('id', projectId)
      .eq('creator_id', developer.id)
      .eq('creator_type', 'developer')
      .single();

    if (projectError || !existingProject) {
      return new Response(
        JSON.stringify({ error: 'Project not found or you do not have permission to update it' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const requestData: UpdateProjectPayload = await req.json();

    // Check if project can be validated
    let shouldValidate = false;
    if (requestData.status === 'validated') {
      // Check validation requirements
      const { data: projectWithMedia, error: mediaError } = await supabase
        .from('properties')
        .select('media_images, media_videos, floor_plan, brochure')
        .eq('id', projectId)
        .single();
      
      if (!mediaError && projectWithMedia) {
        // Combine existing media with updates
        const combinedImages = [...(projectWithMedia.media_images || []), ...(requestData.media_images || [])];
        const combinedFloorPlan = requestData.floor_plan || projectWithMedia.floor_plan;
        const combinedBrochure = requestData.brochure || projectWithMedia.brochure;
        
        // Check if meets validation criteria
        const hasRequiredImages = combinedImages.length >= 5;
        const hasFloorPlanOrBrochure = combinedFloorPlan || combinedBrochure;
        
        if (hasRequiredImages && hasFloorPlanOrBrochure) {
          shouldValidate = true;
        } else {
          // Can't validate, reset status to draft
          requestData.status = 'draft';
        }
      }
    }

    // Prepare update data
    const updateData: any = {};
    
    // Only include fields that are provided
    if (requestData.title !== undefined) updateData.title = requestData.title;
    if (requestData.description !== undefined) updateData.description = requestData.description;
    if (requestData.location !== undefined) updateData.location = requestData.location;
    if (requestData.price !== undefined) updateData.price = requestData.price;
    if (requestData.payment_plan !== undefined) updateData.payment_plan = requestData.payment_plan;
    if (requestData.handover_date !== undefined) updateData.handover_date = requestData.handover_date;
    if (requestData.status !== undefined) updateData.status = shouldValidate ? 'validated' : requestData.status;
    if (requestData.amenities !== undefined) updateData.amenities = requestData.amenities;
    
    // Handle media arrays by appending to existing arrays
    if (requestData.media_images) {
      updateData.media_images = supabase.sql`coalesce(media_images, '[]'::jsonb) || ${JSON.stringify(requestData.media_images)}::jsonb`;
    }
    
    if (requestData.media_videos) {
      updateData.media_videos = supabase.sql`coalesce(media_videos, '[]'::jsonb) || ${JSON.stringify(requestData.media_videos)}::jsonb`;
    }
    
    // Direct replacements for single media items
    if (requestData.floor_plan !== undefined) updateData.floor_plan = requestData.floor_plan;
    if (requestData.brochure !== undefined) updateData.brochure = requestData.brochure;
    
    // Add updated_at timestamp
    updateData.updated_at = new Date().toISOString();

    // Update the project
    const { data: updatedProject, error: updateError } = await supabase
      .from('properties')
      .update(updateData)
      .eq('id', projectId)
      .select()
      .single();

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Failed to update project', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: { 
          id: updatedProject.id,
          title: updatedProject.title,
          status: updatedProject.status
        } 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Error processing request:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
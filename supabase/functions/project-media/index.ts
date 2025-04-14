// Edge function for handling project media uploads
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
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
    const projectId = pathSegments[pathSegments.length - 2]; // Format: /project-media/PROJECT_ID

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

    // Parse request body as form data for file upload or JSON for URL
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await req.formData();
      const mediaType = formData.get('media_type')?.toString();
      const file = formData.get('file') as File;
      
      if (!mediaType || !file) {
        return new Response(
          JSON.stringify({ error: 'Missing media_type or file' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Validate media type
      if (!['image', 'video', 'brochure', 'floor_plan'].includes(mediaType)) {
        return new Response(
          JSON.stringify({ error: 'Invalid media_type. Must be one of: image, video, brochure, floor_plan' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Validate file type based on media_type
      const fileType = file.type;
      
      if (mediaType === 'image' && !fileType.startsWith('image/')) {
        return new Response(
          JSON.stringify({ error: 'File must be an image' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (mediaType === 'video' && !fileType.startsWith('video/')) {
        return new Response(
          JSON.stringify({ error: 'File must be a video' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (mediaType === 'brochure' && fileType !== 'application/pdf') {
        return new Response(
          JSON.stringify({ error: 'Brochure must be a PDF file' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (mediaType === 'floor_plan' && !fileType.startsWith('image/')) {
        return new Response(
          JSON.stringify({ error: 'Floor plan must be an image' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Upload file to storage
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${developer.id}/${mediaType}s/${projectId}/${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('properties')
        .upload(fileName, file, {
          contentType: fileType,
          upsert: false
        });
      
      if (uploadError) {
        return new Response(
          JSON.stringify({ error: 'Failed to upload file', details: uploadError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('properties')
        .getPublicUrl(fileName);
      
      // Update project with new media
      let updateData: any = {};
      
      if (mediaType === 'image') {
        // Add to media_images array
        updateData = {
          media_images: supabase.sql`coalesce(media_images, '[]'::jsonb) || ${JSON.stringify([{
            type: 'upload',
            src: publicUrl
          }])}::jsonb`
        };
      } else if (mediaType === 'video') {
        // Add to media_videos array
        updateData = {
          media_videos: supabase.sql`coalesce(media_videos, '[]'::jsonb) || ${JSON.stringify([{
            type: 'upload',
            src: publicUrl
          }])}::jsonb`
        };
      } else if (mediaType === 'brochure') {
        // Set brochure object
        updateData = {
          brochure: { type: 'upload', src: publicUrl }
        };
      } else if (mediaType === 'floor_plan') {
        // Set floor_plan object
        updateData = {
          floor_plan: { type: 'upload', src: publicUrl }
        };
      }
      
      const { error: updateError } = await supabase
        .from('properties')
        .update(updateData)
        .eq('id', projectId);
      
      if (updateError) {
        return new Response(
          JSON.stringify({ error: 'Failed to update project with new media', details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: { 
            media_type: mediaType,
            url: publicUrl
          } 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
      
    } else if (contentType.includes('application/json')) {
      // Handle media URL
      const { media_type, media_url } = await req.json();
      
      if (!media_type || !media_url) {
        return new Response(
          JSON.stringify({ error: 'Missing media_type or media_url' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Validate media type
      if (!['image', 'video', 'brochure', 'floor_plan'].includes(media_type)) {
        return new Response(
          JSON.stringify({ error: 'Invalid media_type. Must be one of: image, video, brochure, floor_plan' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Update project with new media
      let updateData: any = {};
      
      if (media_type === 'image') {
        // Add to media_images array
        updateData = {
          media_images: supabase.sql`coalesce(media_images, '[]'::jsonb) || ${JSON.stringify([{
            type: 'link',
            src: media_url
          }])}::jsonb`
        };
      } else if (media_type === 'video') {
        // Add to media_videos array
        updateData = {
          media_videos: supabase.sql`coalesce(media_videos, '[]'::jsonb) || ${JSON.stringify([{
            type: 'link',
            src: media_url
          }])}::jsonb`
        };
      } else if (media_type === 'brochure') {
        // Set brochure object
        updateData = {
          brochure: { type: 'link', src: media_url }
        };
      } else if (media_type === 'floor_plan') {
        // Set floor_plan object
        updateData = {
          floor_plan: { type: 'link', src: media_url }
        };
      }
      
      const { error: updateError } = await supabase
        .from('properties')
        .update(updateData)
        .eq('id', projectId);
      
      if (updateError) {
        return new Response(
          JSON.stringify({ error: 'Failed to update project with new media', details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: { 
            media_type,
            url: media_url
          } 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid content type. Must be multipart/form-data or application/json' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (err) {
    console.error('Error processing request:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
// Edge function for project import API
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

interface ImportProjectPayload {
  title: string;
  description: string;
  location: string;
  price: number;
  unit_types: string[];
  size_range: string;
  payment_plan?: string;
  handover_date?: string;
  status: string;
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

    // Parse request body
    const requestData: ImportProjectPayload = await req.json();

    // Validate required fields
    if (!requestData.title || !requestData.location || !requestData.price) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: title, location, and price are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format data for insertion into properties table
    const propertyData = {
      title: requestData.title,
      description: requestData.description,
      location: requestData.location,
      price: requestData.price,
      type: 'Apartment',  // Default
      contract_type: 'Sale',  // Default
      agent_id: developer.id,
      creator_id: developer.id,
      creator_type: 'developer',
      payment_plan: requestData.payment_plan || null,
      handover_date: requestData.handover_date || null,
      amenities: requestData.amenities || [],
      media_images: requestData.media_images || [],
      media_videos: requestData.media_videos || [],
      floor_plan: requestData.floor_plan || null,
      brochure: requestData.brochure || null,
      status: 'draft'
    };

    // Insert into properties table
    const { data: projectData, error: projectError } = await supabase
      .from('properties')
      .insert(propertyData)
      .select()
      .single();

    if (projectError) {
      return new Response(
        JSON.stringify({ error: 'Failed to create project', details: projectError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create unit types if provided
    if (requestData.unit_types && requestData.unit_types.length > 0 && projectData) {
      // Create unit types in bulk
      const unitTypesData = requestData.unit_types.map(unitType => ({
        project_id: projectData.id,
        developer_id: developer.id,
        name: unitType,
        size_range: requestData.size_range || '',
        status: 'available'
      }));

      const { error: unitTypesError } = await supabase
        .from('unit_types')
        .insert(unitTypesData);

      if (unitTypesError) {
        console.error('Error creating unit types:', unitTypesError);
        // Continue despite error in unit types
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: { 
          id: projectData.id,
          title: projectData.title,
          status: projectData.status
        } 
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Error processing request:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
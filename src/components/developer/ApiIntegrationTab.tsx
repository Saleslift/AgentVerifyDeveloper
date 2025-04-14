import React, { useState, useEffect } from 'react';
import { 
  Key, 
  RefreshCw, 
  Copy, 
  Check, 
  AlertTriangle, 
  Clipboard,
  Code,
  Server,
  Lock,
  Database,
  Clock,
  ArrowRight
} from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

export default function ApiIntegrationTab() {
  const { user } = useAuth();
  const [apiToken, setApiToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    if (user) {
      fetchApiToken();
    }
  }, [user]);

  const fetchApiToken = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('api_token')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      // Generate token if it doesn't exist yet
      if (!data.api_token) {
        await regenerateToken();
      } else {
        setApiToken(data.api_token);
      }
    } catch (error) {
      console.error('Error fetching API token:', error);
      toast.error('Failed to load API token');
    } finally {
      setLoading(false);
    }
  };

  const regenerateToken = async () => {
    if (!user) return;
    
    setRegenerating(true);
    try {
      const { data, error } = await supabase.rpc('generate_developer_api_token', {
        p_developer_id: user.id
      });

      if (error) throw error;

      setApiToken(data);
      toast.success('API token generated successfully');
    } catch (error) {
      console.error('Error regenerating API token:', error);
      toast.error('Failed to generate API token');
    } finally {
      setRegenerating(false);
      setShowConfirmation(false);
    }
  };

  const copyToClipboard = () => {
    if (!apiToken) return;
    
    navigator.clipboard.writeText(apiToken);
    setCopied(true);
    toast.success('API token copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">API Integration</h3>
      </div>

      {/* API Token Section */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-lg font-medium flex items-center">
            <Key className="mr-2 h-5 w-5 text-gray-500" />
            Your API Token
          </h4>
          
          {!showConfirmation ? (
            <button
              onClick={() => setShowConfirmation(true)}
              disabled={regenerating}
              className="px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 flex items-center"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${regenerating ? 'animate-spin' : ''}`} />
              Regenerate Token
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowConfirmation(false)}
                className="px-3 py-1.5 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={regenerateToken}
                disabled={regenerating}
                className="px-3 py-1.5 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center"
              >
                {regenerating ? 'Regenerating...' : 'Confirm Regenerate'}
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="animate-pulse h-12 bg-gray-100 rounded-lg"></div>
        ) : (
          <div className="flex items-center">
            <div className="flex-1 bg-gray-50 py-3 px-4 rounded-l-lg border border-gray-200 font-mono text-sm overflow-x-auto whitespace-nowrap">
              {apiToken || 'No API token found'}
            </div>
            <button
              onClick={copyToClipboard}
              disabled={!apiToken}
              className="py-3 px-4 bg-black text-white rounded-r-lg hover:bg-gray-800 disabled:opacity-50 flex items-center"
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        )}

        <div className="flex items-center mt-4 text-sm text-amber-700 bg-amber-50 p-3 rounded-lg">
          <AlertTriangle className="h-5 w-5 mr-2 text-amber-600" />
          <p>Keep this token secure. Regenerating the token will invalidate the previous one.</p>
        </div>
      </div>

      {/* API Documentation */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h4 className="text-lg font-medium flex items-center">
            <Clipboard className="mr-2 h-5 w-5 text-gray-500" />
            Developer API Documentation
          </h4>
        </div>

        <div className="space-y-6">
          {/* Authentication */}
          <section>
            <h5 className="text-base font-semibold mb-3 flex items-center">
              <Lock className="h-4 w-4 mr-2 text-gray-500" />
              Authentication
            </h5>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <p className="mb-2 text-sm">All API requests must include your API token in the headers:</p>
              <div className="bg-gray-900 text-gray-100 p-3 rounded-lg font-mono text-sm overflow-x-auto">
                {`Authorization: Bearer ${apiToken || 'your-api-token'}`}
              </div>
            </div>
          </section>

          {/* Endpoints */}
          <section>
            <h5 className="text-base font-semibold mb-3 flex items-center">
              <Server className="h-4 w-4 mr-2 text-gray-500" />
              Endpoints
            </h5>

            {/* Create Project */}
            <div className="mb-6">
              <div className="flex items-center mb-2">
                <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium mr-2">POST</span>
                <code className="text-sm font-mono">/api/projects</code>
              </div>
              
              <p className="text-sm mb-3">Create a new project</p>
              
              <div className="bg-gray-50 p-4 rounded-lg mb-2">
                <p className="text-sm font-semibold mb-2">Request Body:</p>
                <div className="bg-gray-900 text-gray-100 p-3 rounded-lg font-mono text-sm overflow-x-auto">
{`{
  "title": "Palm Vista Residences",
  "description": "Luxury waterfront living with panoramic views",
  "location": "Dubai Marina, Dubai, UAE",
  "price": 1500000,
  "unit_types": ["1 Bedroom", "2 Bedroom", "3 Bedroom"],
  "size_range": "650-1800",
  "payment_plan": "40/60",
  "handover_date": "2025-12-31",
  "status": "upcoming",
  "amenities": ["Pool", "Gym", "Security", "Parking"]
}`}
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-semibold mb-2">Response:</p>
                <div className="bg-gray-900 text-gray-100 p-3 rounded-lg font-mono text-sm overflow-x-auto">
{`{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Palm Vista Residences",
    "status": "draft"
  }
}`}
                </div>
              </div>
            </div>

            {/* Update Project */}
            <div className="mb-6">
              <div className="flex items-center mb-2">
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium mr-2">PUT</span>
                <code className="text-sm font-mono">/api/projects/:id</code>
              </div>
              
              <p className="text-sm mb-3">Update an existing project</p>
              
              <div className="bg-gray-50 p-4 rounded-lg mb-2">
                <p className="text-sm font-semibold mb-2">Request Body:</p>
                <div className="bg-gray-900 text-gray-100 p-3 rounded-lg font-mono text-sm overflow-x-auto">
{`{
  "title": "Updated Project Name",
  "price": 1600000,
  "status": "active"
}`}
                </div>
              </div>
            </div>

            {/* Upload Media */}
            <div>
              <div className="flex items-center mb-2">
                <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs font-medium mr-2">POST</span>
                <code className="text-sm font-mono">/api/projects/:id/media</code>
              </div>
              
              <p className="text-sm mb-3">Upload media for a project</p>
              
              <div className="bg-gray-50 p-4 rounded-lg mb-2">
                <p className="text-sm font-semibold mb-2">Request Body (multipart/form-data):</p>
                <div className="bg-gray-900 text-gray-100 p-3 rounded-lg font-mono text-sm overflow-x-auto">
{`{
  "media_type": "image", // or "video", "brochure", "floor_plan"
  "file": [binary data]
}`}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-semibold mb-2">Alternative: Add media by URL</p>
                <div className="bg-gray-900 text-gray-100 p-3 rounded-lg font-mono text-sm overflow-x-auto">
{`{
  "media_type": "image", // or "video", "brochure", "floor_plan"
  "media_url": "https://example.com/image.jpg"
}`}
                </div>
              </div>
            </div>
          </section>

          {/* JavaScript Example */}
          <section>
            <h5 className="text-base font-semibold mb-3 flex items-center">
              <Code className="h-4 w-4 mr-2 text-gray-500" />
              Code Example (JavaScript)
            </h5>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="bg-gray-900 text-gray-100 p-3 rounded-lg font-mono text-sm overflow-x-auto">
{`// Create a new project
async function createProject() {
  const response = await fetch('${window.location.origin}/api/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ${apiToken || 'your-api-token'}'
    },
    body: JSON.stringify({
      title: 'New Project',
      description: 'Project description',
      location: 'Dubai',
      price: 1500000,
      unit_types: ['1 Bedroom', '2 Bedroom'],
      size_range: '700-1200',
      payment_plan: '40/60',
      handover_date: '2025-06-30'
    })
  });
  
  return await response.json();
}`}
              </div>
            </div>
          </section>

          {/* Validation Rules */}
          <section>
            <h5 className="text-base font-semibold mb-3 flex items-center">
              <Database className="h-4 w-4 mr-2 text-gray-500" />
              Validation Rules
            </h5>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm mb-2">To publish a project, the following requirements must be met:</p>
              
              <ul className="list-disc pl-5 text-sm space-y-1 text-gray-700">
                <li>At least 5 images</li>
                <li>At least 1 unit type or starting price</li>
                <li>Either a floor plan or brochure</li>
                <li>Valid location in suitable format</li>
                <li>Project title and description</li>
              </ul>
              
              <p className="text-sm mt-2">Projects created via API will start in <code>draft</code> status until all validation criteria are met.</p>
            </div>
          </section>

          {/* Rate Limits */}
          <section>
            <h5 className="text-base font-semibold mb-3 flex items-center">
              <Clock className="h-4 w-4 mr-2 text-gray-500" />
              Rate Limits
            </h5>
            <div className="bg-gray-50 p-4 rounded-lg">
              <ul className="list-disc pl-5 text-sm space-y-1 text-gray-700">
                <li>Maximum 100 requests per minute per developer</li>
                <li>Maximum 50 project creations per day</li>
                <li>Maximum file size: 10MB per image, 50MB per video</li>
              </ul>
            </div>
          </section>
        </div>

        <div className="mt-6 border-t border-gray-100 pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between">
            <p className="text-sm text-gray-600 mb-4 sm:mb-0">
              Need additional help with the API? Contact our developer support team.
            </p>
            <a
              href="mailto:dev-support@agentverify.ae"
              className="inline-flex items-center px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
            >
              Contact Support
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
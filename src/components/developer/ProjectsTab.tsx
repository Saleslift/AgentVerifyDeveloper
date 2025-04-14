import React, { useState, useEffect } from 'react';
import { Building2, Search, Filter, Trash2, AlertCircle, PlusCircle, Rocket, ArrowUp, ArrowDown, Calendar, ChevronDown, SortDesc } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import ProjectCard from './ProjectCard';

// Utility function for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Retry function with exponential backoff
async function fetchWithRetry<T>(
  fetchFn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let retries = 0;
  
  while (true) {
    try {
      return await fetchFn();
    } catch (error) {
      if (retries >= maxRetries) {
        throw error; // Throw the error after all retries are exhausted
      }
      
      // Calculate exponential backoff delay
      const delayTime = baseDelay * Math.pow(2, retries);
      console.log(`Fetch failed, retrying in ${delayTime}ms... (Attempt ${retries + 1}/${maxRetries})`);
      
      // Wait before next retry
      await delay(delayTime);
      retries++;
    }
  }
}

export default function ProjectsTab() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'regular' | 'prelaunch' | 'imported'>('all');
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  }>({
    key: 'created_at',
    direction: 'desc'
  });

  useEffect(() => {
    fetchProjects();
  }, [user]);

  const fetchProjects = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      await fetchWithRetry(async () => {
        const { data, error: fetchError } = await supabase
            .from('properties')
            .select(`
              id,
              title,
              description,
              location,
              images,
              created_at,
              updated_at,
              is_prelaunch,
              launch_date,
              entry_type,
              status
            `)
            .eq('creator_type', 'developer')
            .eq('creator_id', user.id)
            .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;
        setProjects(data || []);
        return data;
      }, 3, 1000); // Retry up to 3 times with exponential backoff starting at 1000ms

    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to load projects. Network connection issue or server unavailable. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (project: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjectToDelete(project);
    setShowDeleteModal(true);
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete || !user) return;
    
    try {
      setIsDeleting(true);
      
      // First delete all unit types associated with this project
      const { error: unitTypesError } = await supabase
        .from('unit_types')
        .delete()
        .eq('project_id', projectToDelete.id);
      
      if (unitTypesError) throw unitTypesError;
      
      // Delete all agent_projects references
      const { error: agentProjectsError } = await supabase
        .from('agent_projects')
        .delete()
        .eq('project_id', projectToDelete.id);
      
      if (agentProjectsError) throw agentProjectsError;
      
      // Delete all agency_project_requests
      const { error: requestsError } = await supabase
        .from('agency_project_requests')
        .delete()
        .eq('project_id', projectToDelete.id);
      
      if (requestsError) throw requestsError;
      
      // Finally delete the project itself
      const { error: deleteError } = await supabase
        .from('properties')
        .delete()
        .eq('id', projectToDelete.id)
        .eq('creator_id', user.id); // Security check
      
      if (deleteError) throw deleteError;
      
      // Update local state
      setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
      toast.success('Project deleted successfully');
    } catch (err) {
      console.error('Error deleting project:', err);
      toast.error('Failed to delete project');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setProjectToDelete(null);
    }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key) {
      direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
      direction = 'asc';
    }
    
    setSortConfig({ key, direction });
  };

  // Filter and sort projects
  const filteredAndSortedProjects = React.useMemo(() => {
    let filteredProjects = [...projects];
    
    // Apply search and filters
    filteredProjects = filteredProjects.filter(project => {
      const matchesSearch = 
        project.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      if (filter === 'all') return matchesSearch;
      if (filter === 'prelaunch') return matchesSearch && project.is_prelaunch;
      if (filter === 'imported') return matchesSearch && project.entry_type === 'imported';
      if (filter === 'regular') return matchesSearch && !project.is_prelaunch && project.entry_type !== 'imported';
      
      return matchesSearch;
    });
    
    // Apply sorting
    filteredProjects.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];
      
      // Handle dates
      if (sortConfig.key === 'created_at' || sortConfig.key === 'updated_at' || sortConfig.key === 'launch_date') {
        aValue = new Date(aValue || 0).getTime();
        bValue = new Date(bValue || 0).getTime();
      }
      
      // Handle title
      if (sortConfig.key === 'title') {
        aValue = aValue?.toLowerCase() || '';
        bValue = bValue?.toLowerCase() || '';
      }
      
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    
    return filteredProjects;
  }, [projects, searchTerm, filter, sortConfig]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Development Projects</h3>
      </div>
      
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search projects by title or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
          />
        </div>
        
        <div className="flex space-x-3">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'regular' | 'prelaunch' | 'imported')}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent appearance-none bg-white"
            >
              <option value="all">All Projects</option>
              <option value="regular">Regular Projects</option>
              <option value="prelaunch">Prelaunch Projects</option>
              <option value="imported">Imported Projects</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          </div>
          
          <div className="relative">
            <SortDesc className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <select
              value={`${sortConfig.key}-${sortConfig.direction}`}
              onChange={(e) => {
                const [key, direction] = e.target.value.split('-');
                setSortConfig({
                  key,
                  direction: direction as 'asc' | 'desc'
                });
              }}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent appearance-none bg-white"
            >
              <option value="created_at-desc">Newest First</option>
              <option value="created_at-asc">Oldest First</option>
              <option value="title-asc">Name (A-Z)</option>
              <option value="title-desc">Name (Z-A)</option>
              <option value="launch_date-asc">Launch Date (Earliest)</option>
              <option value="launch_date-desc">Launch Date (Latest)</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-black"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
          <div className="mt-3 flex">
            <button 
              onClick={fetchProjects}
              className="text-sm text-blue-600 hover:text-blue-500 font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      ) : filteredAndSortedProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedProjects.map(project => (
            <ProjectCard 
              key={project.id} 
              project={project} 
              onDelete={handleDeleteClick} 
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
          <p className="text-gray-500 mb-4">Add your first development project to start collaborating with agencies.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('/developer-dashboard/create-project')}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 inline-flex items-center"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add New Project
            </button>
            <button
              onClick={() => navigate('/developer-dashboard/create-prelaunch')}
              className="px-4 py-2 bg-[#cefa05] text-black rounded-lg hover:bg-opacity-90 inline-flex items-center"
            >
              <Rocket className="h-4 w-4 mr-2" />
              Add Prelaunch Project
            </button>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && projectToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 text-red-600">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Delete Project
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Are you sure you want to delete "{projectToDelete.title}"? This action cannot be undone and will remove all associated unit types and references.
                </p>
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setProjectToDelete(null);
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteProject}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Project
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Project Floating Action Button (Mobile Only) */}
      <div className="fixed bottom-6 right-6 flex flex-col space-y-2 md:hidden">
        <button
          onClick={() => navigate('/developer-dashboard/create-prelaunch')}
          className="p-3 bg-[#cefa05] text-black rounded-full shadow-lg hover:bg-opacity-90"
        >
          <Rocket className="h-6 w-6" />
        </button>
        <button
          onClick={() => navigate('/developer-dashboard/create-project')}
          className="p-3 bg-black text-white rounded-full shadow-lg hover:bg-gray-800"
        >
          <PlusCircle className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
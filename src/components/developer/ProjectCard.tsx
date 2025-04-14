import React from 'react';
import { Building2, Trash2, Edit, Calendar, MapPin, Rocket } from 'lucide-react';
import { format } from 'date-fns';

interface ProjectCardProps {
  project: {
    id: string;
    title: string;
    description: string;
    location: string;
    images: string[];
    created_at: string;
    is_prelaunch?: boolean;
    launch_date?: string;
  };
  onDelete: (project: any, e: React.MouseEvent) => void;
  onEdit?: (projectId: string, e: React.MouseEvent) => void;
}

export default function ProjectCard({ project, onDelete, onEdit }: ProjectCardProps) {
  const handleClick = () => {
    if (onEdit) {
      onEdit(project.id, new MouseEvent('click') as unknown as React.MouseEvent);
    }
  };

  // Format launch date if it exists
  const formattedLaunchDate = project.launch_date 
    ? format(new Date(project.launch_date), 'MMM dd, yyyy')
    : null;

  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleClick}
    >
      <div className="relative aspect-video">
        {project.images && project.images[0] ? (
          <img 
            src={project.images[0]} 
            alt={project.title} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <Building2 className="h-12 w-12 text-gray-400" />
          </div>
        )}
        {project.is_prelaunch && (
          <div className="absolute top-0 right-0 bg-[#cefa05] text-black px-3 py-1 text-sm font-semibold">
            Prelaunch
          </div>
        )}
      </div>
      <div className="p-4">
        <h4 className="text-lg font-semibold text-gray-900 mb-2">{project.title}</h4>
        <div className="flex items-center text-gray-500 text-sm mb-2">
          <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
          <span className="truncate">{project.location}</span>
        </div>
        
        {project.is_prelaunch && formattedLaunchDate && (
          <div className="flex items-center text-gray-500 text-sm mb-2">
            <Calendar className="h-4 w-4 mr-1 flex-shrink-0" />
            <span>Launch: {formattedLaunchDate}</span>
          </div>
        )}
        
        <p className="text-gray-600 mb-2 line-clamp-2">{project.description}</p>
        <div className="flex items-center text-gray-500 text-sm">
          <span>{new Date(project.created_at).toLocaleDateString()}</span>
          {project.is_prelaunch && (
            <div className="ml-2 flex items-center text-amber-600">
              <Rocket className="h-3.5 w-3.5 mr-1" />
              <span className="text-xs font-medium">Coming Soon</span>
            </div>
          )}
        </div>
        <div className="flex items-center mt-4 space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onEdit) {
                onEdit(project.id, e);
              }
            }}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm flex items-center"
          >
            <Edit className="h-3 w-3 mr-1" />
            Edit Project
          </button>
          <button
            onClick={(e) => onDelete(project, e)}
            className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm flex items-center"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Delete Project
          </button>
        </div>
      </div>
    </div>
  );
}
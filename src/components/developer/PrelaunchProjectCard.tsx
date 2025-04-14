import React from 'react';
import { Building2, MapPin, Calendar, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

interface PrelaunchProjectCardProps {
  project: {
    id: string;
    title: string;
    description: string;
    location: string;
    images: string[];
    price: number;
    launch_date?: string;
    whatsapp?: string;
  };
  onClick?: () => void;
}

export default function PrelaunchProjectCard({ project, onClick }: PrelaunchProjectCardProps) {
  // Format launch date if it exists
  const formattedLaunchDate = project.launch_date 
    ? format(new Date(project.launch_date), 'MMM dd, yyyy')
    : 'Coming Soon';

  // Format price with AED currency
  const formattedPrice = `AED ${project.price.toLocaleString()}`;

  // Open WhatsApp with template message
  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!project.whatsapp) return;
    
    const message = encodeURIComponent(
      `Hello! I'm interested in the prelaunch project "${project.title}" at ${project.location}. Could you provide more information?`
    );
    window.open(`https://wa.me/${project.whatsapp.replace(/\+/g, '')}?text=${message}`, '_blank');
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
      onClick={onClick}
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
        <div className="absolute top-0 right-0 bg-[#cefa05] text-black px-3 py-1 text-sm font-semibold">
          Prelaunch
        </div>
      </div>
      <div className="p-4">
        <h4 className="text-lg font-semibold text-gray-900 mb-2">{project.title}</h4>
        <div className="flex items-center text-gray-500 text-sm mb-2">
          <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
          <span className="truncate">{project.location}</span>
        </div>
        
        <div className="flex items-center justify-between mb-2">
          <div className="text-gray-900 font-semibold">
            From {formattedPrice}
          </div>
          <div className="flex items-center text-gray-600 text-sm">
            <Calendar className="h-4 w-4 mr-1" />
            <span>{formattedLaunchDate}</span>
          </div>
        </div>
        
        <p className="text-gray-600 mb-3 line-clamp-2">{project.description}</p>
        
        <button
          onClick={handleWhatsAppClick}
          className="w-full py-2 bg-[#cefa05] text-black rounded-md hover:bg-opacity-90 flex items-center justify-center font-medium"
        >
          WhatsApp for Details
          <ArrowRight className="ml-1 h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
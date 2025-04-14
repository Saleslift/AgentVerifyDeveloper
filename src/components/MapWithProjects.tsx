import React, { useState, useEffect } from 'react';
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';

interface MapWithProjectsProps {
  developerId: string;
  centerLat?: number;
  centerLng?: number;
  height?: string;
}

interface ProjectLocation {
  id: string;
  title: string;
  location: string;
  lat: number;
  lng: number;
  price: number;
  image?: string;
  handover_date?: string;
}

const MapWithProjects: React.FC<MapWithProjectsProps> = ({
  developerId,
  centerLat = 25.2048,
  centerLng = 55.2708,
  height = '400px'
}) => {
  const navigate = useNavigate();
  const [isLoaded, setIsLoaded] = useState(false);
  const [projects, setProjects] = useState<ProjectLocation[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectLocation | null>(null);
  
  // Check if Google Maps is loaded
  useEffect(() => {
    if (window.googleMapsLoaded) {
      setIsLoaded(true);
    } else {
      const handleGoogleMapsLoaded = () => setIsLoaded(true);
      window.addEventListener('google-maps-loaded', handleGoogleMapsLoaded);
      return () => window.removeEventListener('google-maps-loaded', handleGoogleMapsLoaded);
    }
  }, []);
  
  // Fetch projects for this developer
  useEffect(() => {
    const fetchProjects = async () => {
      if (!developerId) return;
      
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('id, title, location, lat, lng, price, images, handover_date')
          .eq('creator_id', developerId)
          .eq('creator_type', 'developer')
          .not('lat', 'is', null)
          .not('lng', 'is', null);
          
        if (error) throw error;
        
        if (data) {
          const formattedProjects = data.map(project => ({
            id: project.id,
            title: project.title,
            location: project.location,
            lat: project.lat,
            lng: project.lng,
            price: project.price,
            image: project.images && project.images.length > 0 ? project.images[0] : undefined,
            handover_date: project.handover_date
          }));
          
          setProjects(formattedProjects);
        }
      } catch (error) {
        console.error('Error fetching developer projects for map:', error);
      }
    };
    
    fetchProjects();
  }, [developerId]);
  
  const formatPrice = (price: number) => {
    return `AED ${price.toLocaleString()}`;
  };
  
  // Determine map center point
  const getMapCenter = () => {
    if (projects.length === 0) {
      // If no projects, center on provided coordinates or Dubai
      return { lat: centerLat, lng: centerLng };
    }
    
    // Calculate center of all projects
    const totalLat = projects.reduce((sum, project) => sum + project.lat, 0);
    const totalLng = projects.reduce((sum, project) => sum + project.lng, 0);
    
    return {
      lat: totalLat / projects.length,
      lng: totalLng / projects.length
    };
  };
  
  const getMapBounds = () => {
    if (projects.length <= 1) return null;
    
    const bounds = new google.maps.LatLngBounds();
    projects.forEach(project => {
      bounds.extend(new google.maps.LatLng(project.lat, project.lng));
    });
    
    return bounds;
  };
  
  if (!isLoaded) {
    return <div style={{ height, width: '100%' }} className="bg-gray-100 flex items-center justify-center">Loading map...</div>;
  }
  
  return (
    <GoogleMap
      mapContainerStyle={{ height, width: '100%' }}
      center={getMapCenter()}
      zoom={projects.length > 1 ? 10 : 13}
      options={{
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ],
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true
      }}
      onLoad={(map) => {
        const bounds = getMapBounds();
        if (bounds) {
          map.fitBounds(bounds);
        }
      }}
    >
      {projects.map(project => (
        <Marker
          key={project.id}
          position={{ lat: project.lat, lng: project.lng }}
          title={project.title}
          onClick={() => setSelectedProject(project)}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: '#000000',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
            scale: 8
          }}
        />
      ))}
      
      {selectedProject && (
        <InfoWindow
          position={{ lat: selectedProject.lat, lng: selectedProject.lng }}
          onCloseClick={() => setSelectedProject(null)}
        >
          <div className="max-w-xs">
            {selectedProject.image && (
              <img 
                src={selectedProject.image} 
                alt={selectedProject.title} 
                className="w-full h-32 object-cover mb-2 rounded-sm"
              />
            )}
            <h3 className="font-medium text-gray-900 mb-1">{selectedProject.title}</h3>
            <p className="text-sm text-gray-600 mb-1">{selectedProject.location}</p>
            <p className="text-sm font-medium text-gray-800 mb-2">From {formatPrice(selectedProject.price)}</p>
            
            {selectedProject.handover_date && (
              <p className="text-xs text-gray-500 mb-2">
                Handover: {new Date(selectedProject.handover_date).toLocaleDateString()}
              </p>
            )}
            
            <button
              onClick={() => navigate(`/property/${selectedProject.id}`)}
              className="text-xs font-medium text-primary-600 hover:text-primary-800 flex items-center"
            >
              View Project
              <ExternalLink className="ml-1 h-3 w-3" />
            </button>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
};

export default MapWithProjects;
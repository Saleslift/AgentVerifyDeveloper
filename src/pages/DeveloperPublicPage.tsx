import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Award, 
  MapPin, 
  Calendar, 
  Users, 
  CheckCircle,
  ExternalLink,
  Home,
  Phone,
  Mail,
  Globe,
  Download,
  Instagram,
  Facebook,
  Youtube,
  Linkedin,
  Twitter,
  DollarSign,
  Clock,
  FileText,
  Filter,
  Search,
  Share2
} from 'lucide-react';
import { supabase } from '../utils/supabase';
import Header from '../components/Header';
import Footer from '../components/Footer';
import PrelaunchProjectCard from '../components/developer/PrelaunchProjectCard';
import ProjectCard from '../components/developer/ProjectCard';
import ContactOptions from '../components/ContactOptions';
import MapWithProjects from '../components/MapWithProjects';

interface DeveloperProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  whatsapp?: string;
  introduction?: string;
  location?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  youtube?: string;
  linkedin?: string;
  x?: string;
  developer_details?: {
    company_name?: string;
    company_address?: string;
    phone?: string;
    years_experience?: number;
    projects_uae?: number;
    units_uae?: number;
    vision_mission?: string;
    target_markets?: string[];
    is_dld_registered?: boolean;
    is_trusted_agency_partner?: boolean;
    is_multicountry_active?: boolean;
    hero_image_url?: string;
    hero_video_url?: string;
    agent_commission?: number;
    payment_timeline?: string;
    commission_terms?: string;
    commission_terms_url?: string;
    agency_agreement_url?: string;
    buyer_agreement_url?: string;
    project_brochure_url?: string;
  };
}

interface Project {
  id: string;
  title: string;
  description: string;
  location: string;
  price: number;
  images: string[];
  is_prelaunch: boolean;
  launch_date?: string;
}

export default function DeveloperPublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [developer, setDeveloper] = useState<DeveloperProfile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [prelaunchProjects, setPrelaunchProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [heroSectionHeight, setHeroSectionHeight] = useState('60vh');
  const [projectType, setProjectType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (slug) {
      fetchDeveloperProfile();
    }
  }, [slug]);

  const fetchDeveloperProfile = async () => {
    try {
      setLoading(true);
      
      // Fetch developer by slug
      const { data: developerData, error: developerError } = await supabase
        .from('profiles')
        .select('*, developer_details')
        .eq('slug', slug)
        .eq('role', 'developer')
        .single();
      
      if (developerError) throw developerError;
      
      // Fetch projects by this developer
      const { data: projectsData, error: projectsError } = await supabase
        .from('properties')
        .select('*')
        .eq('creator_id', developerData.id)
        .eq('creator_type', 'developer');
      
      if (projectsError) throw projectsError;
      
      // Set developer profile data
      setDeveloper(developerData);
      
      // Separate regular and prelaunch projects
      if (projectsData) {
        const prelaunch = projectsData.filter(p => p.is_prelaunch);
        const regular = projectsData.filter(p => !p.is_prelaunch);
        setPrelaunchProjects(prelaunch);
        setProjects(regular);
      }
    } catch (err) {
      console.error('Error fetching developer profile:', err);
      setError('Failed to load developer profile');
    } finally {
      setLoading(false);
    }
  };

  const formatTimeline = (timeline?: string) => {
    if (!timeline) return 'Custom';
    
    switch(timeline) {
      case 'on_booking': return 'On Booking';
      case '30_days': return 'Within 30 Days';
      case '60_days': return 'Within 60 Days';
      case 'on_completion': return 'On Completion';
      default: return timeline.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  // Filter projects based on search term and project type
  const filteredProjects = () => {
    let allProjects = [];
    
    // Determine which project sets to include based on the filter
    if (projectType === 'all' || projectType === 'regular') {
      allProjects.push(...projects);
    }
    
    if (projectType === 'all' || projectType === 'prelaunch') {
      allProjects.push(...prelaunchProjects);
    }
    
    // Apply search filter if there is a search term
    if (searchTerm) {
      return allProjects.filter(project => 
        project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.location?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return allProjects;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
      </div>
    );
  }

  if (error || !developer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">Developer Not Found</h2>
          <p className="mt-2 text-gray-600">{error || "We couldn't find the developer you're looking for."}</p>
          <button 
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-black text-white rounded-md"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }
  
  const renderHeroSection = () => {
    if (developer.developer_details?.hero_image_url) {
      return (
        <div 
          className="relative h-[60vh] bg-cover bg-center" 
          style={{ 
            backgroundImage: `linear-gradient(to bottom, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.7)), url('${developer.developer_details.hero_image_url}')`,
          }}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center p-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">{developer.full_name}</h1>
            {developer.introduction && (
              <p className="text-lg md:text-xl max-w-3xl">{developer.introduction}</p>
            )}
          </div>
        </div>
      );
    } else {
      return (
        <div className="bg-gray-900 py-24 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">{developer.full_name}</h1>
            {developer.introduction && (
              <p className="text-xl text-gray-300">{developer.introduction}</p>
            )}
          </div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      {renderHeroSection()}
      
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Company Details */}
          <div className="lg:col-span-1">
            {/* Company Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
              {/* Company Header */}
              <div className="p-6">
                <div className="flex items-center mb-4">
                  {developer.avatar_url ? (
                    <img 
                      src={developer.avatar_url} 
                      alt={developer.full_name} 
                      className="h-16 w-16 rounded-full object-cover border-2 border-white shadow"
                    />
                  ) : (
                    <div className="h-16 w-16 bg-gray-200 rounded-full flex items-center justify-center">
                      <Building2 className="h-8 w-8 text-gray-500" />
                    </div>
                  )}
                  <div className="ml-4">
                    <h2 className="text-xl font-bold">{developer.full_name}</h2>
                    {developer.developer_details?.is_dld_registered && (
                      <div className="flex items-center mt-1 text-green-600 text-sm">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        <span>DLD Registered</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact Details */}
                <div className="space-y-4">
                  {developer.location && (
                    <div className="flex items-start">
                      <MapPin className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Address</p>
                        <p className="font-medium">{developer.location}</p>
                      </div>
                    </div>
                  )}
                  
                  {developer.developer_details?.phone && (
                    <div className="flex items-start">
                      <Phone className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <p className="font-medium">{developer.developer_details.phone}</p>
                      </div>
                    </div>
                  )}
                  
                  {developer.email && (
                    <div className="flex items-start">
                      <Mail className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <a href={`mailto:${developer.email}`} className="font-medium text-blue-600 hover:text-blue-800">{developer.email}</a>
                      </div>
                    </div>
                  )}
                  
                  {developer.website && (
                    <div className="flex items-start">
                      <Globe className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Website</p>
                        <a 
                          href={developer.website.startsWith('http') ? developer.website : `https://${developer.website}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-medium text-blue-600 hover:text-blue-800 flex items-center"
                        >
                          {developer.website.replace(/(^\w+:|^)\/\//, '')}
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </div>
                    </div>
                  )}
                  
                  {developer.developer_details?.years_experience && (
                    <div className="flex items-start">
                      <Calendar className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Years of Experience</p>
                        <p className="font-medium">{developer.developer_details.years_experience} years</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Contact Buttons */}
                <div className="mt-6">
                  <ContactOptions 
                    whatsapp={developer.whatsapp} 
                    email={developer.email} 
                    phone={developer.developer_details?.phone || ''}
                  />
                </div>

                {/* Social Media Links */}
                {(developer.instagram || developer.facebook || developer.youtube || developer.linkedin || developer.x) && (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Connect with us</h3>
                    <div className="flex space-x-4">
                      {developer.instagram && (
                        <a 
                          href={developer.instagram} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-gray-500 hover:text-black transition-colors"
                        >
                          <Instagram className="h-5 w-5" />
                        </a>
                      )}
                      {developer.facebook && (
                        <a 
                          href={developer.facebook} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-gray-500 hover:text-black transition-colors"
                        >
                          <Facebook className="h-5 w-5" />
                        </a>
                      )}
                      {developer.youtube && (
                        <a 
                          href={developer.youtube} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-gray-500 hover:text-black transition-colors"
                        >
                          <Youtube className="h-5 w-5" />
                        </a>
                      )}
                      {developer.linkedin && (
                        <a 
                          href={developer.linkedin} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-gray-500 hover:text-black transition-colors"
                        >
                          <Linkedin className="h-5 w-5" />
                        </a>
                      )}
                      {developer.x && (
                        <a 
                          href={developer.x} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-gray-500 hover:text-black transition-colors"
                        >
                          <Twitter className="h-5 w-5" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Developer Achievement Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">Developer Achievements</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-gray-800">
                      {developer.developer_details?.projects_uae || 0}
                    </div>
                    <div className="text-sm text-gray-500">Projects in UAE</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-gray-800">
                      {developer.developer_details?.units_uae || 0}
                    </div>
                    <div className="text-sm text-gray-500">Units Delivered</div>
                  </div>
                </div>
                
                {/* Certifications / Badges */}
                {(developer.developer_details?.is_dld_registered || 
                  developer.developer_details?.is_trusted_agency_partner || 
                  developer.developer_details?.is_multicountry_active) && (
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <p className="text-sm font-medium text-gray-700 mb-3">Certifications</p>
                    <div className="flex flex-wrap gap-2">
                      {developer.developer_details?.is_dld_registered && (
                        <div className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-medium flex items-center">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          DLD Registered
                        </div>
                      )}
                      {developer.developer_details?.is_trusted_agency_partner && (
                        <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium flex items-center">
                          <Award className="h-3 w-3 mr-1" />
                          Trusted Partner
                        </div>
                      )}
                      {developer.developer_details?.is_multicountry_active && (
                        <div className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-xs font-medium flex items-center">
                          <Globe className="h-3 w-3 mr-1" />
                          Global Developer
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Commission & Agreements Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Share2 className="h-5 w-5 text-gray-500 mr-2" />
                  Commission & Agreements
                </h3>
                
                <div className="space-y-4">
                  {/* Agent Commission Rate */}
                  {developer.developer_details?.agent_commission !== undefined && (
                    <div className="flex items-start">
                      <DollarSign className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Agent Commission</p>
                        <p className="font-medium">{developer.developer_details.agent_commission}%</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Payment Timeline */}
                  {developer.developer_details?.payment_timeline && (
                    <div className="flex items-start">
                      <Clock className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Payment Timeline</p>
                        <p className="font-medium">{formatTimeline(developer.developer_details.payment_timeline)}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Commission Terms */}
                  {developer.developer_details?.commission_terms && (
                    <div className="pt-3 border-t border-gray-100">
                      <p className="text-sm font-medium text-gray-700 mb-2">Commission Terms</p>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{developer.developer_details.commission_terms}</p>
                    </div>
                  )}
                  
                  {/* Document Downloads */}
                  {(developer.developer_details?.commission_terms_url || 
                    developer.developer_details?.agency_agreement_url || 
                    developer.developer_details?.buyer_agreement_url || 
                    developer.developer_details?.project_brochure_url) && (
                    <div className="pt-3 mt-3 border-t border-gray-100">
                      <p className="text-sm font-medium text-gray-700 mb-2">Documents</p>
                      <div className="space-y-2">
                        {developer.developer_details?.commission_terms_url && (
                          <a 
                            href={developer.developer_details.commission_terms_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Commission Terms Document
                            <Download className="h-3 w-3 ml-1" />
                          </a>
                        )}
                        {developer.developer_details?.agency_agreement_url && (
                          <a 
                            href={developer.developer_details.agency_agreement_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Agency Agreement Template
                            <Download className="h-3 w-3 ml-1" />
                          </a>
                        )}
                        {developer.developer_details?.buyer_agreement_url && (
                          <a 
                            href={developer.developer_details.buyer_agreement_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Buyer Agreement Template
                            <Download className="h-3 w-3 ml-1" />
                          </a>
                        )}
                        {developer.developer_details?.project_brochure_url && (
                          <a 
                            href={developer.developer_details.project_brochure_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Project Brochure
                            <Download className="h-3 w-3 ml-1" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
                
            {/* Vision & Mission */}
            {developer.developer_details?.vision_mission && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Vision & Mission</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{developer.developer_details.vision_mission}</p>
                </div>
              </div>
            )}
            
            {/* Target Markets */}
            {developer.developer_details?.target_markets && developer.developer_details.target_markets.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Target Markets</h3>
                  <div className="flex flex-wrap gap-2">
                    {developer.developer_details.target_markets.map((market, index) => (
                      <div key={index} className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
                        {market}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Right Column - Projects */}
          <div className="lg:col-span-2">
            {/* Projects Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold flex items-center">
                    <Home className="mr-2 h-6 w-6 text-gray-500" />
                    Projects
                  </h2>
                  
                  <div className="flex space-x-3">
                    {/* Search Box */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search projects..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
                      />
                    </div>
                    
                    {/* Project Type Filter */}
                    <div className="relative">
                      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <select
                        value={projectType}
                        onChange={(e) => setProjectType(e.target.value)}
                        className="pl-9 pr-3 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent appearance-none bg-white"
                      >
                        <option value="all">All Projects</option>
                        <option value="prelaunch">Prelaunch Projects</option>
                        <option value="regular">Regular Projects</option>
                      </select>
                    </div>
                  </div>
                </div>

                {filteredProjects().length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredProjects().map(project => (
                      project.is_prelaunch ? (
                        <PrelaunchProjectCard
                          key={project.id}
                          project={{
                            ...project,
                            whatsapp: developer.whatsapp
                          }}
                        />
                      ) : (
                        <div key={project.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                          <div className="aspect-video bg-gray-200">
                            {project.images && project.images[0] ? (
                              <img
                                src={project.images[0]}
                                alt={project.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                <Home className="h-12 w-12 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            <h3 className="font-semibold text-lg mb-1">{project.title}</h3>
                            <div className="flex items-center text-gray-500 text-sm mb-2">
                              <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                              <span className="truncate">{project.location}</span>
                            </div>
                            <div className="text-xl font-bold mb-2">
                              AED {project.price.toLocaleString()}
                            </div>
                            <p className="text-gray-600 mb-3 line-clamp-2">{project.description}</p>
                            <a 
                              href={`/property/${project.id}`} 
                              className="block w-full py-2 text-center bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                            >
                              View Details
                            </a>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <Home className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Projects Found</h3>
                    {searchTerm ? (
                      <p className="text-gray-500">No projects match your search criteria</p>
                    ) : (
                      <p className="text-gray-500">This developer has not added any projects yet</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Map Section */}
            {(projects.length > 0 || prelaunchProjects.length > 0) && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
                <div className="p-6">
                  <h2 className="text-2xl font-bold mb-4">Project Locations</h2>
                  <div className="h-[400px] rounded-lg overflow-hidden">
                    <MapWithProjects 
                      developerId={developer.id}
                      height="400px"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
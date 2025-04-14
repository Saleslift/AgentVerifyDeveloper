import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Save, 
  X, 
  Building, 
  Phone, 
  Mail, 
  Globe, 
  MapPin, 
  Calendar, 
  Users, 
  Home, 
  BarChart3, 
  Target, 
  MessageSquare, 
  FileText, 
  Upload, 
  Eye, 
  Trash2, 
  ExternalLink,
  Video,
  Image as ImageIcon
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useRoleAuth } from '../hooks/useRoleAuth';
import Header from '../components/Header';
import Footer from '../components/Footer';
import MarketSelector from '../components/MarketSelector';
import FileUploader from '../components/FileUploader';
import { supabase } from '../utils/supabase';
import { toast } from 'react-hot-toast';

interface DeveloperProfile {
  // Company Info
  name: string;
  logo: string;
  registeredName: string;
  foundedDate: string;
  headquartersAddress: string;
  hqLat: number | null;
  hqLng: number | null;
  salesEmail: string;
  salesPhone: string;
  website: string;
  whatsapp: string;
  
  // Company Profile
  shortBio: string;
  visionMission: string;
  yearsExperience: number;
  projectsUAE: number;
  unitsUAE: number;
  projectsOutside: number;
  unitsOutside: number;
  targetMarkets: string[];
  
  // Media
  mediaImages: { type: 'upload' | 'link'; src: string }[];
  mediaVideos: { type: 'upload' | 'link'; src: string }[];
  
  // Documents
  companyBrochure: { type: 'upload' | 'link'; src: string } | null;
  videoPresentation: { type: 'upload' | 'link'; src: string } | null;
  salesAgreement: { type: 'upload' | 'link'; src: string } | null;
  commissionDocument: { type: 'upload' | 'link'; src: string } | null;
  
  // Badges
  isDLDRegistered: boolean;
  isTrustedAgencyPartner: boolean;
  isMulticountryActive: boolean;
  
  // Commission & Contracts
  agentCommission: number;
  paymentTimeline: string;
  commissionRequirements: string;
  contractValidityStart: string;
  contractValidityEnd: string;
  
  // Agent/Agency Eligibility
  eligibilityInfo: string;
  registrationDocuments: string;
  minimumSales: number;
  
  // Social Links
  socialLinks: {
    instagram?: string;
    linkedin?: string;
    youtube?: string;
    facebook?: string;
    twitter?: string;
  };
}

export default function EditDeveloperProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { role } = useRoleAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [newTargetMarket, setNewTargetMarket] = useState('');
  const [isMapsLoaded, setIsMapsLoaded] = useState(false);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);
  const mapRef = React.useRef<HTMLDivElement>(null);
  
  const [profile, setProfile] = useState<DeveloperProfile>({
    name: '',
    logo: '',
    registeredName: '',
    foundedDate: '',
    headquartersAddress: '',
    hqLat: null,
    hqLng: null,
    salesEmail: '',
    salesPhone: '',
    website: '',
    whatsapp: '',
    shortBio: '',
    visionMission: '',
    yearsExperience: 0,
    projectsUAE: 0,
    unitsUAE: 0,
    projectsOutside: 0,
    unitsOutside: 0,
    targetMarkets: [],
    mediaImages: [],
    mediaVideos: [],
    companyBrochure: null,
    videoPresentation: null,
    salesAgreement: null,
    commissionDocument: null,
    isDLDRegistered: false,
    isTrustedAgencyPartner: false,
    isMulticountryActive: false,
    agentCommission: 0,
    paymentTimeline: '',
    commissionRequirements: '',
    contractValidityStart: '',
    contractValidityEnd: '',
    eligibilityInfo: '',
    registrationDocuments: '',
    minimumSales: 0,
    socialLinks: {}
  });
  
  // Initialize map
  useEffect(() => {
    if (window.googleMapsLoaded) {
      setIsMapsLoaded(true);
    } else {
      const handleLoad = () => setIsMapsLoaded(true);
      window.addEventListener('google-maps-loaded', handleLoad);
      return () => window.removeEventListener('google-maps-loaded', handleLoad);
    }
  }, []);
  
  // Set up map when loaded and we have HQ coordinates
  useEffect(() => {
    if (!isMapsLoaded || !mapRef.current) return;
    
    const defaultLocation = { lat: 25.2048, lng: 55.2708 }; // Dubai default
    const center = profile.hqLat && profile.hqLng 
      ? { lat: profile.hqLat, lng: profile.hqLng } 
      : defaultLocation;
      
    const newMap = new google.maps.Map(mapRef.current, {
      center,
      zoom: 13,
      streetViewControl: false,
      fullscreenControl: false,
      mapTypeControl: false,
    });
    
    const newMarker = new google.maps.Marker({
      position: center,
      map: newMap,
      draggable: true,
      title: 'Headquarters Location'
    });
    
    // Update coordinates when marker is dragged
    google.maps.event.addListener(newMarker, 'dragend', () => {
      const position = newMarker.getPosition();
      if (position) {
        setProfile(prev => ({
          ...prev,
          hqLat: position.lat(),
          hqLng: position.lng()
        }));
      }
    });
    
    setMapInstance(newMap);
    setMarker(newMarker);
    
    return () => {
      if (newMarker) newMarker.setMap(null);
    };
  }, [isMapsLoaded, profile.hqLat, profile.hqLng]);
  
  useEffect(() => {
    if (user) {
      fetchDeveloperProfile();
    }
  }, [user]);
  
  const fetchDeveloperProfile = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Fetch profile data from profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileError) throw profileError;
      
      // Check if the role is developer, if not, update it
      if (profileData.role !== 'developer') {
        console.warn('Profile role is not developer, setting appropriate role...');
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ role: 'developer' })
          .eq('id', user.id);
          
        if (updateError) {
          console.error('Failed to update role to developer:', updateError);
        } else {
          console.log('Successfully updated role to developer');
        }
      }
      
      // Extract developer details from profile
      const developerDetails = profileData.developer_details || {};
      
      // Set form values
      setProfile({
        name: profileData.full_name || '',
        logo: profileData.avatar_url || '',
        registeredName: developerDetails.registered_name || '',
        foundedDate: developerDetails.founded_date || '',
        headquartersAddress: developerDetails.headquarters_address || '',
        hqLat: developerDetails.hq_lat || null,
        hqLng: developerDetails.hq_lng || null,
        salesEmail: developerDetails.sales_email || profileData.email || '',
        salesPhone: developerDetails.sales_phone || '',
        website: profileData.agency_website || '',
        whatsapp: profileData.whatsapp || '',
        shortBio: profileData.introduction || '',
        visionMission: developerDetails.vision_mission || '',
        yearsExperience: developerDetails.years_experience || 0,
        projectsUAE: developerDetails.projects_uae || 0,
        unitsUAE: developerDetails.units_uae || 0,
        projectsOutside: developerDetails.projects_outside || 0,
        unitsOutside: developerDetails.units_outside || 0,
        targetMarkets: developerDetails.target_markets || [],
        mediaImages: developerDetails.media_images || [],
        mediaVideos: developerDetails.media_videos || [],
        companyBrochure: developerDetails.company_brochure || null,
        videoPresentation: developerDetails.video_presentation || null,
        salesAgreement: developerDetails.sales_agreement || null,
        commissionDocument: developerDetails.commission_document || null,
        isDLDRegistered: developerDetails.is_dld_registered || false,
        isTrustedAgencyPartner: developerDetails.is_trusted_agency_partner || false,
        isMulticountryActive: developerDetails.is_multicountry_active || false,
        agentCommission: developerDetails.agent_commission || 0,
        paymentTimeline: developerDetails.payment_timeline || '',
        commissionRequirements: developerDetails.commission_requirements || '',
        contractValidityStart: developerDetails.contract_validity_start || '',
        contractValidityEnd: developerDetails.contract_validity_end || '',
        eligibilityInfo: developerDetails.eligibility_info || '',
        registrationDocuments: developerDetails.registration_documents || '',
        minimumSales: developerDetails.minimum_sales || 0,
        socialLinks: developerDetails.social_links || {}
      });
      
      // Set logo preview
      if (profileData.avatar_url) {
        setLogoPreview(profileData.avatar_url);
      }
      
    } catch (error) {
      console.error('Error fetching developer profile:', error);
      setError(error instanceof Error ? error.message : 'Failed to load profile data');
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };
  
  const handleLogoUpload = async (urls: string[]) => {
    if (urls.length > 0) {
      setProfile(prev => ({ ...prev, logo: urls[0] }));
      setLogoPreview(urls[0]);
    }
  };
  
  const handleMediaImagesUpload = (urls: string[]) => {
    const newImages = urls.map(url => ({ type: 'upload' as const, src: url }));
    setProfile(prev => ({
      ...prev,
      mediaImages: [...prev.mediaImages, ...newImages]
    }));
  };
  
  const handleMediaImagesReorder = (startIndex: number, endIndex: number) => {
    const result = Array.from(profile.mediaImages);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    
    setProfile(prev => ({ ...prev, mediaImages: result }));
  };
  
  const handleRemoveMediaImage = (index: number) => {
    setProfile(prev => ({
      ...prev,
      mediaImages: prev.mediaImages.filter((_, i) => i !== index)
    }));
  };
  
  const handleAddMediaImageLink = (url: string) => {
    if (url && isValidUrl(url)) {
      setProfile(prev => ({
        ...prev,
        mediaImages: [...prev.mediaImages, { type: 'link', src: url }]
      }));
      return true;
    }
    return false;
  };
  
  const handleMediaVideosUpload = (urls: string[]) => {
    const newVideos = urls.map(url => ({ type: 'upload' as const, src: url }));
    setProfile(prev => ({
      ...prev,
      mediaVideos: [...prev.mediaVideos, ...newVideos]
    }));
  };
  
  const handleAddMediaVideoLink = (url: string) => {
    if (url && isValidUrl(url)) {
      setProfile(prev => ({
        ...prev,
        mediaVideos: [...prev.mediaVideos, { type: 'link', src: url }]
      }));
      return true;
    }
    return false;
  };
  
  const handleRemoveMediaVideo = (index: number) => {
    setProfile(prev => ({
      ...prev,
      mediaVideos: prev.mediaVideos.filter((_, i) => i !== index)
    }));
  };
  
  const handleDocumentUpload = (field: keyof Pick<DeveloperProfile, 'companyBrochure' | 'videoPresentation' | 'salesAgreement' | 'commissionDocument'>, urls: string[]) => {
    if (urls.length > 0) {
      setProfile(prev => ({
        ...prev,
        [field]: { type: 'upload', src: urls[0] }
      }));
    }
  };
  
  const handleDocumentLinkAdd = (field: keyof Pick<DeveloperProfile, 'companyBrochure' | 'videoPresentation' | 'salesAgreement' | 'commissionDocument'>, url: string) => {
    if (url && isValidUrl(url)) {
      setProfile(prev => ({
        ...prev,
        [field]: { type: 'link', src: url }
      }));
      return true;
    }
    return false;
  };
  
  const handleDocumentRemove = (field: keyof Pick<DeveloperProfile, 'companyBrochure' | 'videoPresentation' | 'salesAgreement' | 'commissionDocument'>) => {
    setProfile(prev => ({
      ...prev,
      [field]: null
    }));
  };
  
  const handleAddressSearch = () => {
    if (!isMapsLoaded) return;
    
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: profile.headquartersAddress + ', UAE' }, (results, status) => {
      if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
        const location = results[0].geometry.location;
        
        setProfile(prev => ({
          ...prev,
          hqLat: location.lat(),
          hqLng: location.lng(),
          headquartersAddress: results[0].formatted_address
        }));
        
        if (mapInstance && marker) {
          mapInstance.setCenter(location);
          marker.setPosition(location);
        }
      } else {
        toast.error('Could not find location. Please try a different address.');
      }
    });
  };
  
  const handleAddTargetMarket = () => {
    if (newTargetMarket.trim()) {
      setProfile(prev => ({
        ...prev,
        targetMarkets: [...prev.targetMarkets, newTargetMarket.trim()]
      }));
      setNewTargetMarket('');
    }
  };
  
  const handleRemoveTargetMarket = (market: string) => {
    setProfile(prev => ({
      ...prev,
      targetMarkets: prev.targetMarkets.filter(m => m !== market)
    }));
  };
  
  const isValidUrl = (urlString: string) => {
    try {
      new URL(urlString);
      return true;
    } catch (err) {
      return false;
    }
  };
  
  const onSubmit = async () => {
    try {
      setSaving(true);
      setError(null);
      
      if (!profile.name) {
        throw new Error('Company name is required');
      }
      
      if (!profile.headquartersAddress) {
        throw new Error('Headquarters address is required');
      }
      
      if (!profile.salesEmail || !profile.salesPhone) {
        throw new Error('Contact information (email and phone) is required');
      }
      
      // Prepare developer details object
      const developerDetails = {
        registered_name: profile.registeredName,
        founded_date: profile.foundedDate,
        headquarters_address: profile.headquartersAddress,
        hq_lat: profile.hqLat,
        hq_lng: profile.hqLng,
        sales_email: profile.salesEmail,
        sales_phone: profile.salesPhone,
        vision_mission: profile.visionMission,
        years_experience: profile.yearsExperience,
        projects_uae: profile.projectsUAE,
        units_uae: profile.unitsUAE,
        projects_outside: profile.projectsOutside,
        units_outside: profile.unitsOutside,
        target_markets: profile.targetMarkets,
        media_images: profile.mediaImages,
        media_videos: profile.mediaVideos,
        company_brochure: profile.companyBrochure,
        video_presentation: profile.videoPresentation,
        sales_agreement: profile.salesAgreement,
        commission_document: profile.commissionDocument,
        is_dld_registered: profile.isDLDRegistered,
        is_trusted_agency_partner: profile.isTrustedAgencyPartner,
        is_multicountry_active: profile.isMulticountryActive,
        agent_commission: profile.agentCommission,
        payment_timeline: profile.paymentTimeline,
        commission_requirements: profile.commissionRequirements,
        contract_validity_start: profile.contractValidityStart,
        contract_validity_end: profile.contractValidityEnd,
        eligibility_info: profile.eligibilityInfo,
        registration_documents: profile.registrationDocuments,
        minimum_sales: profile.minimumSales,
        social_links: profile.socialLinks
      };
      
      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: profile.name,
          avatar_url: profile.logo,
          introduction: profile.shortBio,
          agency_website: profile.website,
          whatsapp: profile.whatsapp,
          developer_details: developerDetails,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);
      
      if (updateError) throw updateError;
      
      toast.success('Profile updated successfully');
      
      // Wait for a moment before navigating
      setTimeout(() => {
        navigate(`/developers/${profileData?.slug || ''}`);
      }, 1500);
      
    } catch (err) {
      console.error('Error saving profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to save profile');
      toast.error(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };
  
  // Get profile data for public page redirect
  const [profileData, setProfileData] = useState<{ slug?: string } | null>(null);
  
  useEffect(() => {
    const fetchSlug = async () => {
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('slug')
          .eq('id', user.id)
          .single();
        
        setProfileData(data);
      }
    };
    
    fetchSlug();
  }, [user]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }
  
  // Redirect if not a developer
  if (role && role !== 'developer') {
    navigate('/dashboard');
    return null;
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-6 md:p-8">
            {/* Header with title and actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
              <h1 className="text-2xl font-bold">Edit Developer Profile</h1>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => navigate(`/developers/${profileData?.slug || ''}`)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview Profile
                </button>
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={saving}
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 flex items-center disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <span className="animate-spin mr-2">⌛</span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {/* Error display */}
            {error && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <X className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                {/* Company Information */}
                <section className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold mb-6 flex items-center">
                    <Building className="mr-2 h-5 w-5 text-gray-500" />
                    Company Information
                  </h2>
                  
                  <div className="space-y-6">
                    {/* Company Logo */}
                    <div className="flex flex-col sm:flex-row gap-6 items-start">
                      <div className="w-32 h-32 relative">
                        {logoPreview ? (
                          <img 
                            src={logoPreview} 
                            alt="Company Logo" 
                            className="w-full h-full object-cover rounded-lg" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
                            <Building className="h-10 w-10 text-gray-400" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 space-y-2">
                        <h3 className="text-sm font-medium text-gray-700">Company Logo</h3>
                        <FileUploader 
                          onUpload={handleLogoUpload}
                          allowedFileTypes={['image/jpeg', 'image/png']}
                          multiple={false}
                          bucket="avatars"
                          folder={user?.id || 'temp'}
                          maxFileSize={2}
                          accepts=".jpg,.jpeg,.png"
                          className="max-w-md"
                        />
                        <p className="text-xs text-gray-500">
                          Upload a company logo. Max 2MB. JPG or PNG format.
                        </p>
                      </div>
                    </div>
                    
                    {/* Company Name and Registration */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Company Name *
                        </label>
                        <input
                          type="text"
                          value={profile.name}
                          onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Registered Legal Name *
                        </label>
                        <input
                          type="text"
                          value={profile.registeredName}
                          onChange={(e) => setProfile(prev => ({ ...prev, registeredName: e.target.value }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                          required
                        />
                      </div>
                    </div>
                    
                    {/* Founded Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Founded Date *
                      </label>
                      <input
                        type="date"
                        value={profile.foundedDate}
                        onChange={(e) => setProfile(prev => ({ ...prev, foundedDate: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                        required
                      />
                    </div>
                    
                    {/* Contact Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Sales Email *
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <input
                            type="email"
                            value={profile.salesEmail}
                            onChange={(e) => setProfile(prev => ({ ...prev, salesEmail: e.target.value }))}
                            className="w-full pl-10 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                            required
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Sales Phone *
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <input
                            type="tel"
                            value={profile.salesPhone}
                            onChange={(e) => setProfile(prev => ({ ...prev, salesPhone: e.target.value }))}
                            className="w-full pl-10 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                            required
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Website
                        </label>
                        <div className="relative">
                          <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <input
                            type="url"
                            value={profile.website}
                            onChange={(e) => setProfile(prev => ({ ...prev, website: e.target.value }))}
                            className="w-full pl-10 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          WhatsApp
                        </label>
                        <div className="relative">
                          <MessageSquare className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <input
                            type="tel"
                            value={profile.whatsapp}
                            onChange={(e) => setProfile(prev => ({ ...prev, whatsapp: e.target.value }))}
                            className="w-full pl-10 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
                
                {/* Headquarters Location */}
                <section className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold mb-6 flex items-center">
                    <MapPin className="mr-2 h-5 w-5 text-gray-500" />
                    Headquarters Location
                  </h2>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                      <div className="md:col-span-5">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Headquarters Address *
                        </label>
                        <input
                          type="text"
                          value={profile.headquartersAddress}
                          onChange={(e) => setProfile(prev => ({ 
                            ...prev, 
                            headquartersAddress: e.target.value 
                          }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                          placeholder="Enter full address"
                          required
                        />
                      </div>
                      
                      <div className="md:col-span-1">
                        <label className="invisible block text-sm font-medium text-gray-700 mb-1">
                          Search
                        </label>
                        <button 
                          type="button"
                          onClick={handleAddressSearch}
                          className="w-full px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
                        >
                          Search
                        </button>
                      </div>
                    </div>
                    
                    <div 
                      ref={mapRef}
                      className="w-full h-64 bg-gray-100 rounded-lg"
                    ></div>
                    
                    <div className="text-xs text-gray-500">
                      Drag the marker to adjust the precise location if needed.
                    </div>
                  </div>
                </section>
                
                {/* Company Profile */}
                <section className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold mb-6 flex items-center">
                    <Building className="mr-2 h-5 w-5 text-gray-500" />
                    Company Profile
                  </h2>
                  
                  <div className="space-y-6">
                    {/* Short Bio */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Short Bio (max 500 chars) *
                      </label>
                      <textarea
                        value={profile.shortBio}
                        onChange={(e) => setProfile(prev => ({ 
                          ...prev, 
                          shortBio: e.target.value.slice(0, 500) 
                        }))}
                        rows={3}
                        maxLength={500}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                        placeholder="Brief description of your company..."
                        required
                      ></textarea>
                      <div className="text-xs text-right text-gray-500 mt-1">
                        {profile.shortBio.length}/500
                      </div>
                    </div>
                    
                    {/* Vision & Mission */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Vision & Mission
                      </label>
                      <textarea
                        value={profile.visionMission}
                        onChange={(e) => setProfile(prev => ({ 
                          ...prev, 
                          visionMission: e.target.value 
                        }))}
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                        placeholder="Your company's vision and mission..."
                      ></textarea>
                    </div>
                    
                    {/* Experience & Projects */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Years of Experience
                        </label>
                        <input
                          type="number"
                          value={profile.yearsExperience}
                          onChange={(e) => setProfile(prev => ({ 
                            ...prev, 
                            yearsExperience: parseInt(e.target.value) || 0
                          }))}
                          min="0"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Projects in UAE
                        </label>
                        <input
                          type="number"
                          value={profile.projectsUAE}
                          onChange={(e) => setProfile(prev => ({ 
                            ...prev, 
                            projectsUAE: parseInt(e.target.value) || 0
                          }))}
                          min="0"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Units in UAE
                        </label>
                        <input
                          type="number"
                          value={profile.unitsUAE}
                          onChange={(e) => setProfile(prev => ({ 
                            ...prev, 
                            unitsUAE: parseInt(e.target.value) || 0
                          }))}
                          min="0"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Projects Outside UAE
                        </label>
                        <input
                          type="number"
                          value={profile.projectsOutside}
                          onChange={(e) => setProfile(prev => ({ 
                            ...prev, 
                            projectsOutside: parseInt(e.target.value) || 0
                          }))}
                          min="0"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Units Outside UAE
                        </label>
                        <input
                          type="number"
                          value={profile.unitsOutside}
                          onChange={(e) => setProfile(prev => ({ 
                            ...prev, 
                            unitsOutside: parseInt(e.target.value) || 0
                          }))}
                          min="0"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                        />
                      </div>
                    </div>
                    
                    {/* Target Markets */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Target Markets
                      </label>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {profile.targetMarkets.map((market, index) => (
                          <div 
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-800"
                          >
                            <span>{market}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveTargetMarket(market)}
                              className="ml-2 text-primary-600 hover:text-primary-800"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newTargetMarket}
                          onChange={(e) => setNewTargetMarket(e.target.value)}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                          placeholder="e.g., India, GCC, Europe"
                        />
                        <button
                          type="button"
                          onClick={handleAddTargetMarket}
                          className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300"
                          disabled={!newTargetMarket.trim()}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
                
                {/* Media Gallery */}
                <section className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold mb-6 flex items-center">
                    <ImageIcon className="mr-2 h-5 w-5 text-gray-500" />
                    Media Gallery
                  </h2>
                  
                  {/* Images */}
                  <div className="mb-8">
                    <h3 className="text-lg font-medium mb-4">Images</h3>
                    
                    {profile.mediaImages.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-6">
                        {profile.mediaImages.map((image, index) => (
                          <div key={index} className="group relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                            <img 
                              src={image.src} 
                              alt={`Gallery image ${index + 1}`} 
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={() => handleRemoveMediaImage(index)}
                                className="p-1 bg-red-500 rounded-full text-white"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </div>
                            {index === 0 && (
                              <div className="absolute top-2 left-2 bg-primary-500 text-white text-xs px-2 py-1 rounded-md">
                                Cover
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {profile.mediaImages.length < 10 && (
                      <div className="space-y-4">
                        <FileUploader 
                          onUpload={handleMediaImagesUpload}
                          allowedFileTypes={['image/jpeg', 'image/png', 'image/webp']}
                          multiple={true}
                          bucket="developer-files"
                          folder={`${user?.id || 'temp'}/images`}
                          maxFileSize={5}
                          accepts=".jpg,.jpeg,.png,.webp"
                        />
                        
                        <div className="flex items-center gap-4 mt-4">
                          <div className="flex-1 relative">
                            <input 
                              type="url" 
                              placeholder="Or add image URL"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                              id="image-url-input"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const input = document.getElementById('image-url-input') as HTMLInputElement;
                              if (input && input.value) {
                                const success = handleAddMediaImageLink(input.value);
                                if (success) input.value = '';
                                else toast.error('Please enter a valid URL');
                              }
                            }}
                            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
                          >
                            Add URL
                          </button>
                        </div>
                        <div className="text-xs text-gray-500">
                          Upload up to 10 images. Max 5MB each. JPG, PNG or WebP format.
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Videos */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Videos</h3>
                    
                    {profile.mediaVideos.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        {profile.mediaVideos.map((video, index) => (
                          <div key={index} className="relative aspect-video rounded-lg overflow-hidden border border-gray-200">
                            {video.type === 'upload' ? (
                              <video 
                                src={video.src} 
                                controls 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <iframe
                                src={video.src}
                                title={`Video ${index + 1}`}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveMediaVideo(index)}
                              className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="space-y-4">
                      <FileUploader 
                        onUpload={handleMediaVideosUpload}
                        allowedFileTypes={['video/mp4', 'video/quicktime', 'video/webm']}
                        multiple={true}
                        bucket="developer-files"
                        folder={`${user?.id || 'temp'}/videos`}
                        maxFileSize={100}
                        accepts=".mp4,.mov,.webm"
                      />
                      
                      <div className="flex items-center gap-4 mt-4">
                        <div className="flex-1 relative">
                          <input 
                            type="url" 
                            placeholder="Or add video URL (YouTube, Vimeo, etc.)"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                            id="video-url-input"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.getElementById('video-url-input') as HTMLInputElement;
                            if (input && input.value) {
                              const success = handleAddMediaVideoLink(input.value);
                              if (success) input.value = '';
                              else toast.error('Please enter a valid URL');
                            }
                          }}
                          className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
                        >
                          Add URL
                        </button>
                      </div>
                      <div className="text-xs text-gray-500">
                        Upload videos or link to external videos from YouTube, Vimeo, etc.
                      </div>
                    </div>
                  </div>
                </section>
                
                {/* Documents */}
                <section className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold mb-6 flex items-center">
                    <FileText className="mr-2 h-5 w-5 text-gray-500" />
                    Documents
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Company Brochure */}
                    <div>
                      <h3 className="text-md font-medium mb-3">Company Brochure</h3>
                      
                      {profile.companyBrochure ? (
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center">
                            <FileText className="h-5 w-5 text-gray-500 mr-2" />
                            <div className="truncate">
                              <p className="text-sm font-medium">
                                {profile.companyBrochure.type === 'upload'
                                  ? 'Uploaded Brochure'
                                  : 'Linked Brochure'
                                }
                              </p>
                              <a 
                                href={profile.companyBrochure.src} 
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary-600 hover:text-primary-800 truncate"
                              >
                                View Document
                              </a>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDocumentRemove('companyBrochure')}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <FileUploader
                            onUpload={(urls) => handleDocumentUpload('companyBrochure', urls)}
                            allowedFileTypes={['application/pdf']}
                            multiple={false}
                            bucket="developer-files"
                            folder={`${user?.id || 'temp'}/documents`}
                            maxFileSize={10}
                            accepts=".pdf"
                          />
                          
                          <div className="flex items-center gap-2">
                            <div className="flex-1 relative">
                              <input
                                type="url"
                                placeholder="Or add document URL"
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                                id="brochure-url-input"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const input = document.getElementById('brochure-url-input') as HTMLInputElement;
                                if (input && input.value) {
                                  const success = handleDocumentLinkAdd('companyBrochure', input.value);
                                  if (success) input.value = '';
                                  else toast.error('Please enter a valid URL');
                                }
                              }}
                              className="px-3 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800"
                            >
                              Add Link
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Video Presentation */}
                    <div>
                      <h3 className="text-md font-medium mb-3">Video Presentation</h3>
                      
                      {profile.videoPresentation ? (
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center">
                            <Video className="h-5 w-5 text-gray-500 mr-2" />
                            <div className="truncate">
                              <p className="text-sm font-medium">
                                {profile.videoPresentation.type === 'upload'
                                  ? 'Uploaded Presentation'
                                  : 'Linked Presentation'
                                }
                              </p>
                              <a 
                                href={profile.videoPresentation.src} 
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary-600 hover:text-primary-800 truncate"
                              >
                                View Video
                              </a>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDocumentRemove('videoPresentation')}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 relative">
                              <input
                                type="url"
                                placeholder="Add video URL (YouTube, Vimeo, etc.)"
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                                id="video-presentation-url-input"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const input = document.getElementById('video-presentation-url-input') as HTMLInputElement;
                                if (input && input.value) {
                                  const success = handleDocumentLinkAdd('videoPresentation', input.value);
                                  if (success) input.value = '';
                                  else toast.error('Please enter a valid URL');
                                }
                              }}
                              className="px-3 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800"
                            >
                              Add Link
                            </button>
                          </div>
                          <div className="text-xs text-gray-500">
                            Link to a company presentation video on YouTube, Vimeo, etc.
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Sales Agreement */}
                    <div>
                      <h3 className="text-md font-medium mb-3">Sales Agreement Template</h3>
                      
                      {profile.salesAgreement ? (
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center">
                            <FileText className="h-5 w-5 text-gray-500 mr-2" />
                            <div className="truncate">
                              <p className="text-sm font-medium">
                                {profile.salesAgreement.type === 'upload'
                                  ? 'Uploaded Agreement'
                                  : 'Linked Agreement'
                                }
                              </p>
                              <a 
                                href={profile.salesAgreement.src} 
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary-600 hover:text-primary-800 truncate"
                              >
                                View Document
                              </a>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDocumentRemove('salesAgreement')}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <FileUploader
                            onUpload={(urls) => handleDocumentUpload('salesAgreement', urls)}
                            allowedFileTypes={['application/pdf']}
                            multiple={false}
                            bucket="developer-files"
                            folder={`${user?.id || 'temp'}/documents`}
                            maxFileSize={10}
                            accepts=".pdf"
                          />
                          
                          <div className="flex items-center gap-2">
                            <div className="flex-1 relative">
                              <input
                                type="url"
                                placeholder="Or add document URL"
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                                id="agreement-url-input"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const input = document.getElementById('agreement-url-input') as HTMLInputElement;
                                if (input && input.value) {
                                  const success = handleDocumentLinkAdd('salesAgreement', input.value);
                                  if (success) input.value = '';
                                  else toast.error('Please enter a valid URL');
                                }
                              }}
                              className="px-3 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800"
                            >
                              Add Link
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Commission Document */}
                    <div>
                      <h3 className="text-md font-medium mb-3">Commission Document</h3>
                      
                      {profile.commissionDocument ? (
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center">
                            <FileText className="h-5 w-5 text-gray-500 mr-2" />
                            <div className="truncate">
                              <p className="text-sm font-medium">
                                {profile.commissionDocument.type === 'upload'
                                  ? 'Uploaded Document'
                                  : 'Linked Document'
                                }
                              </p>
                              <a 
                                href={profile.commissionDocument.src} 
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary-600 hover:text-primary-800 truncate"
                              >
                                View Document
                              </a>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDocumentRemove('commissionDocument')}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <FileUploader
                            onUpload={(urls) => handleDocumentUpload('commissionDocument', urls)}
                            allowedFileTypes={['application/pdf']}
                            multiple={false}
                            bucket="developer-files"
                            folder={`${user?.id || 'temp'}/documents`}
                            maxFileSize={10}
                            accepts=".pdf"
                          />
                          
                          <div className="flex items-center gap-2">
                            <div className="flex-1 relative">
                              <input
                                type="url"
                                placeholder="Or add document URL"
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                                id="commission-url-input"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const input = document.getElementById('commission-url-input') as HTMLInputElement;
                                if (input && input.value) {
                                  const success = handleDocumentLinkAdd('commissionDocument', input.value);
                                  if (success) input.value = '';
                                  else toast.error('Please enter a valid URL');
                                }
                              }}
                              className="px-3 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800"
                            >
                              Add Link
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              </div>
              
              <div className="space-y-8">
                {/* Profile Highlights */}
                <section className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold mb-6 flex items-center">
                    <Award className="mr-2 h-5 w-5 text-gray-500" />
                    Profile Highlights
                  </h2>
                  
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        id="is-dld-registered"
                        checked={profile.isDLDRegistered}
                        onChange={(e) => setProfile(prev => ({ 
                          ...prev, 
                          isDLDRegistered: e.target.checked 
                        }))}
                        className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label htmlFor="is-dld-registered" className="ml-3 block">
                        <span className="text-sm font-medium text-gray-700">DLD Registered</span>
                        <p className="text-xs text-gray-500">
                          Your company is registered with Dubai Land Department
                        </p>
                      </label>
                    </div>
                    
                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        id="is-trusted-partner"
                        checked={profile.isTrustedAgencyPartner}
                        onChange={(e) => setProfile(prev => ({ 
                          ...prev, 
                          isTrustedAgencyPartner: e.target.checked 
                        }))}
                        className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label htmlFor="is-trusted-partner" className="ml-3 block">
                        <span className="text-sm font-medium text-gray-700">Trusted Agency Partner</span>
                        <p className="text-xs text-gray-500">
                          Your company works with certified real estate agencies
                        </p>
                      </label>
                    </div>
                    
                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        id="is-multicountry"
                        checked={profile.isMulticountryActive}
                        onChange={(e) => setProfile(prev => ({ 
                          ...prev, 
                          isMulticountryActive: e.target.checked 
                        }))}
                        className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label htmlFor="is-multicountry" className="ml-3 block">
                        <span className="text-sm font-medium text-gray-700">Multi-Country Active</span>
                        <p className="text-xs text-gray-500">
                          Your company operates in multiple countries
                        </p>
                      </label>
                    </div>
                  </div>
                </section>
                
                {/* Commission Details */}
                <section className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold mb-6 flex items-center">
                    <DollarSign className="mr-2 h-5 w-5 text-gray-500" />
                    Commission & Contracts
                  </h2>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Agent Commission Rate (%)
                      </label>
                      <input
                        type="number"
                        value={profile.agentCommission}
                        onChange={(e) => setProfile(prev => ({ 
                          ...prev, 
                          agentCommission: parseFloat(e.target.value) || 0
                        }))}
                        min="0"
                        max="100"
                        step="0.5"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Timeline
                      </label>
                      <select
                        value={profile.paymentTimeline}
                        onChange={(e) => setProfile(prev => ({ 
                          ...prev, 
                          paymentTimeline: e.target.value 
                        }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                      >
                        <option value="">Select a timeline</option>
                        <option value="within_7_days">Within 7 days of sale</option>
                        <option value="within_14_days">Within 14 days of sale</option>
                        <option value="within_30_days">Within 30 days of sale</option>
                        <option value="on_client_payment">Upon client payment</option>
                        <option value="custom">Custom (specify in requirements)</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Commission Requirements
                      </label>
                      <textarea
                        value={profile.commissionRequirements}
                        onChange={(e) => setProfile(prev => ({ 
                          ...prev, 
                          commissionRequirements: e.target.value 
                        }))}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                        placeholder="Any specific requirements or conditions for commission..."
                      ></textarea>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Contract Valid From
                        </label>
                        <input
                          type="date"
                          value={profile.contractValidityStart}
                          onChange={(e) => setProfile(prev => ({ 
                            ...prev, 
                            contractValidityStart: e.target.value 
                          }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Contract Valid To
                        </label>
                        <input
                          type="date"
                          value={profile.contractValidityEnd}
                          onChange={(e) => setProfile(prev => ({ 
                            ...prev, 
                            contractValidityEnd: e.target.value 
                          }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </section>
                
                {/* Agent Requirements */}
                <section className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold mb-6 flex items-center">
                    <Users className="mr-2 h-5 w-5 text-gray-500" />
                    Agent Requirements
                  </h2>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Eligibility Information
                      </label>
                      <textarea
                        value={profile.eligibilityInfo}
                        onChange={(e) => setProfile(prev => ({ 
                          ...prev, 
                          eligibilityInfo: e.target.value 
                        }))}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                        placeholder="Requirements for agents to represent your properties..."
                      ></textarea>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Required Registration Documents
                      </label>
                      <input
                        type="text"
                        value={profile.registrationDocuments}
                        onChange={(e) => setProfile(prev => ({ 
                          ...prev, 
                          registrationDocuments: e.target.value 
                        }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                        placeholder="e.g., RERA license, Trade license, etc."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Minimum Sales Target (AED)
                      </label>
                      <input
                        type="number"
                        value={profile.minimumSales}
                        onChange={(e) => setProfile(prev => ({ 
                          ...prev, 
                          minimumSales: parseInt(e.target.value) || 0
                        }))}
                        min="0"
                        step="100000"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                      />
                    </div>
                  </div>
                </section>
                
                {/* Social Media Links */}
                <section className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold mb-6 flex items-center">
                    <Globe className="mr-2 h-5 w-5 text-gray-500" />
                    Social Media
                  </h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Instagram
                      </label>
                      <input
                        type="url"
                        value={profile.socialLinks.instagram || ''}
                        onChange={(e) => setProfile(prev => ({ 
                          ...prev, 
                          socialLinks: {
                            ...prev.socialLinks,
                            instagram: e.target.value
                          }
                        }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                        placeholder="https://instagram.com/username"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        LinkedIn
                      </label>
                      <input
                        type="url"
                        value={profile.socialLinks.linkedin || ''}
                        onChange={(e) => setProfile(prev => ({ 
                          ...prev, 
                          socialLinks: {
                            ...prev.socialLinks,
                            linkedin: e.target.value
                          }
                        }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                        placeholder="https://linkedin.com/company/name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        YouTube
                      </label>
                      <input
                        type="url"
                        value={profile.socialLinks.youtube || ''}
                        onChange={(e) => setProfile(prev => ({ 
                          ...prev, 
                          socialLinks: {
                            ...prev.socialLinks,
                            youtube: e.target.value
                          }
                        }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                        placeholder="https://youtube.com/c/channelname"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Facebook
                      </label>
                      <input
                        type="url"
                        value={profile.socialLinks.facebook || ''}
                        onChange={(e) => setProfile(prev => ({ 
                          ...prev, 
                          socialLinks: {
                            ...prev.socialLinks,
                            facebook: e.target.value
                          }
                        }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                        placeholder="https://facebook.com/pagename"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Twitter / X
                      </label>
                      <input
                        type="url"
                        value={profile.socialLinks.twitter || ''}
                        onChange={(e) => setProfile(prev => ({ 
                          ...prev, 
                          socialLinks: {
                            ...prev.socialLinks,
                            twitter: e.target.value
                          }
                        }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                        placeholder="https://twitter.com/username"
                      />
                    </div>
                  </div>
                </section>
              </div>
            </div>
            
            {/* Bottom action bar */}
            <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                onClick={onSubmit}
                disabled={saving}
                className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 flex items-center disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <span className="animate-spin mr-2">⌛</span>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
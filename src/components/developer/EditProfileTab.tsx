import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, Save, X, Upload, AlertCircle, MapPin, Mail, Phone, Globe, Calendar, Users, Instagram, Linkedin, Youtube, Facebook, Twitter, CheckCircle, FileText, Award, Target, Video, Image, DollarSign, Clock, HeartHandshake as Handshake } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { toast } from 'react-hot-toast';
import AddressAutocomplete from '../AddressAutocomplete';

interface DeveloperProfileForm {
  fullName: string;
  introduction: string;
  companyAddress: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  location: string;
  formationDate: string;
  teamSize: number;
  instagram: string;
  linkedin: string;
  youtube: string;
  facebook: string;
  twitter: string;
  yearsFounded: number;
  projectsCompleted: number;
  unitsDelivered: number;
  visionMission: string;
  targetMarkets: string[];
  isDldRegistered: boolean;
  isTrustedAgencyPartner: boolean;
  isMulticountryActive: boolean;
  agentCommission: number;
  paymentTimeline: string;
  heroImageUrl?: string;
  heroVideoUrl?: string;
  commissionTerms?: string;
  commissionTermsUrl?: string;
  agencyAgreementUrl?: string;
  buyerAgreementUrl?: string;
  projectBrochureUrl?: string;
}

interface EditProfileTabProps {
  developerId: string;
}

export default function EditProfileTab({ developerId }: EditProfileTabProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [heroImage, setHeroImage] = useState<File | null>(null);
  const [heroImagePreview, setHeroImagePreview] = useState<string | null>(null);
  const [heroImageUploadProgress, setHeroImageUploadProgress] = useState(0);
  const [heroVideo, setHeroVideo] = useState<File | null>(null); 
  const [heroVideoPreview, setHeroVideoPreview] = useState<string | null>(null);
  const [heroVideoUploadProgress, setHeroVideoUploadProgress] = useState(0);
  const [isHeroImageUploading, setIsHeroImageUploading] = useState(false);
  const [isHeroVideoUploading, setIsHeroVideoUploading] = useState(false);
  const [heroVideoUrl, setHeroVideoUrl] = useState<string>('');

  // Document state variables
  const [uploadingCommissionTerms, setUploadingCommissionTerms] = useState(false);
  const [uploadingAgencyAgreement, setUploadingAgencyAgreement] = useState(false);
  const [uploadingBuyerAgreement, setUploadingBuyerAgreement] = useState(false);
  const [uploadingProjectBrochure, setUploadingProjectBrochure] = useState(false);
  const [commissionTermsProgress, setCommissionTermsProgress] = useState(0);
  const [agencyAgreementProgress, setAgencyAgreementProgress] = useState(0);
  const [buyerAgreementProgress, setBuyerAgreementProgress] = useState(0);
  const [projectBrochureProgress, setProjectBrochureProgress] = useState(0);

  const [formData, setFormData] = useState<DeveloperProfileForm>({
    fullName: '',
    introduction: '',
    companyAddress: '',
    phone: '',
    whatsapp: '',
    email: '',
    website: '',
    location: '',
    formationDate: '',
    teamSize: 0,
    instagram: '',
    linkedin: '',
    youtube: '',
    facebook: '',
    twitter: '',
    yearsFounded: 0,
    projectsCompleted: 0,
    unitsDelivered: 0,
    visionMission: '',
    targetMarkets: [],
    isDldRegistered: false,
    isTrustedAgencyPartner: false,
    isMulticountryActive: false,
    agentCommission: 0,
    paymentTimeline: '',
    heroImageUrl: '',
    heroVideoUrl: '',
    commissionTerms: '',
    commissionTermsUrl: '',
    agencyAgreementUrl: '',
    buyerAgreementUrl: '',
    projectBrochureUrl: '',
  });
  const [newTargetMarket, setNewTargetMarket] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const heroImageInputRef = useRef<HTMLInputElement>(null);
  const heroVideoInputRef = useRef<HTMLInputElement>(null);
  const commissionTermsInputRef = useRef<HTMLInputElement>(null);
  const agencyAgreementInputRef = useRef<HTMLInputElement>(null);
  const buyerAgreementInputRef = useRef<HTMLInputElement>(null);
  const projectBrochureInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (developerId) {
      fetchProfile();
    }
  }, [developerId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', developerId)
        .single();
        
      if (fetchError) throw fetchError;
      
      if (data) {
        // Extract developer details from the profile
        const developerDetails = data.developer_details || {};
        
        setFormData({
          fullName: data.full_name || '',
          introduction: data.introduction || '',
          companyAddress: developerDetails.company_address || '',
          phone: developerDetails.phone || '',
          whatsapp: data.whatsapp || developerDetails.whatsapp || '',
          email: data.email || '',
          website: data.agency_website || '',
          location: data.location || '',
          formationDate: data.agency_formation_date || '',
          teamSize: data.agency_team_size || 0,
          instagram: data.instagram || '',
          linkedin: data.linkedin || '',
          youtube: data.youtube || '',
          facebook: data.facebook || '',
          twitter: data.x || '', // Note that 'x' in the database maps to 'twitter' in the UI
          yearsFounded: developerDetails.years_experience || 0,
          projectsCompleted: developerDetails.projects_uae || 0,
          unitsDelivered: developerDetails.units_uae || 0,
          visionMission: developerDetails.vision_mission || '',
          targetMarkets: developerDetails.target_markets || [],
          isDldRegistered: developerDetails.is_dld_registered || false,
          isTrustedAgencyPartner: developerDetails.is_trusted_agency_partner || false,
          isMulticountryActive: developerDetails.is_multicountry_active || false,
          agentCommission: developerDetails.agent_commission || 0,
          paymentTimeline: developerDetails.payment_timeline || '',
          heroImageUrl: developerDetails.hero_image_url || '',
          heroVideoUrl: developerDetails.hero_video_url || '',
          commissionTerms: developerDetails.commission_terms || '',
          commissionTermsUrl: developerDetails.commission_terms_url || '',
          agencyAgreementUrl: developerDetails.agency_agreement_url || '',
          buyerAgreementUrl: developerDetails.buyer_agreement_url || '',
          projectBrochureUrl: developerDetails.project_brochure_url || '',
        });
        
        setAvatarPreview(data.avatar_url || null);
        setHeroImagePreview(developerDetails.hero_image_url || null);
        setHeroVideoPreview(developerDetails.hero_video_url || null);
        setHeroVideoUrl(developerDetails.hero_video_url || '');
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Handle checkbox inputs differently
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Please upload a JPG, PNG, or WebP image');
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image size must be less than 2MB');
      return;
    }

    setAvatar(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleHeroImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Please upload a JPG, PNG, or WebP image');
      return;
    }

    // Validate file size (20MB)
    if (file.size > 20 * 1024 * 1024) {
      setError('Image size must be less than 20MB');
      return;
    }

    setHeroImage(file);
    setHeroImagePreview(URL.createObjectURL(file));
    
    try {
      setIsHeroImageUploading(true);
      setHeroImageUploadProgress(0);
      
      // Create upload progress tracker
      const interval = setInterval(() => {
        setHeroImageUploadProgress(prev => {
          if (prev >= 95) {
            clearInterval(interval);
            return 95;
          }
          return prev + 5;
        });
      }, 300);
      
      // Upload file
      const fileExt = file.name.split('.').pop();
      const fileName = `hero-images/${developerId}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('developer-files')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });
      
      clearInterval(interval);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('developer-files')
        .getPublicUrl(fileName);
      
      setFormData(prev => ({
        ...prev,
        heroImageUrl: publicUrl
      }));
      
      setHeroImageUploadProgress(100);
      toast.success('Hero image uploaded successfully');
    } catch (err) {
      console.error('Error uploading hero image:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload hero image');
    } finally {
      setIsHeroImageUploading(false);
    }
  };

  const handleHeroVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      setError('Please upload a valid video file');
      return;
    }

    // Validate file size (500MB)
    if (file.size > 500 * 1024 * 1024) {
      setError('Video size must be less than 500MB');
      return;
    }

    setHeroVideo(file);
    setHeroVideoPreview(URL.createObjectURL(file));
    
    try {
      setIsHeroVideoUploading(true);
      setHeroVideoUploadProgress(0);
      
      // Create upload progress tracker
      const interval = setInterval(() => {
        setHeroVideoUploadProgress(prev => {
          if (prev >= 95) {
            clearInterval(interval);
            return 95;
          }
          return prev + 2; // Slower progress for video since it's larger
        });
      }, 500);
      
      // Upload file
      const fileExt = file.name.split('.').pop();
      const fileName = `hero-videos/${developerId}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('developer-files')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });
      
      clearInterval(interval);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('developer-files')
        .getPublicUrl(fileName);
      
      setFormData(prev => ({
        ...prev,
        heroVideoUrl: publicUrl
      }));
      
      setHeroVideoUploadProgress(100);
      toast.success('Hero video uploaded successfully');
    } catch (err) {
      console.error('Error uploading hero video:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload hero video');
    } finally {
      setIsHeroVideoUploading(false);
    }
  };

  const handleHeroVideoUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setHeroVideoUrl(url);
    setFormData(prev => ({
      ...prev,
      heroVideoUrl: url
    }));
  };

  // Document upload functions
  const handleDocumentUpload = async (
    file: File,
    stateUpdater: React.Dispatch<React.SetStateAction<boolean>>,
    progressUpdater: React.Dispatch<React.SetStateAction<number>>,
    formField: string,
    folderName: string
  ) => {
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf' && !file.type.includes('officedocument')) {
      setError('Please upload a PDF or Word document');
      return;
    }

    // Validate file size (100MB)
    if (file.size > 100 * 1024 * 1024) {
      setError('File size must be less than 100MB');
      return;
    }

    try {
      stateUpdater(true);
      progressUpdater(0);
      
      // Create upload progress tracker
      const interval = setInterval(() => {
        progressUpdater(prev => {
          if (prev >= 95) {
            clearInterval(interval);
            return 95;
          }
          return prev + 5;
        });
      }, 300);
      
      // Upload file
      const fileExt = file.name.split('.').pop();
      const fileName = `${folderName}/${developerId}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('developer-files')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });
      
      clearInterval(interval);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('developer-files')
        .getPublicUrl(fileName);
      
      setFormData(prev => ({
        ...prev,
        [formField]: publicUrl
      }));
      
      progressUpdater(100);
      toast.success(`Document uploaded successfully`);
    } catch (err) {
      console.error(`Error uploading document:`, err);
      setError(err instanceof Error ? err.message : 'Failed to upload document');
    } finally {
      stateUpdater(false);
    }
  };

  const handleCommissionTermsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleDocumentUpload(
        file,
        setUploadingCommissionTerms,
        setCommissionTermsProgress,
        'commissionTermsUrl',
        'commission-terms'
      );
    }
  };

  const handleAgencyAgreementUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleDocumentUpload(
        file,
        setUploadingAgencyAgreement,
        setAgencyAgreementProgress,
        'agencyAgreementUrl',
        'agency-agreements'
      );
    }
  };

  const handleBuyerAgreementUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleDocumentUpload(
        file,
        setUploadingBuyerAgreement,
        setBuyerAgreementProgress,
        'buyerAgreementUrl',
        'buyer-agreements'
      );
    }
  };

  const handleProjectBrochureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleDocumentUpload(
        file,
        setUploadingProjectBrochure,
        setProjectBrochureProgress,
        'projectBrochureUrl',
        'project-brochures'
      );
    }
  };

  const removeDocument = async (field: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: ''
    }));
    toast.success('Document removed');
  };

  const handleAddTargetMarket = () => {
    if (newTargetMarket.trim()) {
      setFormData(prev => ({
        ...prev,
        targetMarkets: [...prev.targetMarkets, newTargetMarket.trim()]
      }));
      setNewTargetMarket('');
    }
  };

  const handleRemoveTargetMarket = (index: number) => {
    setFormData(prev => ({
      ...prev,
      targetMarkets: prev.targetMarkets.filter((_, i) => i !== index)
    }));
  };

  const handleMapLocationSelect = (address: string, lat?: number, lng?: number) => {
    setFormData(prev => ({ ...prev, companyAddress: address }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      // Upload avatar if provided
      let avatarUrl = avatarPreview;
      if (avatar) {
        const fileExt = avatar.name.split('.').pop();
        const filePath = `${developerId}-avatar.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatar, { upsert: true });
          
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);
          
        avatarUrl = publicUrl;
      }

      // Build developer details object
      const developerDetails = {
        company_name: formData.fullName,
        company_address: formData.companyAddress,
        headquarters_address: formData.companyAddress,
        phone: formData.phone,
        whatsapp: formData.whatsapp,
        years_experience: formData.yearsFounded,
        projects_uae: formData.projectsCompleted,
        units_uae: formData.unitsDelivered,
        vision_mission: formData.visionMission,
        target_markets: formData.targetMarkets,
        is_dld_registered: formData.isDldRegistered,
        is_trusted_agency_partner: formData.isTrustedAgencyPartner,
        is_multicountry_active: formData.isMulticountryActive,
        agent_commission: formData.agentCommission,
        payment_timeline: formData.paymentTimeline,
        commission_terms: formData.commissionTerms,
        hero_image_url: formData.heroImageUrl,
        hero_video_url: formData.heroVideoUrl || heroVideoUrl,
        commission_terms_url: formData.commissionTermsUrl,
        agency_agreement_url: formData.agencyAgreementUrl,
        buyer_agreement_url: formData.buyerAgreementUrl,
        project_brochure_url: formData.projectBrochureUrl
      };

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.fullName,
          introduction: formData.introduction,
          whatsapp: formData.whatsapp,
          location: formData.location,
          avatar_url: avatarUrl,
          agency_website: formData.website,
          agency_formation_date: formData.formationDate,
          agency_team_size: formData.teamSize,
          instagram: formData.instagram,
          linkedin: formData.linkedin,
          youtube: formData.youtube,
          facebook: formData.facebook,
          x: formData.twitter, // 'twitter' in the UI maps to 'x' in the database
          developer_details: developerDetails,
          updated_at: new Date().toISOString()
        })
        .eq('id', developerId);
        
      if (updateError) throw updateError;

      setSuccess(true);
      toast.success('Profile updated successfully');
      
      // Reset success after a delay
      setTimeout(() => {
        setSuccess(false);
        navigate('/developer-dashboard/projects');
      }, 1500);
      
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Developer Profile</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border-l-4 border-green-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-green-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">Profile updated successfully</p>
              </div>
            </div>
          </div>
        )}

        {/* Company Logo */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Company Logo
          </label>
          <div className="mt-1 flex items-center">
            <div className="flex-shrink-0 h-16 w-16 relative rounded-md overflow-hidden border border-gray-200">
              {avatarPreview ? (
                <img 
                  src={avatarPreview} 
                  alt="Company Logo" 
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-gray-100 flex items-center justify-center">
                  <Building className="h-8 w-8 text-gray-400" />
                </div>
              )}
            </div>
            <label className="ml-4 bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">
              Upload
              <input
                type="file"
                className="sr-only"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarChange}
                ref={fileInputRef}
              />
            </label>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            JPG, PNG, or WebP. 2MB max.
          </p>
        </div>

        {/* Hero Image Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Hero Image
          </label>
          <div className="mt-1">
            {heroImagePreview ? (
              <div className="relative">
                <img
                  src={heroImagePreview}
                  alt="Hero"
                  className="h-48 w-full object-cover rounded-lg"
                />
                <div className="absolute top-2 right-2 flex space-x-2">
                  <a
                    href={heroImagePreview}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70"
                  >
                    <Image className="h-5 w-5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setHeroImage(null);
                      setHeroImagePreview(null);
                      setFormData(prev => ({ ...prev, heroImageUrl: '' }));
                    }}
                    className="p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer"
                  onClick={() => heroImageInputRef.current?.click()}
                >
                  <Image className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-2">
                    <p className="text-sm font-medium text-gray-900">Upload a hero image</p>
                    <p className="text-xs text-gray-500">PNG, JPG, WebP up to 20MB</p>
                  </div>
                  <input 
                    ref={heroImageInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleHeroImageChange}
                    accept="image/jpeg, image/png, image/webp"
                  />
                </div>
                
                {isHeroImageUploading && (
                  <div className="mt-2">
                    <div className="bg-gray-200 rounded-full h-2.5 w-full">
                      <div 
                        className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${heroImageUploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 text-right mt-1">
                      {heroImageUploadProgress < 100 
                        ? `Uploading... ${heroImageUploadProgress}%`
                        : 'Upload complete!'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Hero Video Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Hero Video
          </label>
          <div className="mt-1 space-y-4">
            {/* Upload file section */}
            {!heroVideoPreview ? (
              <div className="relative">
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer"
                  onClick={() => heroVideoInputRef.current?.click()}
                >
                  <Video className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-2">
                    <p className="text-sm font-medium text-gray-900">Upload a hero video</p>
                    <p className="text-xs text-gray-500">MP4, MOV, up to 500MB</p>
                  </div>
                  <input 
                    ref={heroVideoInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleHeroVideoChange}
                    accept="video/*"
                  />
                </div>
                
                {isHeroVideoUploading && (
                  <div className="mt-2">
                    <div className="bg-gray-200 rounded-full h-2.5 w-full">
                      <div 
                        className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${heroVideoUploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 text-right mt-1">
                      {heroVideoUploadProgress < 100 
                        ? `Uploading... ${heroVideoUploadProgress}%`
                        : 'Upload complete!'}
                    </p>
                  </div>
                )}
                
                {/* Or text between upload and URL input */}
                <div className="relative mt-4 mb-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-2 bg-white text-sm text-gray-500">Or paste video URL</span>
                  </div>
                </div>
                
                {/* Video URL input */}
                <div>
                  <input
                    type="url"
                    value={heroVideoUrl}
                    onChange={handleHeroVideoUrlChange}
                    placeholder="https://example.com/your-video.mp4"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Paste a direct URL to a video file or YouTube/Vimeo embed link
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative">
                {heroVideoPreview.includes('youtube.com') || heroVideoPreview.includes('vimeo.com') ? (
                  <div className="aspect-video">
                    <iframe
                      src={heroVideoPreview}
                      className="w-full h-full rounded-lg"
                      allowFullScreen
                    ></iframe>
                  </div>
                ) : (
                  <video
                    src={heroVideoPreview}
                    controls
                    className="w-full rounded-lg aspect-video"
                  >
                    Your browser does not support the video tag.
                  </video>
                )}
                <div className="absolute top-2 right-2 flex space-x-2">
                  <a
                    href={heroVideoPreview}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70"
                  >
                    <Video className="h-5 w-5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setHeroVideo(null);
                      setHeroVideoPreview(null);
                      setHeroVideoUrl('');
                      setFormData(prev => ({ ...prev, heroVideoUrl: '' }));
                    }}
                    className="p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Company Name */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
              Company Name <span className="text-red-500">*</span>
            </label>
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Building className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black sm:text-sm"
              />
            </div>
          </div>

          {/* Company Address */}
          <div>
            <label htmlFor="companyAddress" className="block text-sm font-medium text-gray-700 mb-1">
              Company Address <span className="text-red-500">*</span>
            </label>
            <div className="mt-1">
              <AddressAutocomplete
                value={formData.companyAddress}
                onChange={handleMapLocationSelect}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                readOnly
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Email cannot be changed. Contact support for assistance.
            </p>
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                placeholder="+971"
              />
            </div>
          </div>

          {/* WhatsApp */}
          <div>
            <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700 mb-1">
              WhatsApp Number
            </label>
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="tel"
                id="whatsapp"
                name="whatsapp"
                value={formData.whatsapp}
                onChange={handleChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                placeholder="+971"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Leave empty if same as phone number
            </p>
          </div>

          {/* Website */}
          <div>
            <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
              Website
            </label>
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Globe className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="url"
                id="website"
                name="website"
                value={formData.website}
                onChange={handleChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                placeholder="https://"
              />
            </div>
          </div>

          {/* Formation Date */}
          <div>
            <label htmlFor="formationDate" className="block text-sm font-medium text-gray-700 mb-1">
              Company Formation Date
            </label>
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="date"
                id="formationDate"
                name="formationDate"
                value={formData.formationDate}
                onChange={handleChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
              />
            </div>
          </div>

          {/* Team Size */}
          <div>
            <label htmlFor="teamSize" className="block text-sm font-medium text-gray-700 mb-1">
              Team Size
            </label>
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Users className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="number"
                id="teamSize"
                name="teamSize"
                value={formData.teamSize}
                onChange={handleChange}
                min="0"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
              />
            </div>
          </div>

          {/* Years Founded */}
          <div>
            <label htmlFor="yearsFounded" className="block text-sm font-medium text-gray-700 mb-1">
              Years of Experience
            </label>
            <div className="relative rounded-md shadow-sm">
              <input
                type="number"
                id="yearsFounded"
                name="yearsFounded"
                value={formData.yearsFounded}
                onChange={handleChange}
                min="0"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
              />
            </div>
          </div>

          {/* Projects Completed */}
          <div>
            <label htmlFor="projectsCompleted" className="block text-sm font-medium text-gray-700 mb-1">
              Projects Completed in UAE
            </label>
            <div className="relative rounded-md shadow-sm">
              <input
                type="number"
                id="projectsCompleted"
                name="projectsCompleted"
                value={formData.projectsCompleted}
                onChange={handleChange}
                min="0"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
              />
            </div>
          </div>

          {/* Units Delivered */}
          <div>
            <label htmlFor="unitsDelivered" className="block text-sm font-medium text-gray-700 mb-1">
              Units Delivered in UAE
            </label>
            <div className="relative rounded-md shadow-sm">
              <input
                type="number"
                id="unitsDelivered"
                name="unitsDelivered"
                value={formData.unitsDelivered}
                onChange={handleChange}
                min="0"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Introduction */}
        <div>
          <label htmlFor="introduction" className="block text-sm font-medium text-gray-700 mb-1">
            Company Introduction
          </label>
          <div className="mt-1">
            <textarea
              id="introduction"
              name="introduction"
              rows={4}
              value={formData.introduction}
              onChange={handleChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
              placeholder="Write a brief introduction about your company..."
            />
          </div>
        </div>

        {/* Vision & Mission */}
        <div>
          <label htmlFor="visionMission" className="block text-sm font-medium text-gray-700 mb-1">
            Vision & Mission
          </label>
          <div className="mt-1">
            <textarea
              id="visionMission"
              name="visionMission"
              rows={4}
              value={formData.visionMission}
              onChange={handleChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
              placeholder="Describe your company's vision and mission..."
            />
          </div>
        </div>

        {/* Target Markets */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Target Markets
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {formData.targetMarkets.map((market, index) => (
              <div key={index} className="flex items-center bg-gray-100 rounded-full py-1 px-3">
                <span className="text-sm text-gray-800">{market}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTargetMarket(index)}
                  className="ml-2 text-gray-500 hover:text-gray-700"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex">
            <div className="relative flex-grow">
              <Target className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={newTargetMarket}
                onChange={(e) => setNewTargetMarket(e.target.value)}
                placeholder="Add a target market (e.g., Luxury, First-Time Buyers)"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
              />
            </div>
            <button
              type="button"
              onClick={handleAddTargetMarket}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-r-md border-t border-r border-b border-gray-300 hover:bg-gray-200"
            >
              Add
            </button>
          </div>
        </div>

        {/* Commission & Agreements Section */}
        <div className="pt-6 border-t border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Handshake className="h-5 w-5 text-gray-500 mr-2" />
            Commission & Agreements
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Agent Commission */}
            <div>
              <label htmlFor="agentCommission" className="block text-sm font-medium text-gray-700 mb-1">
                Agent Commission Rate (%)
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DollarSign className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="number"
                  id="agentCommission"
                  name="agentCommission"
                  value={formData.agentCommission}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.5"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                />
              </div>
            </div>

            {/* Payment Timeline */}
            <div>
              <label htmlFor="paymentTimeline" className="block text-sm font-medium text-gray-700 mb-1">
                Payment Timeline
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Clock className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  id="paymentTimeline"
                  name="paymentTimeline"
                  value={formData.paymentTimeline}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                >
                  <option value="">Select Timeline</option>
                  <option value="on_booking">On Booking</option>
                  <option value="30_days">Within 30 Days</option>
                  <option value="60_days">Within 60 Days</option>
                  <option value="on_completion">On Completion</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>

            {/* Commission Terms */}
            <div className="md:col-span-2">
              <label htmlFor="commissionTerms" className="block text-sm font-medium text-gray-700 mb-1">
                Commission Payment Terms
              </label>
              <textarea
                id="commissionTerms"
                name="commissionTerms"
                rows={3}
                value={formData.commissionTerms}
                onChange={handleChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                placeholder="Describe your commission payment terms..."
              />
            </div>
          </div>

          {/* Document Uploads */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Commission Terms Document */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Commission Terms Document
              </label>
              {formData.commissionTermsUrl ? (
                <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-500 mr-2" />
                    <span className="text-sm truncate max-w-[180px]">Commission Terms Document</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <a
                      href={formData.commissionTermsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <FileText className="h-5 w-5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => removeDocument('commissionTermsUrl')}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block w-full cursor-pointer">
                    <div className="flex justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400">
                      <div className="space-y-1 text-center">
                        <Upload className="mx-auto h-8 w-8 text-gray-400" />
                        <div className="text-sm text-gray-600">
                          <span className="font-medium text-black hover:underline">Upload document</span>
                        </div>
                        <p className="text-xs text-gray-500">PDF or DOC up to 100MB</p>
                      </div>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      ref={commissionTermsInputRef}
                      onChange={handleCommissionTermsUpload}
                      accept=".pdf,.doc,.docx"
                    />
                  </label>
                  {uploadingCommissionTerms && (
                    <div className="mt-2">
                      <div className="bg-gray-200 rounded-full h-1">
                        <div 
                          style={{ width: `${commissionTermsProgress}%` }} 
                          className="bg-black h-1 rounded-full transition-all"
                        ></div>
                      </div>
                      <p className="text-xs text-right mt-1">
                        {commissionTermsProgress < 100 ? 'Uploading...' : 'Upload complete!'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Agency Agreement */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Agency Agreement Template
              </label>
              {formData.agencyAgreementUrl ? (
                <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-500 mr-2" />
                    <span className="text-sm truncate max-w-[180px]">Agency Agreement</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <a
                      href={formData.agencyAgreementUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <FileText className="h-5 w-5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => removeDocument('agencyAgreementUrl')}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block w-full cursor-pointer">
                    <div className="flex justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400">
                      <div className="space-y-1 text-center">
                        <Upload className="mx-auto h-8 w-8 text-gray-400" />
                        <div className="text-sm text-gray-600">
                          <span className="font-medium text-black hover:underline">Upload document</span>
                        </div>
                        <p className="text-xs text-gray-500">PDF or DOC up to 100MB</p>
                      </div>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      ref={agencyAgreementInputRef}
                      onChange={handleAgencyAgreementUpload}
                      accept=".pdf,.doc,.docx"
                    />
                  </label>
                  {uploadingAgencyAgreement && (
                    <div className="mt-2">
                      <div className="bg-gray-200 rounded-full h-1">
                        <div 
                          style={{ width: `${agencyAgreementProgress}%` }} 
                          className="bg-black h-1 rounded-full transition-all"
                        ></div>
                      </div>
                      <p className="text-xs text-right mt-1">
                        {agencyAgreementProgress < 100 ? 'Uploading...' : 'Upload complete!'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Buyer Agreement */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buyer Agreement Template
              </label>
              {formData.buyerAgreementUrl ? (
                <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-500 mr-2" />
                    <span className="text-sm truncate max-w-[180px]">Buyer Agreement</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <a
                      href={formData.buyerAgreementUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <FileText className="h-5 w-5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => removeDocument('buyerAgreementUrl')}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block w-full cursor-pointer">
                    <div className="flex justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400">
                      <div className="space-y-1 text-center">
                        <Upload className="mx-auto h-8 w-8 text-gray-400" />
                        <div className="text-sm text-gray-600">
                          <span className="font-medium text-black hover:underline">Upload document</span>
                        </div>
                        <p className="text-xs text-gray-500">PDF or DOC up to 100MB</p>
                      </div>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      ref={buyerAgreementInputRef}
                      onChange={handleBuyerAgreementUpload}
                      accept=".pdf,.doc,.docx"
                    />
                  </label>
                  {uploadingBuyerAgreement && (
                    <div className="mt-2">
                      <div className="bg-gray-200 rounded-full h-1">
                        <div 
                          style={{ width: `${buyerAgreementProgress}%` }} 
                          className="bg-black h-1 rounded-full transition-all"
                        ></div>
                      </div>
                      <p className="text-xs text-right mt-1">
                        {buyerAgreementProgress < 100 ? 'Uploading...' : 'Upload complete!'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Project Brochure */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Brochure
              </label>
              {formData.projectBrochureUrl ? (
                <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-gray-500 mr-2" />
                    <span className="text-sm truncate max-w-[180px]">Project Brochure</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <a
                      href={formData.projectBrochureUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <FileText className="h-5 w-5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => removeDocument('projectBrochureUrl')}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block w-full cursor-pointer">
                    <div className="flex justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400">
                      <div className="space-y-1 text-center">
                        <Upload className="mx-auto h-8 w-8 text-gray-400" />
                        <div className="text-sm text-gray-600">
                          <span className="font-medium text-black hover:underline">Upload document</span>
                        </div>
                        <p className="text-xs text-gray-500">PDF or DOC up to 100MB</p>
                      </div>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      ref={projectBrochureInputRef}
                      onChange={handleProjectBrochureUpload}
                      accept=".pdf,.doc,.docx"
                    />
                  </label>
                  {uploadingProjectBrochure && (
                    <div className="mt-2">
                      <div className="bg-gray-200 rounded-full h-1">
                        <div 
                          style={{ width: `${projectBrochureProgress}%` }} 
                          className="bg-black h-1 rounded-full transition-all"
                        ></div>
                      </div>
                      <p className="text-xs text-right mt-1">
                        {projectBrochureProgress < 100 ? 'Uploading...' : 'Upload complete!'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Developer Certifications */}
        <div className="md:col-span-2 space-y-3">
          <label className="text-sm font-medium text-gray-700">Developer Certifications</label>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                name="isDldRegistered"
                checked={formData.isDldRegistered}
                onChange={(e) => setFormData(prev => ({ ...prev, isDldRegistered: e.target.checked }))}
                className="h-4 w-4 text-black border-gray-300 rounded focus:ring-black"
              />
              <span>DLD Registered</span>
            </label>
            
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                name="isTrustedAgencyPartner"
                checked={formData.isTrustedAgencyPartner}
                onChange={(e) => setFormData(prev => ({ ...prev, isTrustedAgencyPartner: e.target.checked }))}
                className="h-4 w-4 text-black border-gray-300 rounded focus:ring-black"
              />
              <span>Trusted Agency Partner</span>
            </label>
            
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                name="isMulticountryActive"
                checked={formData.isMulticountryActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isMulticountryActive: e.target.checked }))}
                className="h-4 w-4 text-black border-gray-300 rounded focus:ring-black"
              />
              <span>Multi-Country Active</span>
            </label>
          </div>
        </div>

        {/* Social Media */}
        <div>
          <h4 className="text-base font-medium text-gray-900 mb-3">Social Media</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Instagram */}
            <div>
              <label htmlFor="instagram" className="block text-sm font-medium text-gray-700 mb-1">
                Instagram
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Instagram className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="url"
                  id="instagram"
                  name="instagram"
                  value={formData.instagram}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                  placeholder="https://instagram.com/username"
                />
              </div>
            </div>

            {/* LinkedIn */}
            <div>
              <label htmlFor="linkedin" className="block text-sm font-medium text-gray-700 mb-1">
                LinkedIn
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Linkedin className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="url"
                  id="linkedin"
                  name="linkedin"
                  value={formData.linkedin}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                  placeholder="https://linkedin.com/company/name"
                />
              </div>
            </div>

            {/* YouTube */}
            <div>
              <label htmlFor="youtube" className="block text-sm font-medium text-gray-700 mb-1">
                YouTube
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Youtube className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="url"
                  id="youtube"
                  name="youtube"
                  value={formData.youtube}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                  placeholder="https://youtube.com/c/channelname"
                />
              </div>
            </div>

            {/* Facebook */}
            <div>
              <label htmlFor="facebook" className="block text-sm font-medium text-gray-700 mb-1">
                Facebook
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Facebook className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="url"
                  id="facebook"
                  name="facebook"
                  value={formData.facebook}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                  placeholder="https://facebook.com/pagename"
                />
              </div>
            </div>

            {/* Twitter/X */}
            <div>
              <label htmlFor="twitter" className="block text-sm font-medium text-gray-700 mb-1">
                X (Twitter)
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Twitter className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="url"
                  id="twitter"
                  name="twitter"
                  value={formData.twitter}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
                  placeholder="https://x.com/username"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => navigate('/developer-dashboard')}
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black mr-3"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
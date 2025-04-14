import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Save, 
  X, 
  Upload, 
  Calendar, 
  MapPin, 
  DollarSign, 
  Home,
  Video,
  Image as ImageIcon,
  Plus,
  Trash2,
  Info
} from 'lucide-react';
import AddressAutocomplete from '../AddressAutocomplete';
import { toast } from 'react-hot-toast';
import { supabase } from '../../utils/supabase';
import { format } from 'date-fns';

interface PrelaunchProjectFormProps {
  userId: string;
  onSuccess: () => void;
  onCancel?: () => void;
  initialData?: any;
}

interface UnitType {
  id: string;
  type: string;
  price: number;
}

export default function PrelaunchProjectForm({ 
  userId, 
  onSuccess, 
  onCancel,
  initialData 
}: PrelaunchProjectFormProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchingProject, setFetchingProject] = useState(false);
  
  // Form state
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [location, setLocation] = useState(initialData?.location || '');
  const [mapAddress, setMapAddress] = useState(initialData?.map_address || '');
  const [mapLatitude, setMapLatitude] = useState(initialData?.map_latitude || null);
  const [mapLongitude, setMapLongitude] = useState(initialData?.map_longitude || null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(initialData?.images?.[0] || null);
  const [video, setVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(initialData?.videos?.[0] || null);
  const [launchDate, setLaunchDate] = useState(initialData?.launch_date || '');
  const [eoiAmount, setEoiAmount] = useState(initialData?.eoi_amount?.toString() || '');
  const [releaseProcess, setReleaseProcess] = useState(initialData?.release_process || '');
  const [unitTypes, setUnitTypes] = useState<UnitType[]>(
    initialData?.unit_types?.map((type: string, index: number) => ({
      id: `existing-${index}`,
      type,
      price: 0 // Default price, would need to be updated with actual price data
    })) || []
  );
  
  // Payment plan fields
  const [paymentPlanType, setPaymentPlanType] = useState(initialData?.payment_plan_type || '30/70');
  const [firstPaymentPercent, setFirstPaymentPercent] = useState(initialData?.first_payment_percent?.toString() || '30');
  const [monthlyPaymentPercent, setMonthlyPaymentPercent] = useState(initialData?.monthly_payment_percent?.toString() || '');
  const [monthlyPaymentMonths, setMonthlyPaymentMonths] = useState(initialData?.monthly_payment_months?.toString() || '');
  const [handoverPercent, setHandoverPercent] = useState(initialData?.handover_percent?.toString() || '70');
  const [posthandoverPercent, setPosthandoverPercent] = useState(initialData?.posthandover_percent?.toString() || '');
  const [posthandoverMonths, setPosthandoverMonths] = useState(initialData?.posthandover_months?.toString() || '');
  const [posthandoverYearsAfter, setPosthandoverYearsAfter] = useState(initialData?.posthandover_years_after?.toString() || '');
  
  // Refs for file inputs
  const coverImageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Fetch project data if in edit mode
  useEffect(() => {
    if (initialData?.id) {
      fetchProjectData(initialData.id);
    }
  }, [initialData?.id]);

  const fetchProjectData = async (projectId: string) => {
    try {
      setFetchingProject(true);
      
      // Fetch project details
      const { data: project, error: projectError } = await supabase
        .from('properties')
        .select(`
          *,
          unit_types(*)
        `)
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;

      // Fetch unit types
      const { data: unitTypesData, error: unitTypesError } = await supabase
        .from('unit_types')
        .select('*')
        .eq('project_id', projectId);

      if (unitTypesError) throw unitTypesError;
      
      // Update form state with project data
      setTitle(project.title);
      setDescription(project.description || '');
      setLocation(project.location || '');
      setMapAddress(project.map_address || '');
      setMapLatitude(project.map_latitude || null);
      setMapLongitude(project.map_longitude || null);
      setCoverImagePreview(project.images?.[0] || null);
      setVideoPreview(project.videos?.[0] || null);
      setLaunchDate(project.launch_date || '');
      setEoiAmount(project.eoi_amount?.toString() || '');
      setReleaseProcess(project.release_process || '');
      
      // Extract unit types
      const extractedUnitTypes = unitTypesData?.map((unit: any) => ({
        id: unit.id,
        type: unit.name,
        price: parseInt(unit.price_range?.split('-')[0]?.replace(/[^0-9]/g, '') || '0')
      })) || [];
      
      setUnitTypes(extractedUnitTypes.length > 0 ? extractedUnitTypes : []);
      
      // Extract payment plan details
      setPaymentPlanType(project.payment_plan_type || '30/70');
      setFirstPaymentPercent(project.first_payment_percent?.toString() || '30');
      setMonthlyPaymentPercent(project.monthly_payment_percent?.toString() || '');
      setMonthlyPaymentMonths(project.monthly_payment_months?.toString() || '');
      setHandoverPercent(project.handover_percent?.toString() || '70');
      setPosthandoverPercent(project.posthandover_percent?.toString() || '');
      setPosthandoverMonths(project.posthandover_months?.toString() || '');
      setPosthandoverYearsAfter(project.posthandover_years_after?.toString() || '');
      
      // Set default payment plan values based on type
      if (project.payment_plan_type === '30/70' && !project.first_payment_percent) {
        setFirstPaymentPercent('30');
        setHandoverPercent('70');
      } else if (project.payment_plan_type === '60/40' && !project.first_payment_percent) {
        setFirstPaymentPercent('60');
        setHandoverPercent('40');
      }
    } catch (error) {
      console.error('Error fetching project data:', error);
      toast.error('Failed to load project data');
    } finally {
      setFetchingProject(false);
    }
  };

  const handleAddUnitType = () => {
    setUnitTypes(prev => [...prev, { 
      id: crypto.randomUUID(),
      type: '',
      price: 0
    }]);
  };

  const handleRemoveUnitType = (id: string) => {
    setUnitTypes(prev => prev.filter(unit => unit.id !== id));
  };

  const handleUnitTypeChange = (id: string, field: 'type' | 'price', value: string | number) => {
    setUnitTypes(prev => prev.map(unit => 
      unit.id === id ? { ...unit, [field]: value } : unit
    ));
  };

  const handleLocationSelect = (address: string, lat?: number, lng?: number) => {
    setLocation(address);
    setMapAddress(address);
    
    if (lat && lng) {
      setMapLatitude(lat);
      setMapLongitude(lng);
    }
  };

  const handleCoverImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should not exceed 5MB');
      return;
    }

    setCoverImage(file);
    setCoverImagePreview(URL.createObjectURL(file));
  };

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast.error('Please upload a video file');
      return;
    }

    // Validate file size (50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Video size should not exceed 50MB');
      return;
    }

    setVideo(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const handlePaymentPlanTypeChange = (type: string) => {
    setPaymentPlanType(type);
    
    // Set default values based on plan type
    if (type === '30/70') {
      setFirstPaymentPercent('30');
      setHandoverPercent('70');
      setMonthlyPaymentPercent('');
      setMonthlyPaymentMonths('');
      setPosthandoverPercent('');
      setPosthandoverMonths('');
      setPosthandoverYearsAfter('');
    } else if (type === '60/40') {
      setFirstPaymentPercent('60');
      setHandoverPercent('40');
      setMonthlyPaymentPercent('');
      setMonthlyPaymentMonths('');
      setPosthandoverPercent('');
      setPosthandoverMonths('');
      setPosthandoverYearsAfter('');
    }
    // For 'Custom', leave the current values as is
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);

      // Validation
      if (!title.trim()) {
        throw new Error('Project name is required');
      }
      if (!location.trim()) {
        throw new Error('Location is required');
      }
      if (!coverImage && !coverImagePreview) {
        throw new Error('Cover image is required');
      }
      if (!launchDate) {
        throw new Error('Launch date is required');
      }
      if (unitTypes.length === 0) {
        throw new Error('At least one unit type is required');
      }

      // Upload files if needed
      let coverImageUrl = coverImagePreview;
      let videoUrl = videoPreview;

      if (coverImage) {
        const fileExt = coverImage.name.split('.').pop()?.toLowerCase();
        const fileName = `${userId}/images/${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('properties')
          .upload(fileName, coverImage, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('properties')
          .getPublicUrl(fileName);

        coverImageUrl = publicUrl;
      }

      if (video) {
        const fileExt = video.name.split('.').pop()?.toLowerCase();
        const fileName = `${userId}/videos/${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('properties')
          .upload(fileName, video, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('properties')
          .getPublicUrl(fileName);

        videoUrl = publicUrl;
      }

      // Prepare payment plan data
      const paymentPlanData = {
        payment_plan_type: paymentPlanType,
        first_payment_percent: firstPaymentPercent ? parseFloat(firstPaymentPercent) : null,
        monthly_payment_percent: monthlyPaymentPercent ? parseFloat(monthlyPaymentPercent) : null,
        monthly_payment_months: monthlyPaymentMonths ? parseInt(monthlyPaymentMonths) : null,
        handover_percent: handoverPercent ? parseFloat(handoverPercent) : null,
        posthandover_percent: posthandoverPercent ? parseFloat(posthandoverPercent) : null,
        posthandover_months: posthandoverMonths ? parseInt(posthandoverMonths) : null,
        posthandover_years_after: posthandoverYearsAfter ? parseInt(posthandoverYearsAfter) : null,
      };

      // Prepare data for insertion/update
      const propertyData = {
        title,
        description,
        location,
        map_address: mapAddress,
        map_latitude: mapLatitude,
        map_longitude: mapLongitude,
        is_prelaunch: true,
        type: 'Apartment',  // Default
        contract_type: 'Sale',  // Default
        price: Math.min(...unitTypes.filter(ut => ut.price > 0).map(ut => ut.price) || [0]),
        launch_date: launchDate,
        eoi_amount: eoiAmount ? parseFloat(eoiAmount) : null,
        unit_types: unitTypes.map(ut => ut.type).filter(Boolean),
        release_process: releaseProcess,
        agent_id: userId,
        creator_id: userId,
        creator_type: 'developer',
        images: coverImageUrl ? [coverImageUrl] : [],
        videos: videoUrl ? [videoUrl] : [],
        ...paymentPlanData
      };

      if (initialData?.id) {
        // Update existing project
        const { error: updateError } = await supabase
          .from('properties')
          .update(propertyData)
          .eq('id', initialData.id);

        if (updateError) throw updateError;

        // Update unit types
        for (const unitType of unitTypes) {
          if (unitType.id.startsWith('existing-')) {
            // Skip unit types that are just numbered placeholders
            continue;
          }
          
          if (unitType.id.length > 10) {
            // Update existing unit type
            await supabase
              .from('unit_types')
              .update({
                name: unitType.type,
                price_range: `${unitType.price.toLocaleString()} - ${(unitType.price * 1.1).toFixed(0).toLocaleString()}`
              })
              .eq('id', unitType.id);
          } else if (unitType.type) {
            // Create new unit type
            await supabase
              .from('unit_types')
              .insert({
                project_id: initialData.id,
                developer_id: userId,
                name: unitType.type,
                price_range: `${unitType.price.toLocaleString()} - ${(unitType.price * 1.1).toFixed(0).toLocaleString()}`
              });
          }
        }

        toast.success('Prelaunch project updated successfully');
      } else {
        // Create new project
        const { data: newProject, error: insertError } = await supabase
          .from('properties')
          .insert([propertyData])
          .select();

        if (insertError) throw insertError;

        if (newProject && newProject.length > 0) {
          // Create unit types
          for (const unitType of unitTypes.filter(ut => ut.type)) {
            await supabase
              .from('unit_types')
              .insert({
                project_id: newProject[0].id,
                developer_id: userId,
                name: unitType.type,
                price_range: `${unitType.price.toLocaleString()} - ${(unitType.price * 1.1).toFixed(0).toLocaleString()}`
              });
          }
        }

        toast.success('Prelaunch project created successfully');
      }

      onSuccess();
    } catch (err) {
      console.error('Error saving prelaunch project:', err);
      setError(err instanceof Error ? err.message : 'Failed to save project');
      toast.error(err instanceof Error ? err.message : 'Failed to save project');
    } finally {
      setLoading(false);
    }
  };

  if (fetchingProject) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          {initialData?.id ? 'Edit Prelaunch Project' : 'Prelaunch Project Info'}
        </h1>
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={onCancel || (() => navigate('/developer-dashboard'))}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <X className="h-5 w-5 mr-2" />
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-[#cefa05] text-black rounded-md hover:bg-opacity-90 disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="animate-spin mr-2">⌛</span>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Save Prelaunch
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <X className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Cover Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cover Image <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              {coverImagePreview ? (
                <div className="relative aspect-video rounded-lg overflow-hidden">
                  <img
                    src={coverImagePreview}
                    alt="Cover Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCoverImage(null);
                      setCoverImagePreview(null);
                      if (coverImageInputRef.current) coverImageInputRef.current.value = '';
                    }}
                    className="absolute top-2 right-2 p-1 bg-black bg-opacity-50 rounded-full"
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <ImageIcon className="w-10 h-10 mb-3 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG, or WEBP (MAX. 5MB)</p>
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleCoverImageUpload} 
                    ref={coverImageInputRef}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Video (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Video (Optional)
            </label>
            <div className="relative">
              {videoPreview ? (
                <div className="relative aspect-video rounded-lg overflow-hidden">
                  <video
                    src={videoPreview}
                    controls
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setVideo(null);
                      setVideoPreview(null);
                      if (videoInputRef.current) videoInputRef.current.value = '';
                    }}
                    className="absolute top-2 right-2 p-1 bg-black bg-opacity-50 rounded-full"
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Video className="w-10 h-10 mb-3 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">MP4 or MOV (MAX. 50MB)</p>
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="video/*" 
                    onChange={handleVideoUpload} 
                    ref={videoInputRef}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Project Name */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cefa05] focus:border-transparent"
              placeholder="e.g., Marina Heights Residences"
              required
            />
          </div>

          {/* Location with Google Maps */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location <span className="text-red-500">*</span>
            </label>
            <AddressAutocomplete
              value={location}
              onChange={handleLocationSelect}
            />
            {mapLatitude && mapLongitude && (
              <div className="mt-2 border border-gray-200 rounded-lg h-40 overflow-hidden">
                <iframe 
                  title="Location Map"
                  width="100%" 
                  height="100%" 
                  frameBorder="0" 
                  style={{ border: 0 }}
                  src={`https://www.google.com/maps/embed/v1/place?key=${
                    import.meta.env.VITE_GOOGLE_MAPS_API_KEY
                  }&q=${mapLatitude},${mapLongitude}&zoom=15`} 
                  allowFullScreen 
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cefa05] focus:border-transparent"
              placeholder="Describe the project..."
            />
          </div>

          {/* Starting Prices per Unit Type */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Unit Types & Starting Prices <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleAddUnitType}
                className="text-sm text-black hover:text-gray-700 flex items-center"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Unit Type
              </button>
            </div>
            
            <div className="space-y-3">
              {unitTypes.map((unitType) => (
                <div key={unitType.id} className="flex gap-3">
                  <input
                    type="text"
                    value={unitType.type}
                    onChange={(e) => handleUnitTypeChange(unitType.id, 'type', e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cefa05] focus:border-transparent"
                    placeholder="e.g., 1 Bedroom"
                  />
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="number"
                      value={unitType.price}
                      onChange={(e) => handleUnitTypeChange(unitType.id, 'price', parseFloat(e.target.value) || 0)}
                      className="w-32 pl-10 pr-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cefa05] focus:border-transparent"
                      placeholder="Price"
                      min="0"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveUnitType(unitType.id)}
                    className="p-2 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              ))}
              {unitTypes.length === 0 && (
                <div className="text-sm text-gray-500 italic">No unit types added yet</div>
              )}
            </div>
          </div>

          {/* Payment Plan */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Plan <span className="text-red-500">*</span>
            </label>
            <div className="space-y-4">
              <div>
                <select
                  value={paymentPlanType}
                  onChange={(e) => handlePaymentPlanTypeChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cefa05] focus:border-transparent"
                >
                  <option value="30/70">30/70 Plan</option>
                  <option value="60/40">60/40 Plan</option>
                  <option value="Custom">Custom Plan</option>
                </select>
              </div>
              
              {/* Plan details based on selected type */}
              {paymentPlanType === '30/70' && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-600">First Payment</label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <input
                        type="number"
                        value={firstPaymentPercent}
                        readOnly
                        className="block w-full pr-10 py-2 px-3 border border-gray-300 bg-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-[#cefa05] focus:border-[#cefa05] sm:text-sm"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">%</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Handover</label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <input
                        type="number"
                        value={handoverPercent}
                        readOnly
                        className="block w-full pr-10 py-2 px-3 border border-gray-300 bg-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-[#cefa05] focus:border-[#cefa05] sm:text-sm"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {paymentPlanType === '60/40' && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-600">First Payment</label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <input
                        type="number"
                        value={firstPaymentPercent}
                        readOnly
                        className="block w-full pr-10 py-2 px-3 border border-gray-300 bg-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-[#cefa05] focus:border-[#cefa05] sm:text-sm"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">%</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Handover</label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <input
                        type="number"
                        value={handoverPercent}
                        readOnly
                        className="block w-full pr-10 py-2 px-3 border border-gray-300 bg-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-[#cefa05] focus:border-[#cefa05] sm:text-sm"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {paymentPlanType === 'Custom' && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600">First Payment %</label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <input
                          type="number"
                          value={firstPaymentPercent}
                          onChange={(e) => setFirstPaymentPercent(e.target.value)}
                          className="block w-full pr-10 py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#cefa05] focus:border-[#cefa05] sm:text-sm"
                          placeholder="e.g., 20"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Handover %</label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <input
                          type="number"
                          value={handoverPercent}
                          onChange={(e) => setHandoverPercent(e.target.value)}
                          className="block w-full pr-10 py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#cefa05] focus:border-[#cefa05] sm:text-sm"
                          placeholder="e.g., 40"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Monthly Payment %</label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <input
                          type="number"
                          value={monthlyPaymentPercent}
                          onChange={(e) => setMonthlyPaymentPercent(e.target.value)}
                          className="block w-full pr-10 py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#cefa05] focus:border-[#cefa05] sm:text-sm"
                          placeholder="e.g., 2"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-600">Duration (months)</label>
                      <div className="mt-1">
                        <input
                          type="number"
                          value={monthlyPaymentMonths}
                          onChange={(e) => setMonthlyPaymentMonths(e.target.value)}
                          className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#cefa05] focus:border-[#cefa05] sm:text-sm"
                          placeholder="e.g., 24"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Post Handover (Optional)</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Post-Handover %</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <input
                            type="number"
                            value={posthandoverPercent}
                            onChange={(e) => setPosthandoverPercent(e.target.value)}
                            className="block w-full pr-10 py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#cefa05] focus:border-[#cefa05] sm:text-sm"
                            placeholder="e.g., 20"
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">%</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Duration (months)</label>
                        <div className="mt-1">
                          <input
                            type="number"
                            value={posthandoverMonths}
                            onChange={(e) => setPosthandoverMonths(e.target.value)}
                            className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#cefa05] focus:border-[#cefa05] sm:text-sm"
                            placeholder="e.g., 36"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <label className="block text-sm font-medium text-gray-600">Years after handover</label>
                      <div className="mt-1">
                        <input
                          type="number"
                          value={posthandoverYearsAfter}
                          onChange={(e) => setPosthandoverYearsAfter(e.target.value)}
                          className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#cefa05] focus:border-[#cefa05] sm:text-sm"
                          placeholder="e.g., 2"
                        />
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        Number of years after handover when post-handover payments start.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="mt-2 text-xs text-gray-500 flex items-start">
                <Info className="h-4 w-4 mr-1 flex-shrink-0 mt-0.5" />
                <span>The payment plan will be displayed to potential buyers and agents.</span>
              </div>
            </div>
          </div>

          {/* Launch Date */}
          <div>
            <label htmlFor="launch_date" className="block text-sm font-medium text-gray-700 mb-2">
              Launch Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="date"
                id="launch_date"
                value={launchDate}
                onChange={(e) => setLaunchDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cefa05] focus:border-transparent"
                min={format(new Date(), 'yyyy-MM-dd')}
                required
              />
            </div>
          </div>

          {/* EOI Amount */}
          <div>
            <label htmlFor="eoi_amount" className="block text-sm font-medium text-gray-700 mb-2">
              EOI Amount
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="number"
                id="eoi_amount"
                value={eoiAmount}
                onChange={(e) => setEoiAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cefa05] focus:border-transparent"
                placeholder="e.g., 50000"
                min="0"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Expression of Interest amount required for reservation
            </p>
          </div>

          {/* Release Process */}
          <div>
            <label htmlFor="release_process" className="block text-sm font-medium text-gray-700 mb-2">
              Release Process
            </label>
            <textarea
              id="release_process"
              value={releaseProcess}
              onChange={(e) => setReleaseProcess(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#cefa05] focus:border-transparent"
              placeholder="Describe the release process for units..."
            />
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end pt-6 border-t border-gray-100 mt-8">
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={onCancel || (() => navigate('/developer-dashboard'))}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-[#cefa05] text-black rounded-lg hover:bg-opacity-90 disabled:opacity-50 flex items-center"
          >
            {loading ? (
              <>
                <span className="animate-spin mr-2">⌛</span>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Save Prelaunch
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
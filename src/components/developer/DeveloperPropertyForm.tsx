import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, Save, Video, Image as ImageIcon, MoveUp, Info, FileText, Car } from 'lucide-react';
import AddressAutocomplete from '../AddressAutocomplete';
import { Property } from '../../types';
import { supabase } from '../../utils/supabase';

interface DeveloperPropertyFormProps {
  developerId: string;
  property?: Property;
  onSuccess: () => void;
  onCancel?: () => void;
}

export default function DeveloperPropertyForm({ 
  developerId, 
  property, 
  onSuccess, 
  onCancel 
}: DeveloperPropertyFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Property>>({
    type: 'Apartment',
    contractType: 'Sale',
    images: [],
    videos: [],
    shared: false,
    furnishingStatus: 'Unfurnished',
    completionStatus: 'Off-Plan',
    amenities: [],
    parkingAvailable: false
  });

  // Initialize form with property data if editing
  useEffect(() => {
    if (property) {
      setFormData({
        ...property,
        // Ensure these are set even if not in the property object
        amenities: property.amenities || [],
        videos: property.videos || [],
        parkingAvailable: property.parkingAvailable || false,
        type: property.type || 'Apartment',
        contractType: property.contractType || 'Sale',
        furnishingStatus: property.furnishingStatus || 'Unfurnished',
        completionStatus: property.completionStatus || 'Off-Plan'
      });
      setImages(property.images || []);
      setVideos(property.videos || []);
    }
  }, [property]);

  const amenitiesList = [
    'Balcony',
    'Pool',
    'Gym',
    'Parking',
    'Security',
    'Central A/C',
    'Built-in Wardrobes',
    'Concierge'
  ];

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    try {
      setError(null);
      const uploadedUrls = [];

      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          throw new Error('Please upload only image files');
        }

        if (file.size > 5 * 1024 * 1024) {
          throw new Error('Image size should not exceed 5MB');
        }

        const fileExt = file.name.split('.').pop()?.toLowerCase();
        const fileName = `${developerId}/${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('properties')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('properties')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      setImages(prev => [...prev, ...uploadedUrls]);
      setFormData(prev => ({
        ...prev,
        images: [...(prev.images || []), ...uploadedUrls]
      }));
    } catch (error) {
      console.error('Error uploading images:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload images');
    }
  };

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    try {
      setError(null);
      const uploadedUrls = [];

      for (const file of Array.from(files)) {
        if (!file.type.startsWith('video/')) {
          throw new Error('Please upload only video files');
        }

        if (file.size > 50 * 1024 * 1024) {
          throw new Error('Video size should not exceed 50MB');
        }

        const fileExt = file.name.split('.').pop()?.toLowerCase();
        const fileName = `${developerId}/${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('properties')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('properties')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      setVideos(prev => [...prev, ...uploadedUrls]);
      setFormData(prev => ({
        ...prev,
        videos: [...(prev.videos || []), ...uploadedUrls]
      }));
    } catch (error) {
      console.error('Error uploading videos:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload videos');
    }
  };

  const handleFloorPlanUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError(null);

      if (!file.type.startsWith('image/')) {
        throw new Error('Please upload only image files');
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Image size should not exceed 5MB');
      }

      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${developerId}/floor-plans/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('properties')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('properties')
        .getPublicUrl(fileName);

      setFormData(prev => ({
        ...prev,
        floorPlanImage: publicUrl
      }));
    } catch (error) {
      console.error('Error uploading floor plan:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload floor plan');
    }
  };

  const handleFloorPlanDelete = async () => {
    if (!formData.floorPlanImage) return;

    try {
      const urlParts = formData.floorPlanImage.split('/');
      const filePath = `${developerId}/floor-plans/${urlParts[urlParts.length - 1]}`;

      const { error: deleteError } = await supabase.storage
        .from('properties')
        .remove([filePath]);

      if (deleteError) throw deleteError;

      setFormData(prev => ({
        ...prev,
        floorPlanImage: undefined
      }));
    } catch (error) {
      console.error('Error deleting floor plan:', error);
      setError('Failed to delete floor plan');
    }
  };

  const handleImageDelete = async (imageUrl: string) => {
    try {
      const urlParts = imageUrl.split('/');
      const filePath = `${developerId}/${urlParts[urlParts.length - 1]}`;

      const { error: deleteError } = await supabase.storage
        .from('properties')
        .remove([filePath]);

      if (deleteError) throw deleteError;

      setImages(prev => prev.filter(url => url !== imageUrl));
      setFormData(prev => ({
        ...prev,
        images: prev.images?.filter(url => url !== imageUrl) || []
      }));
    } catch (error) {
      console.error('Error deleting image:', error);
      setError('Failed to delete image');
    }
  };

  const handleVideoDelete = async (videoUrl: string) => {
    try {
      const urlParts = videoUrl.split('/');
      const filePath = `${developerId}/${urlParts[urlParts.length - 1]}`;

      const { error: deleteError } = await supabase.storage
        .from('properties')
        .remove([filePath]);

      if (deleteError) throw deleteError;

      setVideos(prev => prev.filter(url => url !== videoUrl));
      setFormData(prev => ({
        ...prev,
        videos: prev.videos?.filter(url => url !== videoUrl) || []
      }));
    } catch (error) {
      console.error('Error deleting video:', error);
      setError('Failed to delete video');
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;

    const newImages = [...images];
    const draggedImage = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedImage);

    setImages(newImages);
    setFormData(prev => ({ ...prev, images: newImages }));
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleLocationChange = (address: string, lat?: number, lng?: number) => {
    setFormData(prev => ({
      ...prev,
      location: address,
      lat: lat || null,
      lng: lng || null
    }));
  };

  const validateProperty = () => {
    if (!formData.title?.trim()) {
      throw new Error('Title is required');
    }
    if (!formData.description?.trim()) {
      throw new Error('Description is required');
    }
    if (!formData.price || formData.price <= 0) {
      throw new Error('Valid price is required');
    }
    if (!formData.location?.trim()) {
      throw new Error('Location is required');
    }
    if (!formData.images?.length) {
      throw new Error('At least one image is required');
    }
    if (!formData.type) {
      throw new Error('Property type is required');
    }
    if (!formData.contractType) {
      throw new Error('Contract type is required');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);

      validateProperty();

      const propertyData = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        contract_type: formData.contractType,
        price: formData.price,
        location: formData.location,
        bedrooms: formData.bedrooms || null,
        bathrooms: formData.bathrooms || null,
        sqft: formData.sqft || null,
        highlight: formData.highlight || null,
        images: formData.images || [],
        videos: formData.videos || [],
        agent_id: developerId,
        shared: formData.shared || false,
        amenities: formData.amenities || [],
        furnishing_status: formData.furnishingStatus || null,
        completion_status: formData.completionStatus || null,
        lat: formData.lat || null,
        lng: formData.lng || null,
        creator_type: 'developer',
        creator_id: developerId,
        floor_plan_image: formData.floorPlanImage || null,
        parking_available: formData.parkingAvailable || false,
        updated_at: new Date().toISOString()
      };

      if (property?.id) {
        // Update existing property
        const { error: updateError } = await supabase
          .from('properties')
          .update(propertyData)
          .eq('id', property.id);

        if (updateError) throw updateError;
      } else {
        // Create new property
        const { error: insertError } = await supabase
          .from('properties')
          .insert([{
            ...propertyData,
            created_at: new Date().toISOString()
          }]);

        if (insertError) throw insertError;
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving property:', error);
      setError(error instanceof Error ? error.message : 'Failed to save property');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {property ? 'Edit Development' : 'Add New Development'}
        </h1>
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={onCancel || (() => window.history.back())}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <X className="h-5 w-5 mr-2" />
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-primary-300 text-on-primary rounded-md hover:bg-primary-400 disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="animate-spin mr-2">⌛</span>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Save Development
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
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

      {/* Project Information */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Project Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Development Name *
            </label>
            <input
              type="text"
              required
              value={formData.title || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary-300 focus:border-transparent"
              placeholder="e.g., Palm Vista Residences"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project Description *
            </label>
            <textarea
              required
              rows={5}
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary-300 focus:border-transparent"
              placeholder="Provide a detailed description of the development project..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Property Type *
            </label>
            <select
              required
              value={formData.type || 'Apartment'}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as Property['type'] }))}
              className="w-full px-4 py-2.5 rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary-300 focus:border-transparent"
            >
              <option value="Apartment">Apartment</option>
              <option value="House">House</option>
              <option value="Villa">Villa</option>
              <option value="Land">Land</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contract Type *
            </label>
            <select
              required
              value={formData.contractType || 'Sale'}
              onChange={(e) => setFormData(prev => ({ ...prev, contractType: e.target.value as Property['contractType'] }))}
              className="w-full px-4 py-2.5 rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary-300 focus:border-transparent"
            >
              <option value="Sale">For Sale</option>
              <option value="Rent">For Rent</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Starting Price *
            </label>
            <input
              type="number"
              required
              value={formData.price || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
              className="w-full px-4 py-2.5 rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary-300 focus:border-transparent"
              placeholder="Enter starting price"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Completion Status
            </label>
            <select
              value={formData.completionStatus || 'Off-Plan'}
              onChange={(e) => setFormData(prev => ({ ...prev, completionStatus: e.target.value as Property['completionStatus'] }))}
              className="w-full px-4 py-2.5 rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary-300 focus:border-transparent"
            >
              <option value="Ready">Ready</option>
              <option value="Off-Plan">Off-Plan</option>
            </select>
          </div>
        </div>
      </section>

      {/* Location */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Location</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Project Location *
          </label>
          <AddressAutocomplete
            value={formData.location || ''}
            onChange={handleLocationChange}
            error={formData.location === '' ? 'Please select a valid UAE address' : undefined}
          />
          <p className="mt-2 text-sm text-gray-500">
            Select a valid UAE address from the suggestions to ensure accurate map placement
          </p>
        </div>
      </section>

      {/* Details */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Unit Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bedrooms Range
            </label>
            <input
              type="number"
              min="0"
              value={formData.bedrooms || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, bedrooms: Number(e.target.value) }))}
              className="w-full px-4 py-2.5 rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary-300 focus:border-transparent"
              placeholder="Min bedrooms"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bathrooms Range
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={formData.bathrooms || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, bathrooms: Number(e.target.value) }))}
              className="w-full px-4 py-2.5 rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary-300 focus:border-transparent"
              placeholder="Min bathrooms"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Square Feet Range
            </label>
            <input
              type="number"
              min="0"
              value={formData.sqft || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, sqft: Number(e.target.value) }))}
              className="w-full px-4 py-2.5 rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary-300 focus:border-transparent"
              placeholder="Min square feet"
            />
          </div>
        </div>
      </section>

      {/* Amenities */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Development Amenities</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {amenitiesList.map(amenity => (
            <label key={amenity} className="flex items-center space-x-3 group cursor-pointer">
              <input
                type="checkbox"
                checked={formData.amenities?.includes(amenity) || false}
                onChange={(e) => {
                  const currentAmenities = formData.amenities || [];
                  const newAmenities = e.target.checked
                    ? [...currentAmenities, amenity]
                    : currentAmenities.filter(a => a !== amenity);
                  setFormData(prev => ({ ...prev, amenities: newAmenities }));
                }}
                className="w-5 h-5 rounded border-gray-300 text-primary-300 focus:ring-primary-300 transition-colors duration-200"
              />
              <span className="text-gray-600 group-hover:text-gray-900 transition-colors duration-200">
                {amenity}
              </span>
            </label>
          ))}
        </div>
      </section>

      {/* Parking */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Parking</h2>
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="parkingAvailable"
            checked={formData.parkingAvailable || false}
            onChange={(e) =>
              setFormData(prev => ({ ...prev, parkingAvailable: e.target.checked }))
            }
            className="w-5 h-5 rounded border-gray-300 text-primary-300 focus:ring-primary-300"
          />
          <label htmlFor="parkingAvailable" className="flex items-center cursor-pointer">
            <Car className="h-5 w-5 text-gray-400 mr-2" />
            <span>Parking Available</span>
          </label>
        </div>
      </section>

      {/* Floor Plan */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Floor Plan</h2>
        <div className="space-y-4">
          {formData.floorPlanImage ? (
            <div className="relative">
              <img
                src={formData.floorPlanImage}
                alt="Floor Plan"
                className="w-full max-h-[400px] object-contain rounded-lg bg-gray-50"
              />
              <button
                type="button"
                onClick={handleFloorPlanDelete}
                className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="relative block aspect-video border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 cursor-pointer bg-gray-50">
              <input
                type="file"
                accept="image/*"
                onChange={handleFloorPlanUpload}
                className="hidden"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                <FileText className="h-8 w-8 mb-2" />
                <span className="text-sm">Upload Floor Plan</span>
                <span className="text-xs text-gray-400 mt-1">Max size: 5MB</span>
              </div>
            </label>
          )}
        </div>
      </section>

      {/* Photo Gallery */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Project Gallery *</h2>
          <div className="text-sm text-gray-500 flex items-center">
            <MoveUp className="h-4 w-4 mr-1" />
            Drag to reorder
          </div>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <div
                key={index}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`relative aspect-square cursor-move ${
                  draggedIndex === index ? 'opacity-50' : ''
                }`}
              >
                <img
                  src={image}
                  alt={`Property ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => handleImageDelete(image)}
                  className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                >
                  <X className="h-4 w-4" />
                </button>
                {index === 0 && (
                  <div className="absolute bottom-2 left-2 px-2 py-1 bg-blue-600 text-white text-xs rounded">
                    Cover Photo
                  </div>
                )}
              </div>
            ))}
            <label className="relative aspect-square border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 cursor-pointer">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                <ImageIcon className="h-8 w-8 mb-2" />
                <span className="text-sm">Add Photos</span>
              </div>
            </label>
          </div>
        </div>
      </section>

      {/* Videos */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Project Videos</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {videos.map((video, index) => (
              <div key={index} className="relative aspect-video">
                <video
                  src={video}
                  className="w-full h-full object-cover rounded-lg"
                  controls
                />
                <button
                  type="button"
                  onClick={() => handleVideoDelete(video)}
                  className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <label className="relative aspect-video border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 cursor-pointer">
              <input
                type="file"
                multiple
                accept="video/*"
                onChange={handleVideoUpload}
                className="hidden"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                <Video className="h-8 w-8 mb-2" />
                <span className="text-sm">Add Videos</span>
              </div>
            </label>
          </div>
        </div>
      </section>

      {/* Additional Information */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Additional Information</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Project Highlight
          </label>
          <input
            type="text"
            value={formData.highlight || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, highlight: e.target.value }))}
            className="w-full px-4 py-2.5 rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary-300 focus:border-transparent"
            placeholder="e.g., Luxury waterfront development with private marina"
          />
        </div>
      </section>

      {/* Marketplace Sharing */}
      <section className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-start space-x-4">
          <input
            type="checkbox"
            id="shared"
            checked={formData.shared || false}
            onChange={(e) => setFormData(prev => ({ ...prev, shared: e.target.checked }))}
            className="mt-1 w-5 h-5 rounded border-gray-300 text-primary-300 focus:ring-primary-300"
          />
          <div>
            <label htmlFor="shared" className="block text-sm font-medium text-gray-900 mb-1">
              Share on Marketplace
            </label>
            <p className="text-sm text-gray-600">
              I agree to share this development on the marketplace. It will allow agents to market and add your properties in their portfolio. This will increase your chances of closing deals much faster. You agree to share commission according to the marketplace terms.
            </p>
          </div>
          <div className="flex-shrink-0">
            <Info className="h-5 w-5 text-gray-400" />
          </div>
        </div>
      </section>
    </form>
  );
}
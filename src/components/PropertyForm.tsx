import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';

interface PropertyFormProps {
  onSubmit: (formData: any) => void;
  isSubmitting: boolean;
  initialData?: any;
  onCancel?: () => void;
}

export default function PropertyForm({ 
  onSubmit, 
  isSubmitting, 
  initialData = {}, 
  onCancel
}: PropertyFormProps) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: initialData.title || '',
    description: initialData.description || '',
    type: initialData.type || 'Apartment',
    price: initialData.price || '',
    bedrooms: initialData.bedrooms || '',
    bathrooms: initialData.bathrooms || '',
    location: initialData.location || '',
    amenities: initialData.amenities || [],
    images: initialData.images || [],
  });

  const [error, setError] = useState<string | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAmenitiesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      amenities: checked 
        ? [...prev.amenities, value] 
        : prev.amenities.filter(amenity => amenity !== value)
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploadingImages(true);
      setError(null);
      
      const imageUrls = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          console.warn('Skipping non-image file:', file.name);
          continue;
        }
        
        // Upload to Supabase
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        
        const { data, error: uploadError } = await supabase.storage
          .from('properties')
          .upload(`images/${fileName}`, file);
          
        if (uploadError) {
          console.error('Error uploading image:', uploadError);
          continue;
        }
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('properties')
          .getPublicUrl(`images/${fileName}`);
          
        imageUrls.push(publicUrl);
      }
      
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...imageUrls]
      }));
      
    } catch (err) {
      console.error('Error uploading images:', err);
      setError('Failed to upload images. Please try again.');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (formData.images.length === 0) {
        setError('At least one image is required');
        return;
      }
      
      onSubmit({
        title: formData.title,
        description: formData.description,
        type: formData.type,
        contract_type: 'Sale',
        price: parseFloat(formData.price),
        location: formData.location,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
        bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : null,
        amenities: formData.amenities,
        images: formData.images,
      });
    } catch (err) {
      setError('Failed to submit form. Please check all fields.');
      console.error(err);
    }
  };

  // List of common amenities
  const amenitiesList = [
    'Swimming Pool',
    'Gym',
    'Parking',
    'Security',
    'Central AC',
    'Balcony',
    'Garden',
    'Elevator'
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Basic Information */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Property Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              value={formData.title}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#CEFA05] focus:border-[#CEFA05]"
              placeholder="e.g., Modern 2BR Apartment in Downtown"
            />
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              Property Type <span className="text-red-500">*</span>
            </label>
            <select
              id="type"
              name="type"
              required
              value={formData.type}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#CEFA05] focus:border-[#CEFA05]"
            >
              <option value="Apartment">Apartment</option>
              <option value="House">House</option>
              <option value="Villa">Villa</option>
              <option value="Townhouse">Townhouse</option>
              <option value="Penthouse">Penthouse</option>
              <option value="Land">Land</option>
            </select>
          </div>

          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
              Price (AED) <span className="text-red-500">*</span>
            </label>
            <input
              id="price"
              name="price"
              type="number"
              required
              value={formData.price}
              onChange={handleChange}
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#CEFA05] focus:border-[#CEFA05]"
              placeholder="Enter price"
            />
          </div>

          <div>
            <label htmlFor="bedrooms" className="block text-sm font-medium text-gray-700 mb-1">
              Bedrooms
            </label>
            <input
              id="bedrooms"
              name="bedrooms"
              type="number"
              value={formData.bedrooms}
              onChange={handleChange}
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#CEFA05] focus:border-[#CEFA05]"
              placeholder="Number of bedrooms"
            />
          </div>

          <div>
            <label htmlFor="bathrooms" className="block text-sm font-medium text-gray-700 mb-1">
              Bathrooms
            </label>
            <input
              id="bathrooms"
              name="bathrooms"
              type="number"
              value={formData.bathrooms}
              onChange={handleChange}
              min="0"
              step="0.5"
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#CEFA05] focus:border-[#CEFA05]"
              placeholder="Number of bathrooms"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
              Location <span className="text-red-500">*</span>
            </label>
            <input
              id="location"
              name="location"
              type="text"
              required
              value={formData.location}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#CEFA05] focus:border-[#CEFA05]"
              placeholder="Property location"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#CEFA05] focus:border-[#CEFA05]"
              placeholder="Describe the property..."
            ></textarea>
          </div>
        </div>
      </div>

      {/* Amenities */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Amenities</h2>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {amenitiesList.map(amenity => (
            <div key={amenity} className="flex items-center">
              <input
                id={`amenity-${amenity}`}
                name={`amenity-${amenity}`}
                type="checkbox"
                value={amenity}
                checked={formData.amenities.includes(amenity)}
                onChange={handleAmenitiesChange}
                className="h-4 w-4 text-[#CEFA05] border-gray-300 rounded focus:ring-[#CEFA05]"
              />
              <label htmlFor={`amenity-${amenity}`} className="ml-2 block text-sm text-gray-700">
                {amenity}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Property Images */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Property Images <span className="text-red-500">*</span></h2>
        
        {formData.images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
            {formData.images.map((url, index) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                <img src={url} alt={`Property ${index + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  className="absolute top-2 right-2 p-1 bg-black bg-opacity-50 rounded-full hover:bg-opacity-70"
                >
                  <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-4">
          <label className="block">
            <span className="sr-only">Choose property images</span>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-[#CEFA05] file:text-black
                hover:file:bg-opacity-90"
              disabled={uploadingImages}
            />
          </label>
          {uploadingImages && (
            <div className="mt-2 text-sm text-gray-600">
              Uploading images...
            </div>
          )}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel || (() => navigate(-1))}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || uploadingImages}
          className="px-4 py-2 bg-[#CEFA05] text-black rounded-md shadow-sm hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#CEFA05] disabled:opacity-50 flex items-center"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : (
            'Save Property'
          )}
        </button>
      </div>
    </form>
  );
}
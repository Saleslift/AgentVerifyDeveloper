import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, FileText, Calendar, MapPin, DollarSign } from 'lucide-react';
import { supabase } from '../../../utils/supabase';
import AddressAutocomplete from '../../AddressAutocomplete';

interface ProjectFormData {
  title: string;
  location: string;
  description: string;
  handoverDate: string;
  paymentPlan: string;
  brochureUrl?: string;
  brochureFile?: File;
  imageFiles: File[];
}

interface ProjectInfoFormProps {
  projectData: ProjectFormData;
  onChange: (data: Partial<ProjectFormData>) => void;
  onNext: () => void;
}

export default function ProjectInfoForm({ projectData, onChange, onNext }: ProjectInfoFormProps) {
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingBrochure, setUploadingBrochure] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [brochureError, setBrochureError] = useState<string | null>(null);
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const brochureInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploadingImages(true);
      setImageError(null);

      const newImageFiles = [...(projectData.imageFiles || [])];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          throw new Error('Please upload only image files');
        }
        
        // Validate file size (5MB max)
        if (file.size > 120 * 1024 * 1024) {
          throw new Error('Image size should not exceed 120MB');
        }
        
        newImageFiles.push(file);
      }
      
      onChange({ imageFiles: newImageFiles });
      
      // Clear the input
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Error handling image upload:', err);
      setImageError(err instanceof Error ? err.message : 'Failed to process images');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleBrochureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingBrochure(true);
      setBrochureError(null);

      // Validate file type
      if (file.type !== 'application/pdf') {
        throw new Error('Please upload a PDF file for the brochure');
      }
      
      // Validate file size (10MB max)
      if (file.size > 120 * 1024 * 1024) {
        throw new Error('Brochure size should not exceed 120MB');
      }
      
      onChange({ brochureFile: file });
    } catch (err) {
      console.error('Error handling brochure upload:', err);
      setBrochureError(err instanceof Error ? err.message : 'Failed to process brochure');
    } finally {
      setUploadingBrochure(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImageFiles = [...(projectData.imageFiles || [])];
    newImageFiles.splice(index, 1);
    onChange({ imageFiles: newImageFiles });
  };

  const handleRemoveBrochure = () => {
    onChange({ brochureFile: undefined });
    if (brochureInputRef.current) {
      brochureInputRef.current.value = '';
    }
  };

  const handleLocationChange = (address: string, lat?: number, lng?: number) => {
    onChange({ 
      location: address,
    });
  };

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold text-gray-900">Project Information</h2>
      
      {/* Project Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Project Title *
        </label>
        <input
          type="text"
          value={projectData.title || ''}
          onChange={(e) => onChange({ title: e.target.value })}
          className="w-full px-4 py-2.5 rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent"
          placeholder="e.g., Marina Heights Residences"
          required
        />
      </div>
      
      {/* Location */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Location *
        </label>
        <AddressAutocomplete
          value={projectData.location || ''}
          onChange={handleLocationChange}
          error={undefined}
        />
      </div>
      
      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description *
        </label>
        <textarea
          rows={5}
          value={projectData.description || ''}
          onChange={(e) => onChange({ description: e.target.value })}
          className="w-full px-4 py-2.5 rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent"
          placeholder="Provide a detailed description of the project..."
          required
        />
      </div>
      
      {/* Handover Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Handover Date *
        </label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="date"
            value={projectData.handoverDate || ''}
            onChange={(e) => onChange({ handoverDate: e.target.value })}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent"
            required
          />
        </div>
      </div>
      
      {/* Payment Plan */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Payment Plan *
        </label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <select
            value={projectData.paymentPlan || '40/60'}
            onChange={(e) => onChange({ paymentPlan: e.target.value })}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent appearance-none"
            required
          >
            <option value="40/60">40/60</option>
            <option value="50/50">50/50</option>
            <option value="60/40">60/40</option>
            <option value="30/70">30/70</option>
            <option value="Post-Handover">Post-Handover</option>
            <option value="Custom">Custom</option>
          </select>
        </div>
      </div>
      
      {/* Project Images */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Project Images *
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {(projectData.imageFiles || []).map((file, index) => (
            <div key={index} className="relative aspect-square">
              <img
                src={URL.createObjectURL(file)}
                alt={`Project ${index + 1}`}
                className="w-full h-full object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={() => handleRemoveImage(index)}
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
          <label className="relative aspect-square border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 cursor-pointer flex flex-col items-center justify-center">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              ref={imageInputRef}
            />
            <ImageIcon className="h-8 w-8 text-gray-400 mb-2" />
            <span className="text-sm text-gray-500">Add Photos</span>
          </label>
        </div>
        {imageError && (
          <p className="text-sm text-red-600 mt-1">{imageError}</p>
        )}
        <p className="text-xs text-gray-500">
          Upload high-quality images of the project (up to 120MB each). First image will be used as the cover photo.
        </p>
      </div>
      
      {/* Brochure Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Project Brochure (PDF)
        </label>
        {projectData.brochureFile ? (
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <FileText className="h-6 w-6 text-gray-500 mr-3" />
              <div>
                <p className="font-medium">{projectData.brochureFile.name}</p>
                <p className="text-sm text-gray-500">
                  {(projectData.brochureFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemoveBrochure}
              className="text-red-600 hover:text-red-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
            <div className="space-y-1 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="brochure-upload"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-black hover:text-gray-700 focus-within:outline-none"
                >
                  <span>Upload a brochure</span>
                  <input
                    id="brochure-upload"
                    name="brochure-upload"
                    type="file"
                    className="sr-only"
                    accept=".pdf"
                    onChange={handleBrochureUpload}
                    ref={brochureInputRef}
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">PDF up to 120MB</p>
            </div>
          </div>
        )}
        {brochureError && (
          <p className="text-sm text-red-600 mt-1">{brochureError}</p>
        )}
      </div>
      
      {/* Next Button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onNext}
          className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800"
        >
          Next: Unit Types
        </button>
      </div>
    </div>
  );
}
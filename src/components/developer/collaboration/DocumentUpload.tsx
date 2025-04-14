import React, { useState, useRef } from 'react';
import { Upload, X, FileText } from 'lucide-react';

interface DocumentUploadProps {
  onUpload: (file: File) => Promise<void>;
  isUploading: boolean;
  error: string | null;
  accept?: string;
  maxSize?: number; // in MB
}

export default function DocumentUpload({
  onUpload,
  isUploading,
  error,
  accept = '.pdf,.jpg,.jpeg,.png',
  maxSize = 10
}: DocumentUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    // Validate file type
    const fileType = file.type;
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    const acceptedTypes = accept.split(',').map(type => type.trim());
    const isAcceptedType = acceptedTypes.some(type => {
      if (type.startsWith('.')) {
        return `.${fileExtension}` === type;
      }
      return fileType.includes(type.replace('*', ''));
    });
    
    if (!isAcceptedType) {
      alert(`Please upload a valid file type (${accept})`);
      return;
    }
    
    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      alert(`File size must be less than ${maxSize}MB`);
      return;
    }
    
    // Upload file
    onUpload(file);
  };

  const handleButtonClick = () => {
    inputRef.current?.click();
  };

  return (
    <div 
      className={`relative border-2 ${dragActive ? 'border-black bg-gray-50' : 'border-dashed border-gray-300'} rounded-lg p-6 transition-all duration-200`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleChange}
        accept={accept}
      />
      
      <div className="flex flex-col items-center justify-center">
        {isUploading ? (
          <div className="flex flex-col items-center">
            <svg className="animate-spin h-10 w-10 text-gray-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-500">Uploading document...</p>
          </div>
        ) : (
          <>
            <FileText className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-700 font-medium mb-2">Drag and drop your file here</p>
            <p className="text-gray-500 text-sm mb-4">or</p>
            <button
              type="button"
              onClick={handleButtonClick}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
            >
              <Upload className="h-4 w-4 inline mr-2" />
              Browse Files
            </button>
            <p className="text-gray-500 text-xs mt-4">
              Accepted file types: {accept.replace(/\./g, '')} (Max {maxSize}MB)
            </p>
          </>
        )}
      </div>
      
      {error && (
        <div className="mt-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700">
          <div className="flex">
            <X className="h-5 w-5 text-red-500 mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}
    </div>
  );
}
import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, File, Image, Film, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../utils/supabase';

interface FileUploadProps {
  onUpload: (urls: string[]) => void;
  allowedFileTypes?: string[];
  multiple?: boolean;
  maxFileSize?: number; // in MB
  bucket: string;
  folder: string;
  className?: string;
  accepts?: string;
}

interface FileProgress {
  id: string;
  file: File;
  progress: number;
  error: string | null;
  status: 'uploading' | 'complete' | 'error';
  url: string;
}

const FileUploader: React.FC<FileUploadProps> = ({
  onUpload,
  allowedFileTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4'],
  multiple = true,
  maxFileSize,
  bucket,
  folder,
  className = '',
  accepts = '.jpg,.jpeg,.png,.webp,.pdf,.mp4'
}) => {
  const [fileUploads, setFileUploads] = useState<FileProgress[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllers = useRef<Record<string, AbortController>>({});

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="h-5 w-5 text-blue-500" />;
    if (fileType.startsWith('video/')) return <Film className="h-5 w-5 text-purple-500" />;
    return <File className="h-5 w-5 text-gray-500" />;
  };

  const validateFile = (file: File): string | null => {
    if (!allowedFileTypes.includes(file.type)) {
      return `File type ${file.type} is not allowed. Please upload one of: ${allowedFileTypes.join(', ')}`;
    }
    
    if (maxFileSize && file.size > maxFileSize * 1024 * 1024) {
      return `File size exceeds the maximum limit of ${maxFileSize}MB`;
    }
    
    return null;
  };

  const handleFiles = useCallback((files: FileList) => {
    Array.from(files).forEach(file => {
      const fileId = crypto.randomUUID();
      const error = validateFile(file);
      
      // Create a new file upload
      const newFileUpload: FileProgress = {
        id: fileId,
        file,
        progress: 0,
        error,
        status: error ? 'error' : 'uploading',
        url: ''
      };
      
      setFileUploads(prev => [...prev, newFileUpload]);
      
      if (!error) {
        uploadFile(file, fileId);
      }
    });
  }, [maxFileSize, allowedFileTypes]);

  const uploadFile = async (file: File, fileId: string) => {
    // Create a new AbortController for this upload
    const controller = new AbortController();
    abortControllers.current[fileId] = controller;

    try {
      // Format file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${folder}/${crypto.randomUUID()}.${fileExt}`;

      // Handle progress tracking
      let lastLoaded = 0;
      const progressInterval = setInterval(() => {
        setFileUploads(prev => 
          prev.map(item => 
            item.id === fileId && item.status === 'uploading' && item.progress < 95
              ? { ...item, progress: item.progress + 5 }
              : item
          )
        );
      }, 500);

      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(fileName, file, {
            upsert: true
          });

        clearInterval(progressInterval);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(fileName);

        // Update file upload status
        setFileUploads(prev => 
          prev.map(item => 
            item.id === fileId
              ? { ...item, progress: 100, status: 'complete', url: publicUrl }
              : item
          )
        );

        // Collect all completed URLs
        const completedUrls = [
          ...fileUploads.filter(item => item.status === 'complete').map(item => item.url),
          publicUrl
        ];
        
        onUpload(completedUrls);
      } catch (err) {
        clearInterval(progressInterval);
        console.error('Error uploading file:', err);
        
        setFileUploads(prev => 
          prev.map(item => 
            item.id === fileId
              ? { ...item, progress: 0, status: 'error', error: 'Failed to upload file' }
              : item
          )
        );
      }
    } catch (error) {
      console.error('Error in upload process:', error);
    } finally {
      delete abortControllers.current[fileId];
    }
  };

  const cancelUpload = (fileId: string) => {
    const controller = abortControllers.current[fileId];
    if (controller) {
      controller.abort();
      delete abortControllers.current[fileId];
    }
    
    setFileUploads(prev => prev.filter(item => item.id !== fileId));
  };

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
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      // Reset the input value so the same file can be uploaded again if needed
      e.target.value = '';
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={className}>
      <div 
        className={`border-2 ${dragActive ? 'border-primary-300 bg-primary-50' : 'border-dashed border-gray-300'} rounded-lg p-6 transition-colors duration-200`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={accepts}
          onChange={handleChange}
          className="hidden"
        />
        
        <div className="flex flex-col items-center justify-center">
          <Upload className="h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm font-medium text-gray-700">Drag and drop your files here</p>
          <p className="mt-1 text-xs text-gray-500">
            or <button type="button" onClick={handleButtonClick} className="text-primary-600 hover:text-primary-800 focus:outline-none">browse from your device</button>
          </p>
          {maxFileSize && (
            <p className="mt-1 text-xs text-gray-400">
              Maximum file size: {maxFileSize}MB
            </p>
          )}
          <p className="mt-1 text-xs text-gray-400">
            Supported formats: {accepts.split(',').join(', ')}
          </p>
        </div>
      </div>

      {/* File Uploads */}
      {fileUploads.length > 0 && (
        <div className="mt-4 space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Files</h4>
          <div className="space-y-2">
            {fileUploads.map(fileUpload => (
              <div 
                key={fileUpload.id} 
                className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-md"
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  {getFileIcon(fileUpload.file.type)}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {fileUpload.file.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {(fileUpload.file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>

                {fileUpload.status === 'uploading' && (
                  <>
                    <div className="w-24 bg-gray-200 rounded-full h-2.5 mr-3">
                      <div
                        className="bg-primary-600 h-2.5 rounded-full"
                        style={{ width: `${fileUpload.progress}%` }}
                      ></div>
                    </div>
                    <button
                      type="button"
                      onClick={() => cancelUpload(fileUpload.id)}
                      className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </>
                )}

                {fileUpload.status === 'complete' && (
                  <Check className="h-5 w-5 text-green-500" />
                )}

                {fileUpload.status === 'error' && (
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                    <span className="text-xs text-red-500">
                      {fileUpload.error || 'Upload failed'}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
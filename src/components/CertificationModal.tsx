import React, { useState } from 'react';
import { Shield, Upload, X, AlertCircle } from 'lucide-react';

interface CertificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File, name: string, isRera: boolean, reraNumber?: string) => Promise<void>;
  isReraRequired: boolean;
}

export default function CertificationModal({
  isOpen,
  onClose,
  onUpload,
  isReraRequired
}: CertificationModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [reraNumber, setReraNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // For RERA certificates, use "RERA Certificate" as the name
      const certName = isReraRequired ? 'RERA Certificate' : name.trim();

      if (!isReraRequired && !certName) {
        throw new Error('Please enter a certification name');
      }

      if (isReraRequired && !reraNumber.trim()) {
        throw new Error('Please enter your RERA number');
      }

      await onUpload(
        file,
        certName,
        isReraRequired,
        isReraRequired ? reraNumber.trim() : undefined
      );

      // Reset form and close modal
      setFile(null);
      setName('');
      setReraNumber('');
      onClose();
    } catch (err) {
      console.error('Error uploading certification:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload certification');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(selectedFile.type)) {
      setError('Please upload a PDF, JPG, or PNG file');
      return;
    }

    // Validate file size (2MB)
    if (selectedFile.size > 2 * 1024 * 1024) {
      setError('File size must be less than 2MB');
      return;
    }

    setError(null);
    setFile(selectedFile);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold flex items-center">
            {isReraRequired ? (
              <>
                <Shield className="h-6 w-6 text-primary-300 mr-2" />
                Upload RERA Certificate
              </>
            ) : (
              'Upload Certification'
            )}
          </h3>
          <button
            onClick={() => {
              setFile(null);
              setName('');
              setReraNumber('');
              setError(null);
              onClose();
            }}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {isReraRequired ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                RERA Number *
              </label>
              <input
                type="text"
                required
                value={reraNumber}
                onChange={(e) => setReraNumber(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                placeholder="Enter your RERA number"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Certification Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                placeholder="e.g., Real Estate Broker License"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Upload File *
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label className="relative cursor-pointer rounded-md font-medium text-primary-300 hover:text-primary-400">
                    <span>Upload a file</span>
                    <input
                      type="file"
                      className="sr-only"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">
                  PDF, JPG or PNG up to 2MB
                </p>
                {file && (
                  <p className="text-sm text-gray-600 mt-2">
                    Selected: {file.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setName('');
                setReraNumber('');
                setError(null);
                onClose();
              }}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !file || (isReraRequired ? !reraNumber : !name)}
              className="px-4 py-2 bg-primary-300 text-white rounded-lg hover:bg-primary-400 disabled:opacity-50 flex items-center"
            >
              {loading ? (
                <>
                  <span className="animate-spin mr-2">⌛</span>
                  Uploading...
                </>
              ) : (
                'Upload'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
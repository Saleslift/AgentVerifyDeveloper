import React, { useState, useEffect } from 'react';
import { X, Upload, Download, FileText, Check, AlertCircle, Printer } from 'lucide-react';
import { supabase } from '../../../utils/supabase';
import DocumentUpload from './DocumentUpload';
import { toast } from 'react-hot-toast';

interface Agency {
  id: string;
  agency_id: string;
  status: 'pending' | 'active' | 'rejected';
  created_at: string;
  updated_at: string;
  developer_contract_url?: string;
  agency_license_url?: string;
  agency_signed_contract_url?: string;
  agency_registration_url?: string;
  notes?: string;
  agency: {
    id: string;
    full_name: string;
    avatar_url?: string;
    agency_name?: string;
    agency_logo?: string;
    registration_number?: string;
    whatsapp?: string;
    email: string;
    agency_website?: string;
    agency_formation_date?: string;
    agency_team_size?: number;
  };
}

interface ContractModalProps {
  agency: Agency;
  onClose: () => void;
  onUpdate: (contractData: any) => Promise<void>;
}

export default function ContractModal({ agency, onClose, onUpdate }: ContractModalProps) {
  const [notes, setNotes] = useState(agency.notes || '');
  const [developerContractUrl, setDeveloperContractUrl] = useState(agency.developer_contract_url || '');
  const [uploadingDeveloperContract, setUploadingDeveloperContract] = useState(false);
  const [developerContractError, setDeveloperContractError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasDownloadedContract, setHasDownloadedContract] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Prepare update data
      const updateData: any = {
        notes,
        updated_at: new Date().toISOString()
      };
      
      // Only include URLs if they've changed
      if (developerContractUrl !== agency.developer_contract_url) {
        updateData.developer_contract_url = developerContractUrl;
      }
      
      await onUpdate(updateData);
    } catch (error) {
      console.error('Error saving contract:', error);
      toast.error('Failed to save contract');
    } finally {
      setSaving(false);
    }
  };

  const handleDeveloperContractUpload = async (file: File) => {
    try {
      setUploadingDeveloperContract(true);
      setDeveloperContractError(null);
      
      // Validate file type
      if (file.type !== 'application/pdf') {
        throw new Error('Please upload a PDF file');
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size must be less than 10MB');
      }
      
      // Get current user ID
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      // Upload file
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${agency.agency_id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('agency-contracts')
        .upload(fileName, file, {
          contentType: 'application/pdf',
          upsert: false
        });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('agency-contracts')
        .getPublicUrl(fileName);
      
      setDeveloperContractUrl(publicUrl);
    } catch (error) {
      console.error('Error uploading developer contract:', error);
      setDeveloperContractError(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setUploadingDeveloperContract(false);
    }
  };

  const handleContractDownload = () => {
    if (agency.agency_signed_contract_url) {
      // Track that the developer has downloaded the contract
      setHasDownloadedContract(true);
      
      // Open the contract in a new tab for download
      window.open(agency.agency_signed_contract_url, '_blank');
    }
  };

  const canApprove = () => {
    // Developer can only approve if:
    // 1. Agency has uploaded all required documents
    // 2. Developer has downloaded the signed contract (indicating they've reviewed it)
    // 3. Developer has uploaded their own signed version
    return (
      agency.agency_license_url && 
      agency.agency_signed_contract_url && 
      agency.agency_registration_url && 
      hasDownloadedContract &&
      developerContractUrl
    );
  };

  const getRequiredDocsStatus = () => {
    const requiredDocs = [
      { name: 'Business License', uploaded: !!agency.agency_license_url },
      { name: 'Signed Contract', uploaded: !!agency.agency_signed_contract_url },
      { name: 'Business Registration', uploaded: !!agency.agency_registration_url },
    ];
    
    const uploadedCount = requiredDocs.filter(doc => doc.uploaded).length;
    return {
      complete: uploadedCount === requiredDocs.length,
      uploadedCount,
      totalCount: requiredDocs.length,
      missingDocs: requiredDocs.filter(doc => !doc.uploaded).map(doc => doc.name)
    };
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold flex items-center">
            <FileText className="h-5 w-5 mr-2 text-gray-500" />
            Collaboration Documents - {agency.agency?.agency_name || agency.agency?.full_name}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column - Developer Documents */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Developer Documents</h3>
              
              {/* Developer Contract */}
              <div className="mb-6">
                <h4 className="font-medium mb-2 flex items-center">
                  Signed Contract
                  <span className="text-red-500 ml-1">*</span>
                </h4>
                
                {developerContractUrl ? (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-gray-500 mr-3" />
                        <div>
                          <p className="font-medium">Your Signed Contract</p>
                          <p className="text-sm text-gray-500">PDF Document</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <a
                          href={developerContractUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-50"
                        >
                          <Download className="h-5 w-5" />
                        </a>
                        <button
                          onClick={() => setDeveloperContractUrl('')}
                          className="p-2 text-red-600 hover:text-red-800 rounded-full hover:bg-red-50"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <DocumentUpload
                    onUpload={handleDeveloperContractUpload}
                    isUploading={uploadingDeveloperContract}
                    error={developerContractError}
                    accept=".pdf"
                    maxSize={10}
                  />
                )}
                <p className="text-sm text-gray-500 mt-2">
                  Upload your signed contract (PDF format, max 10MB)
                </p>
              </div>
              
              {/* Notes */}
              <div className="mb-6">
                <h4 className="font-medium mb-2">Notes</h4>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  rows={4}
                  placeholder="Add any notes or special instructions for the agency..."
                />
              </div>
              
              {/* Download Agency Contract Button */}
              {agency.agency_signed_contract_url && (
                <div className="mb-6">
                  <button
                    onClick={handleContractDownload}
                    className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    <Download className="h-5 w-5 mr-2" />
                    Download Agency Signed Contract
                  </button>
                  {hasDownloadedContract && (
                    <p className="mt-2 text-sm text-green-600 flex items-center">
                      <Check className="h-4 w-4 mr-1" />
                      Contract downloaded. Please review, sign, and upload above.
                    </p>
                  )}
                </div>
              )}
            </div>
            
            {/* Right Column - Agency Documents */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Agency Documents</h3>
              
              {/* Agency License */}
              <div className="mb-6">
                <h4 className="font-medium mb-2 flex items-center">
                  Business License
                  <span className="text-red-500 ml-1">*</span>
                </h4>
                
                {agency.agency_license_url ? (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-gray-500 mr-3" />
                        <div>
                          <p className="font-medium">Business License</p>
                          <p className="text-sm text-gray-500">PDF Document</p>
                        </div>
                      </div>
                      <a
                        href={agency.agency_license_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-50"
                      >
                        <Download className="h-5 w-5" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 border-dashed">
                    <div className="flex items-center text-gray-500">
                      <AlertCircle className="h-5 w-5 mr-2" />
                      <span>Waiting for agency to upload</span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Signed Contract */}
              <div className="mb-6">
                <h4 className="font-medium mb-2 flex items-center">
                  Signed Contract
                  <span className="text-red-500 ml-1">*</span>
                </h4>
                
                {agency.agency_signed_contract_url ? (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-gray-500 mr-3" />
                        <div>
                          <p className="font-medium">Agency Signed Contract</p>
                          <p className="text-sm text-gray-500">PDF Document</p>
                        </div>
                      </div>
                      <a
                        href={agency.agency_signed_contract_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-50"
                        onClick={handleContractDownload}
                      >
                        <Download className="h-5 w-5" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 border-dashed">
                    <div className="flex items-center text-gray-500">
                      <AlertCircle className="h-5 w-5 mr-2" />
                      <span>Waiting for agency to upload</span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Registration Documents */}
              <div className="mb-6">
                <h4 className="font-medium mb-2 flex items-center">
                  Business Registration
                  <span className="text-red-500 ml-1">*</span>
                </h4>
                
                {agency.agency_registration_url ? (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-gray-500 mr-3" />
                        <div>
                          <p className="font-medium">Business Registration</p>
                          <p className="text-sm text-gray-500">PDF Document</p>
                        </div>
                      </div>
                      <a
                        href={agency.agency_registration_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-50"
                      >
                        <Download className="h-5 w-5" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 border-dashed">
                    <div className="flex items-center text-gray-500">
                      <AlertCircle className="h-5 w-5 mr-2" />
                      <span>Waiting for agency to upload</span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Document Status */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                <h4 className="font-medium mb-2">Document Status</h4>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      agency.agency_license_url ? 'bg-green-500' : 'bg-gray-300'}`}>
                      {agency.agency_license_url && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <span className="ml-2 text-sm">Business License</span>
                  </div>
                  <div className="flex items-center">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      agency.agency_signed_contract_url ? 'bg-green-500' : 'bg-gray-300'}`}>
                      {agency.agency_signed_contract_url && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <span className="ml-2 text-sm">Signed Contract</span>
                  </div>
                  <div className="flex items-center">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      agency.agency_registration_url ? 'bg-green-500' : 'bg-gray-300'}`}>
                      {agency.agency_registration_url && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <span className="ml-2 text-sm">Business Registration</span>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200">
                  {getRequiredDocsStatus().complete ? (
                    <div className="flex items-center">
                      {canApprove() ? (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center bg-green-500">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center bg-yellow-500">
                          <AlertCircle className="h-3 w-3 text-white" />
                        </div>
                      )}
                      <span className="ml-2 text-sm font-medium">
                        {canApprove() ? 
                          'All documents complete - Ready to approve' : 
                          'Agency documents complete - Need your signed contract'}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center bg-yellow-500">
                        <AlertCircle className="h-3 w-3 text-white" />
                      </div>
                      <span className="ml-2 text-sm font-medium">
                        Waiting for agency documents ({getRequiredDocsStatus().uploadedCount}/{getRequiredDocsStatus().totalCount})
                      </span>
                    </div>
                  )}
                  
                  {getRequiredDocsStatus().missingDocs.length > 0 && (
                    <div className="mt-2 text-sm text-gray-500">
                      Missing: {getRequiredDocsStatus().missingDocs.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center"
          >
            {saving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
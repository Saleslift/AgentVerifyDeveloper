import React from 'react';
import { Building2, Calendar, Users, Check, X, FileText, ExternalLink, MessageSquare, Phone, Mail } from 'lucide-react';

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

interface AgencyCardProps {
  agency: Agency;
  onOpenContract: () => void;
  onStatusChange: (agencyId: string, status: 'active' | 'rejected') => void;
}

export default function AgencyCard({ agency, onOpenContract, onStatusChange }: AgencyCardProps) {
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Check if agency has uploaded all required documents
  const hasRequiredDocuments = () => {
    return (
      agency.agency_license_url &&
      agency.agency_signed_contract_url &&
      agency.agency_registration_url
    );
  };

  // Check if developer has uploaded their signed contract
  const hasDeveloperSignedContract = () => {
    return agency.developer_contract_url;
  };

  // Determine if the agency can be approved
  const canApprove = () => {
    return hasRequiredDocuments() && hasDeveloperSignedContract();
  };
  
  // Format WhatsApp number for WhatsApp link
  const formatWhatsAppNumber = (number?: string) => {
    if (!number) return '';
    // Remove spaces, dashes, parentheses, and plus sign
    return number.replace(/[\s\-\(\)\+]/g, '');
  };
  
  // Handle WhatsApp click
  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (agency.agency?.whatsapp) {
      window.open(`https://wa.me/${formatWhatsAppNumber(agency.agency.whatsapp)}`, '_blank');
    }
  };
  
  // Handle call click
  const handleCallClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (agency.agency?.whatsapp) {
      window.location.href = `tel:${agency.agency.whatsapp}`;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
      <div className="p-6">
        {/* Agency Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            {agency.agency?.agency_logo ? (
              <img
                src={agency.agency.agency_logo}
                alt={agency.agency.agency_name || agency.agency.full_name}
                className="w-12 h-12 rounded-full object-cover mr-4"
              />
            ) : (
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mr-4">
                <Building2 className="h-6 w-6 text-gray-500" />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-lg">
                {agency.agency?.agency_name || agency.agency?.full_name}
              </h3>
              <div className="flex items-center mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(agency.status)}`}>
                  {agency.status.charAt(0).toUpperCase() + agency.status.slice(1)}
                </span>
                <span className="text-gray-500 text-xs ml-2">
                  Since {formatDate(agency.created_at)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Buttons */}
        {agency.agency?.whatsapp && (
          <div className="flex space-x-2 mb-4">
            <button
              onClick={handleWhatsAppClick}
              className="flex-1 px-3 py-2 bg-[#cefa05] text-black rounded-md hover:bg-opacity-90 transition-colors flex items-center justify-center"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              WhatsApp
            </button>
            <button
              onClick={handleCallClick}
              className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center justify-center"
            >
              <Phone className="h-4 w-4 mr-2" />
              Call
            </button>
          </div>
        )}

        {/* Agency Details */}
        <div className="space-y-3 mb-4">
          {agency.agency?.registration_number && (
            <div className="flex items-start">
              <FileText className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Registration Number</p>
                <p className="font-medium">{agency.agency.registration_number}</p>
              </div>
            </div>
          )}
          
          {agency.agency?.agency_formation_date && (
            <div className="flex items-start">
              <Calendar className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Established</p>
                <p className="font-medium">{formatDate(agency.agency.agency_formation_date)}</p>
              </div>
            </div>
          )}
          
          {agency.agency?.agency_team_size && (
            <div className="flex items-start">
              <Users className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Team Size</p>
                <p className="font-medium">{agency.agency.agency_team_size} members</p>
              </div>
            </div>
          )}
          
          <div className="flex items-start">
            <Mail className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <a 
                href={`mailto:${agency.agency.email}`}
                className="font-medium text-blue-600 hover:text-blue-800"
              >
                {agency.agency.email}
              </a>
            </div>
          </div>
          
          {agency.agency?.agency_website && (
            <div className="flex items-start">
              <ExternalLink className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Website</p>
                <a 
                  href={agency.agency.agency_website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue-600 hover:text-blue-800"
                >
                  {agency.agency.agency_website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Document Status */}
        <div className="border-t border-gray-100 pt-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium text-sm">Document Status</h4>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${hasRequiredDocuments() ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
              {hasRequiredDocuments() ? 'Documents Uploaded' : 'Incomplete'}
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Business License</span>
              <span className={agency.agency_license_url ? 'text-green-600' : 'text-red-600'}>
                {agency.agency_license_url ? 'Uploaded' : 'Missing'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Signed Contract</span>
              <span className={agency.agency_signed_contract_url ? 'text-green-600' : 'text-red-600'}>
                {agency.agency_signed_contract_url ? 'Uploaded' : 'Missing'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Business Registration</span>
              <span className={agency.agency_registration_url ? 'text-green-600' : 'text-red-600'}>
                {agency.agency_registration_url ? 'Uploaded' : 'Missing'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col space-y-2">
          <button
            onClick={onOpenContract}
            className="w-full px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Manage Documents
          </button>
          
          {agency.status === 'pending' && (
            <div className="flex space-x-2">
              <button
                onClick={() => onStatusChange(agency.id, 'active')}
                disabled={!canApprove()}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center disabled:opacity-50 disabled:hover:bg-green-600"
                title={!canApprove() ? "Upload all required documents first" : ""}
              >
                <Check className="h-4 w-4 mr-2" />
                Approve
              </button>
              <button
                onClick={() => onStatusChange(agency.id, 'rejected')}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
              >
                <X className="h-4 w-4 mr-2" />
                Reject
              </button>
            </div>
          )}
          
          {agency.status === 'rejected' && (
            <button
              onClick={() => onStatusChange(agency.id, 'active')}
              disabled={!canApprove()}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center disabled:opacity-50 disabled:hover:bg-green-600"
              title={!canApprove() ? "Upload all required documents first" : ""}
            >
              <Check className="h-4 w-4 mr-2" />
              Approve Agency
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
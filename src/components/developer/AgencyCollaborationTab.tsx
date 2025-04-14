import React, { useState, useEffect } from 'react';
import { Users, Search, Filter, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../contexts/AuthContext';
import AgencyCard from './collaboration/AgencyCard';
import ContractModal from './collaboration/ContractModal';
import { toast } from 'react-hot-toast';

type FilterStatus = 'all' | 'active' | 'pending' | 'rejected';

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

export default function AgencyCollaborationTab() {
  const { user } = useAuth();
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'status'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [showContractModal, setShowContractModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAgencies();
    }
  }, [user]);

  const fetchAgencies = async () => {
    try {
      setRefreshing(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('developer_agency_contracts')
        .select(`
          *,
          agency:agency_id(
            id,
            full_name,
            avatar_url,
            agency_name,
            agency_logo,
            registration_number,
            whatsapp,
            email,
            agency_website,
            agency_formation_date,
            agency_team_size
          )
        `)
        .eq('developer_id', user?.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setAgencies(data || []);
    } catch (err) {
      console.error('Error fetching agencies:', err);
      setError('Failed to load agency collaborations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleOpenContractModal = (agency: Agency) => {
    setSelectedAgency(agency);
    setShowContractModal(true);
  };

  const handleCloseContractModal = () => {
    setShowContractModal(false);
    setSelectedAgency(null);
  };

  const handleContractUpdate = async (contractData: any) => {
    try {
      if (!selectedAgency) return;

      const { error } = await supabase
        .from('developer_agency_contracts')
        .update(contractData)
        .eq('id', selectedAgency.id);

      if (error) throw error;

      // Refresh the agencies list
      fetchAgencies();
      toast.success('Contract updated successfully');
      handleCloseContractModal();
    } catch (err) {
      console.error('Error updating contract:', err);
      toast.error('Failed to update contract');
    }
  };

  const handleStatusChange = async (agencyId: string, status: 'active' | 'rejected') => {
    try {
      // Get current agency data
      const agency = agencies.find(a => a.id === agencyId);
      
      // Validate required documents for approval
      if (status === 'active') {
        if (!agency?.agency_license_url || !agency?.agency_signed_contract_url || !agency?.agency_registration_url) {
          toast.error('Cannot approve: Agency has not uploaded all required documents');
          return;
        }
        
        if (!agency?.developer_contract_url) {
          toast.error('Cannot approve: You must download, sign and upload the contract first');
          return;
        }
      }
      
      const { error } = await supabase
        .from('developer_agency_contracts')
        .update({ status })
        .eq('id', agencyId);

      if (error) throw error;

      // Update local state
      setAgencies(prev => 
        prev.map(agency => 
          agency.id === agencyId ? { ...agency, status } : agency
        )
      );

      toast.success(`Agency ${status === 'active' ? 'approved' : 'rejected'} successfully`);
    } catch (err) {
      console.error('Error updating agency status:', err);
      toast.error('Failed to update agency status');
    }
  };

  // Filter and sort agencies
  const filteredAgencies = agencies
    .filter(agency => {
      // Apply status filter
      if (statusFilter !== 'all' && agency.status !== statusFilter) return false;
      
      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          agency.agency?.full_name?.toLowerCase().includes(searchLower) ||
          agency.agency?.agency_name?.toLowerCase().includes(searchLower) ||
          agency.agency?.email?.toLowerCase().includes(searchLower) ||
          agency.agency?.registration_number?.toLowerCase().includes(searchLower)
        );
      }
      
      return true;
    })
    .sort((a, b) => {
      // Apply sorting
      if (sortBy === 'date') {
        return sortDirection === 'asc'
          ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      
      if (sortBy === 'name') {
        const nameA = a.agency?.agency_name || a.agency?.full_name || '';
        const nameB = b.agency?.agency_name || b.agency?.full_name || '';
        return sortDirection === 'asc'
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      }
      
      if (sortBy === 'status') {
        const statusOrder = { active: 0, pending: 1, rejected: 2 };
        return sortDirection === 'asc'
          ? statusOrder[a.status] - statusOrder[b.status]
          : statusOrder[b.status] - statusOrder[a.status];
      }
      
      return 0;
    });

  // Count active agencies
  const activeAgenciesCount = agencies.filter(agency => agency.status === 'active').length;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-black"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={fetchAgencies}
              className="mt-2 px-3 py-1 bg-red-100 text-red-800 rounded-md hover:bg-red-200 inline-flex items-center text-sm"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Agency Collaborations</h2>
          <p className="text-gray-500 mt-1">
            {activeAgenciesCount} active {activeAgenciesCount === 1 ? 'agency' : 'agencies'}
          </p>
        </div>
        <button
          onClick={fetchAgencies}
          disabled={refreshing}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search agencies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
          />
        </div>
        
        <div className="flex gap-4">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent appearance-none bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          
          <select
            value={`${sortBy}-${sortDirection}`}
            onChange={(e) => {
              const [field, direction] = e.target.value.split('-');
              setSortBy(field as 'date' | 'name' | 'status');
              setSortDirection(direction as 'asc' | 'desc');
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent appearance-none bg-white"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="status-asc">Status (Active First)</option>
            <option value="status-desc">Status (Pending First)</option>
          </select>
        </div>
      </div>

      {/* Agency Grid */}
      {filteredAgencies.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgencies.map(agency => (
            <AgencyCard
              key={agency.id}
              agency={agency}
              onOpenContract={() => handleOpenContractModal(agency)}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No agencies found</h3>
          <p className="text-gray-500">
            {searchTerm || statusFilter !== 'all'
              ? 'Try adjusting your filters to see more results'
              : 'No agencies have requested collaboration yet'}
          </p>
        </div>
      )}

      {/* Contract Modal */}
      {showContractModal && selectedAgency && (
        <ContractModal
          agency={selectedAgency}
          onClose={handleCloseContractModal}
          onUpdate={handleContractUpdate}
        />
      )}
    </div>
  );
}
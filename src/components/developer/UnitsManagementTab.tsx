import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Edit, 
  Trash2, 
  Plus, 
  X, 
  AlertCircle, 
  CheckCircle2,
  ArrowUpDown,
  FileSpreadsheet,
  ChevronDown
} from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

// Types
interface Unit {
  id: string;
  project_id: string;
  project_title: string;
  type: string;
  size: number;
  price: number;
  availability: 'available' | 'reserved' | 'sold';
}

interface UnitType {
  id: string;
  project_id: string;
  name: string;
  size_range: string;
  price_range: string;
  status: string;
  units_available: number;
}

interface Project {
  id: string;
  title: string;
}

// UnitEditModal Component
interface UnitEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  unit: UnitType | null;
  projects: Project[];
  onSave: (unit: UnitType) => Promise<void>;
}

const UnitEditModal: React.FC<UnitEditModalProps> = ({ isOpen, onClose, unit, projects, onSave }) => {
  const [form, setForm] = useState<UnitType>({
    id: '',
    project_id: '',
    name: '',
    size_range: '',
    price_range: '',
    status: 'available',
    units_available: 1
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (unit) {
      setForm({
        id: unit.id,
        project_id: unit.project_id,
        name: unit.name,
        size_range: unit.size_range,
        price_range: unit.price_range,
        status: unit.status,
        units_available: unit.units_available
      });
    } else {
      setForm({
        id: '',
        project_id: projects.length > 0 ? projects[0].id : '',
        name: '',
        size_range: '',
        price_range: '',
        status: 'available',
        units_available: 1
      });
    }
    setError(null);
  }, [unit, projects]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === 'units_available' ? parseInt(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.project_id || !form.name) {
      setError('Project and Unit Type are required');
      return;
    }

    setLoading(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving unit');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold">{unit ? 'Edit Unit Type' : 'Add Unit Type'}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project
              </label>
              <select
                name="project_id"
                value={form.project_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                required
              >
                {projects.length === 0 ? (
                  <option value="">No projects available</option>
                ) : (
                  projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit Type
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                placeholder="e.g., 1 Bedroom"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Size Range (sqft)
              </label>
              <input
                type="text"
                name="size_range"
                value={form.size_range}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                placeholder="e.g., 750-900"
              />
              <p className="mt-1 text-xs text-gray-500">Format as min-max (e.g., 750-900)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price Range (AED)
              </label>
              <input
                type="text"
                name="price_range"
                value={form.price_range}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                placeholder="e.g., 1,500,000-2,000,000"
              />
              <p className="mt-1 text-xs text-gray-500">Format as min-max (e.g., 1,500,000-2,000,000)</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                >
                  <option value="available">Available</option>
                  <option value="sold out">Sold Out</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Units Available
                </label>
                <input
                  type="number"
                  name="units_available"
                  value={form.units_available}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center"
            >
              {loading ? (
                <>
                  <span className="animate-spin mr-2">⌛</span>
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Main Component
export default function UnitsManagementTab() {
  const { user } = useAuth();
  const [units, setUnits] = useState<UnitType[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<UnitType[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<{
    project: string;
    unitType: string;
    availability: string;
  }>({
    project: '',
    unitType: '',
    availability: ''
  });
  const [sortConfig, setSortConfig] = useState<{
    key: keyof UnitType;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUnit, setCurrentUnit] = useState<UnitType | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [uniqueUnitTypes, setUniqueUnitTypes] = useState<string[]>([]);

  // Fetch data
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch projects first
      const { data: projectsData, error: projectsError } = await supabase
        .from('properties')
        .select('id, title')
        .eq('creator_id', user?.id)
        .eq('creator_type', 'developer');

      if (projectsError) throw projectsError;
      setProjects(projectsData || []);

      // Get project IDs
      const projectIds = projectsData?.map(p => p.id) || [];

      // Fetch unit types for these projects
      const { data: unitTypesData, error: unitTypesError } = await supabase
        .from('unit_types')
        .select(`
          id, 
          project_id,
          name,
          size_range,
          price_range,
          status,
          units_available
        `)
        .in('project_id', projectIds);

      if (unitTypesError) throw unitTypesError;

      // Add project titles to unit types
      const unitsWithProjectTitles = unitTypesData?.map(unit => {
        const project = projectsData?.find(p => p.id === unit.project_id);
        return {
          ...unit,
          project_title: project?.title || 'Unknown Project'
        };
      }) || [];

      setUnits(unitsWithProjectTitles);
      setFilteredUnits(unitsWithProjectTitles);

      // Extract unique unit types for filter
      const types = [...new Set(unitsWithProjectTitles.map(unit => unit.name))];
      setUniqueUnitTypes(types);
    } catch (err) {
      console.error('Error fetching units data:', err);
      setError('Failed to load units data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Sorting logic
  useEffect(() => {
    let sortedUnits = [...units];
    
    if (sortConfig) {
      sortedUnits.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    // Apply filters and search
    if (searchTerm || filter.project || filter.unitType || filter.availability) {
      sortedUnits = sortedUnits.filter(unit => {
        const matchesSearch = 
          unit.project_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          unit.name?.toLowerCase().includes(searchTerm.toLowerCase());
          
        const matchesProject = !filter.project || unit.project_id === filter.project;
        const matchesUnitType = !filter.unitType || unit.name === filter.unitType;
        const matchesAvailability = !filter.availability || 
          (filter.availability === 'available' && unit.status === 'available') ||
          (filter.availability === 'sold out' && unit.status === 'sold out');
        
        return matchesSearch && matchesProject && matchesUnitType && matchesAvailability;
      });
    }
    
    setFilteredUnits(sortedUnits);
  }, [units, sortConfig, searchTerm, filter]);

  const handleSort = (key: keyof UnitType) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedUnits(filteredUnits.map(unit => unit.id));
    } else {
      setSelectedUnits([]);
    }
  };

  const handleSelectUnit = (unitId: string) => {
    if (selectedUnits.includes(unitId)) {
      setSelectedUnits(selectedUnits.filter(id => id !== unitId));
    } else {
      setSelectedUnits([...selectedUnits, unitId]);
    }
  };

  const openAddModal = () => {
    setCurrentUnit(null);
    setIsModalOpen(true);
  };

  const openEditModal = (unit: UnitType) => {
    setCurrentUnit(unit);
    setIsModalOpen(true);
  };

  const handleSaveUnit = async (unit: UnitType) => {
    try {
      if (unit.id) {
        // Update existing unit
        const { error } = await supabase
          .from('unit_types')
          .update({
            name: unit.name,
            size_range: unit.size_range,
            price_range: unit.price_range,
            status: unit.status,
            units_available: unit.units_available
          })
          .eq('id', unit.id);

        if (error) throw error;
        
        // Update local state
        setUnits(prevUnits =>
          prevUnits.map(u =>
            u.id === unit.id ? { ...u, ...unit } : u
          )
        );
        
        toast.success('Unit updated successfully');
      } else {
        // Create new unit
        const { data, error } = await supabase
          .from('unit_types')
          .insert({
            project_id: unit.project_id,
            developer_id: user?.id,
            name: unit.name,
            size_range: unit.size_range,
            price_range: unit.price_range,
            status: unit.status,
            units_available: unit.units_available
          })
          .select();

        if (error) throw error;
        
        // Add project title to new unit
        const project = projects.find(p => p.id === unit.project_id);
        const newUnit = {
          ...data[0],
          project_title: project?.title || 'Unknown Project'
        };
        
        // Update local state
        setUnits(prevUnits => [...prevUnits, newUnit]);
        
        toast.success('Unit created successfully');
      }
      
      // Refresh data
      fetchData();
    } catch (err) {
      console.error('Error saving unit:', err);
      throw new Error('Failed to save unit');
    }
  };

  const handleDeleteUnit = async (unitId: string) => {
    if (!confirm('Are you sure you want to delete this unit type?')) return;
    
    try {
      const { error } = await supabase
        .from('unit_types')
        .delete()
        .eq('id', unitId);

      if (error) throw error;
      
      // Update local state
      setUnits(prevUnits => prevUnits.filter(u => u.id !== unitId));
      setSelectedUnits(prevSelected => prevSelected.filter(id => id !== unitId));
      
      toast.success('Unit deleted successfully');
    } catch (err) {
      console.error('Error deleting unit:', err);
      toast.error('Failed to delete unit');
    }
  };

  const handleBatchUpdate = async (updateData: Partial<UnitType>) => {
    if (selectedUnits.length === 0) {
      toast.error('No units selected');
      return;
    }

    try {
      // Update each selected unit
      for (const unitId of selectedUnits) {
        const { error } = await supabase
          .from('unit_types')
          .update(updateData)
          .eq('id', unitId);

        if (error) throw error;
      }
      
      // Refresh data
      fetchData();
      setSelectedUnits([]);
      
      toast.success(`Updated ${selectedUnits.length} units`);
    } catch (err) {
      console.error('Error updating units:', err);
      toast.error('Failed to update units');
    }
  };

  const exportToExcel = async () => {
    try {
      setIsExporting(true);
      
      // Prepare data for export
      const exportData = filteredUnits.map(unit => ({
        'Project Name': unit.project_title,
        'Unit Type': unit.name,
        'Size Range': unit.size_range,
        'Price Range': unit.price_range,
        'Availability': unit.status,
        'Units Available': unit.units_available
      }));
      
      // Create workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Units');
      
      // Generate Excel file
      XLSX.writeFile(wb, `unit_types_export_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      
      toast.success('Data exported successfully');
    } catch (err) {
      console.error('Error exporting data:', err);
      toast.error('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

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
          <AlertCircle className="h-6 w-6 text-red-400" />
          <div className="ml-3">
            <p className="text-red-700">{error}</p>
            <button
              onClick={fetchData}
              className="mt-2 px-3 py-1 bg-red-100 text-red-800 rounded-md hover:bg-red-200 inline-flex items-center text-sm"
            >
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
        <h3 className="text-xl font-semibold">Units Management</h3>
        <div className="flex space-x-2">
          <button
            onClick={exportToExcel}
            disabled={isExporting || filteredUnits.length === 0}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center disabled:opacity-50"
          >
            <Download className={`h-4 w-4 mr-2 ${isExporting ? 'animate-pulse' : ''}`} />
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Unit Type
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by project or unit type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select
              value={filter.project}
              onChange={(e) => setFilter(prev => ({ ...prev, project: e.target.value }))}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent appearance-none bg-white"
            >
              <option value="">All Projects</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          </div>

          <div className="relative">
            <select
              value={filter.unitType}
              onChange={(e) => setFilter(prev => ({ ...prev, unitType: e.target.value }))}
              className="pl-3 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent appearance-none bg-white"
            >
              <option value="">All Unit Types</option>
              {uniqueUnitTypes.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          </div>

          <div className="relative">
            <select
              value={filter.availability}
              onChange={(e) => setFilter(prev => ({ ...prev, availability: e.target.value }))}
              className="pl-3 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent appearance-none bg-white"
            >
              <option value="">All Availability</option>
              <option value="available">Available</option>
              <option value="sold out">Sold Out</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          </div>
        </div>
      </div>

      {/* Batch Actions */}
      {selectedUnits.length > 0 && (
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium">
            {selectedUnits.length} unit{selectedUnits.length !== 1 ? 's' : ''} selected
          </span>
          <div className="flex-grow"></div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm">Batch Update:</span>
            <button
              onClick={() => handleBatchUpdate({ status: 'available' })}
              className="px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
            >
              Set Available
            </button>
            <button
              onClick={() => handleBatchUpdate({ status: 'sold out' })}
              className="px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100"
            >
              Set Sold Out
            </button>
            <button
              onClick={() => setSelectedUnits([])}
              className="px-3 py-1.5 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Units Table */}
      {filteredUnits.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-3 py-3 text-left">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedUnits.length === filteredUnits.length && filteredUnits.length > 0}
                        onChange={handleSelectAll}
                        className="h-4 w-4 text-black border-gray-300 rounded focus:ring-black"
                      />
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('project_id')}
                  >
                    <div className="flex items-center">
                      Project
                      {sortConfig?.key === 'project_id' && (
                        <ArrowUpDown className="h-4 w-4 ml-1" />
                      )}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">
                      Unit Type
                      {sortConfig?.key === 'name' && (
                        <ArrowUpDown className="h-4 w-4 ml-1" />
                      )}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('size_range')}
                  >
                    <div className="flex items-center">
                      Size
                      {sortConfig?.key === 'size_range' && (
                        <ArrowUpDown className="h-4 w-4 ml-1" />
                      )}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('price_range')}
                  >
                    <div className="flex items-center">
                      Price
                      {sortConfig?.key === 'price_range' && (
                        <ArrowUpDown className="h-4 w-4 ml-1" />
                      )}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center">
                      Status
                      {sortConfig?.key === 'status' && (
                        <ArrowUpDown className="h-4 w-4 ml-1" />
                      )}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('units_available')}
                  >
                    <div className="flex items-center">
                      Units
                      {sortConfig?.key === 'units_available' && (
                        <ArrowUpDown className="h-4 w-4 ml-1" />
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUnits.map((unit) => (
                  <tr key={unit.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedUnits.includes(unit.id)}
                        onChange={() => handleSelectUnit(unit.id)}
                        className="h-4 w-4 text-black border-gray-300 rounded focus:ring-black"
                      />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 truncate max-w-[150px]">
                        {unit.project_title}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{unit.name}</div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{unit.size_range} sqft</div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{unit.price_range}</div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        unit.status === 'available'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {unit.status === 'available' ? 'Available' : 'Sold Out'}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                      {unit.units_available}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openEditModal(unit)}
                          className="text-gray-600 hover:text-black"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUnit(unit.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 p-8 rounded-lg text-center">
          <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No units found</h3>
          <p className="text-gray-500 max-w-md mx-auto mb-6">
            {searchTerm || filter.project || filter.unitType || filter.availability
              ? 'Try adjusting your filters or search to see more results'
              : 'Start by adding unit types to your projects. Each unit type can represent a category of properties in your development.'}
          </p>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 inline-flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Unit Type
          </button>
        </div>
      )}

      {/* No projects warning */}
      {projects.length === 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                You don't have any projects yet. Create a project first to add unit types.
              </p>
              <button
                onClick={() => window.location.href = '/developer-dashboard/create-project'}
                className="mt-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200 inline-flex items-center text-sm"
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unit Edit/Add Modal */}
      <UnitEditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        unit={currentUnit}
        projects={projects}
        onSave={handleSaveUnit}
      />
    </div>
  );
}
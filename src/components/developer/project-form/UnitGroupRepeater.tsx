import React from 'react';
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react';

interface UnitGroup {
  id: string;
  type: string;
  areaMin: string;
  areaMax: string;
  floorMin: string;
  floorMax: string;
  priceMin: string;
  priceMax: string;
  unitsAvailable: string;
  images?: File[];
  floorPlans?: File[];
}

interface UnitGroupRepeaterProps {
  unitGroups: UnitGroup[];
  onChange: (groups: UnitGroup[]) => void;
  onPrev: () => void;
  onSubmit: () => void;
  loading: boolean;
}

const unitTypes = [
  'Studio',
  '1 Bedroom',
  '2 Bedroom',
  '3 Bedroom',
  '4 Bedroom',
  '5+ Bedroom',
  'Penthouse',
  'Townhouse',
  'Villa',
  'Duplex',
  'Loft'
];

const UnitGroupRepeater = ({ 
  unitGroups = [], // Provide default empty array
  onChange, 
  onPrev, 
  onSubmit,
  loading
}: UnitGroupRepeaterProps) => {
  const handleAddUnitGroup = () => {
    const newGroup: UnitGroup = {
      id: crypto.randomUUID(),
      type: '1 Bedroom',
      areaMin: '',
      areaMax: '',
      floorMin: '',
      floorMax: '',
      priceMin: '',
      priceMax: '',  // Added missing comma here
      unitsAvailable: '',
      images: [],
      floorPlans: []
    };
    
    onChange([...unitGroups, newGroup]);
  };

  const handleRemoveUnitGroup = (id: string) => {
    if (unitGroups.length <= 1) {
      return; // Don't remove the last group
    }
    
    onChange(unitGroups.filter(group => group.id !== id));
  };

  const handleUnitGroupChange = (id: string, field: keyof UnitGroup, value: string) => {
    onChange(
      unitGroups.map(group => 
        group.id === id ? { ...group, [field]: value } : group
      )
    );
  };

  const handleImageUpload = (id: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    // Find the current group
    const currentGroup = unitGroups.find(group => group.id === id);
    if (!currentGroup) return;
    
    // Get current images or initialize empty array
    const currentImages = currentGroup.images || [];
    
    // Check if adding these files would exceed the 20 image limit
    if (currentImages.length + files.length > 20) {
      alert('You can upload a maximum of 20 images per unit type');
      return;
    }
    
    // Add new files to the images array
    const newImages = [...currentImages];
    for (let i = 0; i < files.length; i++) {
      // Validate file type
      if (!files[i].type.startsWith('image/')) {
        alert('Please upload only image files');
        continue;
      }
      
      // Validate file size (120MB max)
      if (files[i].size > 120 * 1024 * 1024) {
        alert('Image size should not exceed 120MB');
        continue;
      }
      
      newImages.push(files[i]);
    }
    
    // Update the unit group with new images
    onChange(
      unitGroups.map(group => 
        group.id === id ? { ...group, images: newImages } : group
      )
    );
    
    // Clear the input
    if (event.target) {
      event.target.value = '';
    }
  };
  
  const handleFloorPlanUpload = (id: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    // Find the current group
    const currentGroup = unitGroups.find(group => group.id === id);
    if (!currentGroup) return;
    
    // Get current floor plans or initialize empty array
    const currentFloorPlans = currentGroup.floorPlans || [];
    
    // Check if adding these files would exceed the 3 floor plan limit
    if (currentFloorPlans.length + files.length > 3) {
      alert('You can upload a maximum of 3 floor plan images per unit type');
      return;
    }
    
    // Add new files to the floor plans array
    const newFloorPlans = [...currentFloorPlans];
    for (let i = 0; i < files.length; i++) {
      // Validate file type
      if (!files[i].type.startsWith('image/')) {
        alert('Please upload only image files');
        continue;
      }
      
      // Validate file size (120MB max)
      if (files[i].size > 120 * 1024 * 1024) {
        alert('Image size should not exceed 120MB');
        continue;
      }
      
      newFloorPlans.push(files[i]);
    }
    
    // Update the unit group with new floor plans
    onChange(
      unitGroups.map(group => 
        group.id === id ? { ...group, floorPlans: newFloorPlans } : group
      )
    );
    
    // Clear the input
    if (event.target) {
      event.target.value = '';
    }
  };
  
  const handleRemoveFloorPlan = (groupId: string, imageIndex: number) => {
    // Find the current group
    const currentGroup = unitGroups.find(group => group.id === groupId);
    if (!currentGroup || !currentGroup.floorPlans) return;
    
    // Remove the floor plan at the specified index
    const newFloorPlans = [...currentGroup.floorPlans];
    newFloorPlans.splice(imageIndex, 1);
    
    // Update the unit group with new floor plans
    onChange(
      unitGroups.map(group => 
        group.id === groupId ? { ...group, floorPlans: newFloorPlans } : group
      )
    );
  };
  
  const handleRemoveImage = (groupId: string, imageIndex: number) => {
    // Find the current group
    const currentGroup = unitGroups.find(group => group.id === groupId);
    if (!currentGroup || !currentGroup.images) return;
    
    // Remove the image at the specified index
    const newImages = [...currentGroup.images];
    newImages.splice(imageIndex, 1);
    
    // Update the unit group with new images
    onChange(
      unitGroups.map(group => 
        group.id === groupId ? { ...group, images: newImages } : group
      )
    );
  };
  const formatCurrency = (value: string) => {
    if (!value) return '';
    
    // Remove non-numeric characters
    const numericValue = value.replace(/[^0-9]/g, '');
    
    // Format with commas
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // If no unit groups exist, add one by default
  React.useEffect(() => {
    if (unitGroups.length === 0) {
      handleAddUnitGroup();
    }
  }, []);

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold text-gray-900">Unit Types</h2>
      
      <div className="space-y-6">
        {unitGroups.map((group, index) => (
          <div 
            key={group.id} 
            className="bg-gray-50 rounded-lg p-6 border border-gray-200"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Unit Type {index + 1}</h3>
              <button
                type="button"
                onClick={() => handleRemoveUnitGroup(group.id)}
                disabled={unitGroups.length <= 1}
                className="p-2 text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Unit Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Type *
                </label>
                <select
                  value={group.type}
                  onChange={(e) => handleUnitGroupChange(group.id, 'type', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent"
                  required
                >
                  {unitTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              
              {/* Area Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Area Range (sqft) *
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    value={group.areaMin}
                    onChange={(e) => handleUnitGroupChange(group.id, 'areaMin', e.target.value)}
                    placeholder="Min"
                    className="w-1/2 px-4 py-2.5 rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent"
                    required
                  />
                  <input
                    type="number"
                    value={group.areaMax}
                    onChange={(e) => handleUnitGroupChange(group.id, 'areaMax', e.target.value)}
                    placeholder="Max"
                    className="w-1/2 px-4 py-2.5 rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent"
                    required
                  />
                </div>
              </div>
              
              {/* Units Available */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Units Available *
                </label>
                <input
                  type="number"
                  value={group.unitsAvailable}
                  onChange={(e) => handleUnitGroupChange(group.id, 'unitsAvailable', e.target.value)}
                  placeholder="Number of units"
                  className="w-full px-4 py-2.5 rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent"
                  required
                  min="1"
                />
              </div>
              
              {/* Floor Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Floor Range
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    value={group.floorMin}
                    onChange={(e) => handleUnitGroupChange(group.id, 'floorMin', e.target.value)}
                    placeholder="Min"
                    className="w-1/2 px-4 py-2.5 rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                  <input
                    type="number"
                    value={group.floorMax}
                    onChange={(e) => handleUnitGroupChange(group.id, 'floorMax', e.target.value)}
                    placeholder="Max"
                    className="w-1/2 px-4 py-2.5 rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
              </div>
              
              {/* Price Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price Range (AED) *
                </label>
                <div className="flex space-x-2">
                  <div className="relative w-1/2">
                    <input
                      type="text"
                      value={formatCurrency(group.priceMin)}
                      onChange={(e) => handleUnitGroupChange(group.id, 'priceMin', e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="Min"
                      className="w-full px-4 py-2.5 rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent"
                      required
                    />
                  </div>
                  <div className="relative w-1/2">
                    <input
                      type="text"
                      value={formatCurrency(group.priceMax)}
                      onChange={(e) => handleUnitGroupChange(group.id, 'priceMax', e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="Max"
                      className="w-full px-4 py-2.5 rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
            {/* Unit Type Images */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit Type Images (up to 20)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {/* Display existing images */}
                {group.images && group.images.map((file, index) => (
                  <div key={index} className="relative aspect-square">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Unit ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(group.id, index)}
                      className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                
                {/* Upload button - only show if less than 20 images */}
                {(!group.images || group.images.length < 20) && (
                  <label className="relative aspect-square border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 cursor-pointer flex flex-col items-center justify-center">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handleImageUpload(group.id, e)}
                      className="hidden"
                    />
                    <Plus className="h-8 w-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">Add Images</span>
                    <span className="text-xs text-gray-400 mt-1">
                      {group.images ? `${group.images.length}/20` : '0/20'}
                    </span>
                  </label>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Upload images specific to this unit type (floor plans, interior views, etc.)
              </p>
            </div>
            
            {/* Floor Plan Images */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Floor Plan Images (up to 3)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {/* Display existing floor plans */}
                {group.floorPlans && group.floorPlans.map((file, index) => (
                  <div key={index} className="relative aspect-[4/3]">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Floor Plan ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveFloorPlan(group.id, index)}
                      className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                
                {/* Upload button - only show if less than 3 floor plans */}
                {(!group.floorPlans || group.floorPlans.length < 3) && (
                  <label className="relative aspect-[4/3] border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 cursor-pointer flex flex-col items-center justify-center">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handleFloorPlanUpload(group.id, e)}
                      className="hidden"
                    />
                    <Plus className="h-8 w-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">Add Floor Plans</span>
                    <span className="text-xs text-gray-400 mt-1">
                      {group.floorPlans ? `${group.floorPlans.length}/3` : '0/3'}
                    </span>
                  </label>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Upload detailed floor plan images for this unit type (up to 3 images)
              </p>
            </div>
          </div>
        ))}
      </div>
      
      {/* Add Unit Group Button */}
      <div>
        <button
          type="button"
          onClick={handleAddUnitGroup}
          className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Another Unit Type
        </button>
      </div>
      
      {/* Navigation Buttons */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onPrev}
          className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Project Details
        </button>
        
        <div>
          <button
            type="button"
            onClick={onSubmit}
            disabled={loading}
            className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                {window.location.pathname.includes('edit') ? 'Update Project' : 'Create Project'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};


export { UnitGroupRepeater }
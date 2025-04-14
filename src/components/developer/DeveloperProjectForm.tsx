import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '../../utils/supabase';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useRoleAuth } from '../../hooks/useRoleAuth';
import ProjectInfoForm from './project-form/ProjectInfoForm';
import { UnitGroupRepeater } from './project-form/UnitGroupRepeater';
import { toast } from 'react-hot-toast';

interface ProjectFormData {
  title: string;
  description: string;
  location: string;
  handoverDate: string;
  paymentPlan: string;
  brochureFile?: FileList;
  imageFiles: File[];
  unitGroups: {
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
  }[];
}

interface ProjectProps {
  projectId?: string;
}

const defaultFormValues: ProjectFormData = {
  title: '',
  description: '',
  location: '',
  handoverDate: '',
  paymentPlan: '40/60',
  imageFiles: [],
  unitGroups: [{
    id: crypto.randomUUID(),
    type: '1 Bedroom',
    areaMin: '',
    areaMax: '',
    floorMin: '',
    floorMax: '',
    priceMin: '',
    priceMax: '',
    unitsAvailable: '',
    images: []
  }]
};

const DeveloperProjectForm: React.FC<ProjectProps> = ({ projectId }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | undefined>(undefined);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { role } = useRoleAuth();
  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<ProjectFormData>({
    defaultValues: defaultFormValues
  });

  const projectData = watch();

  useEffect(() => {
    if (projectId) {
      setIsEditMode(true);
      setCurrentProjectId(projectId);
      fetchProjectData(projectId);
    }
  }, [projectId]);

  const fetchProjectData = async (id: string) => {
    try {
      setIsLoading(true);
      
      // Fetch project details
      const { data: project, error: projectError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .single();
      
      if (projectError) throw projectError;
      
      // Fetch unit types
      const { data: unitTypes, error: unitTypesError } = await supabase
        .from('unit_types')
        .select('*')
        .eq('project_id', id);
      
      if (unitTypesError) throw unitTypesError;
      
      // Set form values
      setValue('title', project.title);
      setValue('description', project.description);
      setValue('location', project.location);
      setValue('handoverDate', project.handover_date || '');
      setValue('paymentPlan', project.payment_plan || '40/60');
      
      // Set unit groups
      if (unitTypes && unitTypes.length > 0) {
        const formattedUnitGroups = unitTypes.map(unit => ({
          id: unit.id,
          type: unit.name,
          areaMin: unit.size_range?.split('-')[0]?.trim() || '',
          areaMax: unit.size_range?.split('-')[1]?.trim() || '',
          floorMin: unit.floor_range?.split('-')[0]?.trim() || '',
          floorMax: unit.floor_range?.split('-')[1]?.trim() || '',
          priceMin: unit.price_range?.split('-')[0]?.replace(/[^0-9]/g, '') || '',
          priceMax: unit.price_range?.split('-')[1]?.replace(/[^0-9]/g, '') || '',
          unitsAvailable: unit.units_available?.toString() || '0',
          images: []
        }));
        
        setValue('unitGroups', formattedUnitGroups);
      }
      
    } catch (error) {
      console.error('Error fetching project data:', error);
      toast.error('Failed to load project data');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: ProjectFormData) => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (role !== 'developer') {
        throw new Error('Only developers can create projects');
      }

      setIsSubmitting(true);

      // Common properties data
      const propertyData = {
        title: data.title,
        description: data.description,
        location: data.location,
        handover_date: data.handoverDate,
        payment_plan: data.paymentPlan,
        type: 'Apartment',
        contract_type: 'Sale',
        price: 0, // Placeholder price
        creator_id: user.id,
        creator_type: role, // Use the actual role from useRoleAuth
        agent_id: user.id // For developers, agent_id is the same as creator_id
      };

      // Handle brochure file upload if provided
      if (data.brochureFile && data.brochureFile.length > 0) {
        const brochureUrl = await uploadBrochure(data.brochureFile[0]);
        propertyData.brochure_url = brochureUrl;
      }
      
      // Handle project images if provided
      if (data.imageFiles && data.imageFiles.length > 0) {
        const imageUrls = await uploadProjectImages(data.imageFiles);
        propertyData.images = imageUrls;
      }

      if (isEditMode && currentProjectId) {
        // Update existing project
        const { error: updateError } = await supabase
          .from('properties')
          .update(propertyData)
          .eq('id', currentProjectId)
          .eq('creator_type', role) // Use the actual role
          .eq('creator_id', user.id);

        if (updateError) throw updateError;

        // Process unit types
        await processUnitTypes(data.unitGroups, currentProjectId, user.id);
      } else {
        // Create new project
        const { data: newProject, error: createError } = await supabase
          .from('properties')
          .insert(propertyData)
          .select()
          .single();

        if (createError) throw createError;

        // Process unit types
        await processUnitTypes(data.unitGroups, newProject.id, user.id);
      }

      toast.success(isEditMode ? 'Project updated successfully' : 'Project created successfully');
      navigate('/developer-dashboard');
    } catch (error) {
      console.error(isEditMode ? 'Error updating project:' : 'Error creating project:', error);
      toast.error(error instanceof Error ? error.message : 'Error processing project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const uploadBrochure = async (file: File): Promise<string> => {
    // Check file type - allow PDF files
    const allowedTypes = ['application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Please upload a PDF file');
    }

    // Check file size (max 120MB)
    const maxSize = 120 * 1024 * 1024; // 120MB in bytes
    if (file.size > maxSize) {
      throw new Error('File size must be less than 120MB');
    }

    // Get auth headers
    const { data: { session } } = await supabase.auth.getSession();
    const authHeaders = {
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${session?.access_token}`
    };

    // Upload brochure file
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `properties/${crypto.randomUUID()}/brochures/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('properties')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
        headers: authHeaders
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('properties')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const uploadProjectImages = async (files: File[]): Promise<string[]> => {
    const imageUrls: string[] = [];

    // Get auth headers once for all uploads
    const { data: { session } } = await supabase.auth.getSession();
    const authHeaders = {
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${session?.access_token}`
    };

    for (const file of files) {
      // Check file type
      if (!file.type.startsWith('image/')) {
        continue; // Skip non-image files
      }

      // Check file size (max 120MB)
      if (file.size > 120 * 1024 * 1024) {
        continue; // Skip files that are too large
      }

      try {
        // Upload image
        const fileExt = file.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `properties/${crypto.randomUUID()}/images/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('properties')
          .upload(filePath, file, {
            contentType: file.type,
            upsert: false,
            headers: authHeaders
          });

        if (uploadError) {
          console.error('Error uploading image:', uploadError);
          continue; // Skip this image but continue with others
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('properties')
          .getPublicUrl(filePath);

        imageUrls.push(publicUrl);
      } catch (error) {
        console.error('Error processing image:', error);
        // Continue with next image even if one fails
      }
    }

    return imageUrls;
  };

  const processUnitTypes = async (unitGroups: any[], projectId: string, developerId: string) => {
    // For each unit group
    for (const group of unitGroups) {
      // Format data for unit_types table
      const unitTypeData = {
        project_id: projectId,
        developer_id: developerId,
        name: group.type,
        size_range: `${group.areaMin} - ${group.areaMax}`,
        floor_range: group.floorMin && group.floorMax ? `${group.floorMin} - ${group.floorMax}` : null,
        price_range: `${parseInt(group.priceMin).toLocaleString()} - ${parseInt(group.priceMax).toLocaleString()}`,
        units_available: parseInt(group.unitsAvailable) || 0,
        status: 'available',
        notes: null
      };

      if (isEditMode && group.id && group.id.length > 10) {
        // Update existing unit type
        const { error: updateError } = await supabase
          .from('unit_types')
          .update(unitTypeData)
          .eq('id', group.id)
          .eq('developer_id', developerId); // Ensure developer owns the unit type

        if (updateError) {
          console.error('Error updating unit type:', updateError);
        }
      } else {
        // Create new unit type
        const { error: insertError } = await supabase
          .from('unit_types')
          .insert(unitTypeData);

        if (insertError) {
          console.error('Error creating unit type:', insertError);
        }
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-black"></div>
        </div>
      ) : (
        <>
          <ProjectInfoForm 
            projectData={projectData} 
            onChange={(data) => {
              Object.entries(data).forEach(([key, value]) => {
                setValue(key as keyof ProjectFormData, value);
              });
            }}
            onNext={() => {}} 
          />
          <UnitGroupRepeater 
            unitGroups={projectData.unitGroups}
            onChange={(groups) => setValue('unitGroups', groups)}
            onPrev={() => {}}
            onSubmit={handleSubmit(onSubmit)}
            loading={isSubmitting}
          />
        </>
      )}
    </form>
  );
};

export default DeveloperProjectForm;
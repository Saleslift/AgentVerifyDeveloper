import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DeveloperSidebar from '../components/developer/DeveloperSidebar';
import { useAuth } from '../contexts/AuthContext';
import { initPageVisibilityHandling, cleanupPageVisibilityHandling } from '../utils/pageVisibility';
import { Routes, Route } from 'react-router-dom';

// Import components directly instead of lazy loading
import StatisticsPanel from '../components/developer/StatisticsPanel';
import DeveloperProjectForm from '../components/developer/DeveloperProjectForm';
import PrelaunchProjectForm from '../components/developer/PrelaunchProjectForm';
import ProjectsTab from '../components/developer/ProjectsTab';
import EditProfileTab from '../components/developer/EditProfileTab';
import AgencyCollaborationTab from '../components/developer/AgencyCollaborationTab';
import ImportProjectsTab from '../components/developer/ImportProjectsTab';
import ApiIntegrationTab from '../components/developer/ApiIntegrationTab';
import UnitsManagementTab from '../components/developer/UnitsManagementTab';

export default function DeveloperDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'edit-profile' | 'projects' | 'agencies' | 'statistics' | 'import-projects' | 'api' | 'units'>('projects');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Initialize page visibility handling to prevent reloads
  useEffect(() => {
    initPageVisibilityHandling();
    return () => cleanupPageVisibilityHandling();
  }, []);

  if (!user) {
    // Set flag to allow navigation
    sessionStorage.setItem('intentional_navigation', 'true');
    navigate('/signin');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DeveloperSidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        developerId={user.id}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <main className="transition-all duration-300 md:ml-[70px]">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <Routes>
              <Route path="/create-project" element={
                <DeveloperProjectForm 
                  userId={user.id}
                  onSuccess={() => navigate('/developer-dashboard')}
                  onCancel={() => navigate('/developer-dashboard')}
                />
              } />
              <Route path="/create-prelaunch" element={
                <PrelaunchProjectForm 
                  userId={user.id}
                  onSuccess={() => navigate('/developer-dashboard')}
                  onCancel={() => navigate('/developer-dashboard')}
                />
              } />
              <Route path="/edit-project/:projectId" element={
                <DeveloperProjectForm 
                  projectId={window.location.pathname.split('/').pop()} 
                  userId={user.id}
                  onSuccess={() => navigate('/developer-dashboard')}
                  onCancel={() => navigate('/developer-dashboard')}
                />
              } />
              <Route path="/" element={
                <>
                  {activeTab === 'projects' && <ProjectsTab />}
                  {activeTab === 'agencies' && <AgencyCollaborationTab />}
                  {activeTab === 'statistics' && <StatisticsPanel developerId={user.id} />}
                  {activeTab === 'edit-profile' && <EditProfileTab developerId={user.id} />}
                  {activeTab === 'import-projects' && <ImportProjectsTab />}
                  {activeTab === 'api' && <ApiIntegrationTab />}
                  {activeTab === 'units' && <UnitsManagementTab />}
                </>
              } />
            </Routes>
          </div>
        </div>
      </main>
    </div>
  );
}
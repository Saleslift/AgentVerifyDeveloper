import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Building2,
  UserCog,
  BarChart2,
  Users,
  LogOut,
  HelpCircle,
  Menu,
  X,
  ExternalLink,
  Upload,
  Code,
  PlusCircle,
  Rocket,
  Layers
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useRoleAuth } from '../../hooks/useRoleAuth';
import { supabase } from '../../utils/supabase';

// Main navigation items
const createMenuItems = (navigate: Function, developerSlug?: string) => [
  {
    id: 'edit-profile',
    label: 'Edit Profile',
    icon: UserCog,
    onClick: () => null // Will be overridden
  },
  {
    id: 'public-page',
    label: 'Public Page',
    icon: ExternalLink,
    onClick: () => window.open(`/developers/${developerSlug || ''}`, '_blank'),
    external: true
  },
  {
    id: 'projects',
    label: 'Projects',
    icon: Building2,
    onClick: () => null // Will be overridden
  },
  {
    id: 'units',
    label: 'Units Management',
    icon: Layers,
    onClick: () => null // Will be overridden
  },
  {
    id: 'import-projects',
    label: 'Import Projects',
    icon: Upload,
    onClick: () => null // Will be overridden
  },
  {
    id: 'api',
    label: 'API Integration',
    icon: Code,
    onClick: () => null // Will be overridden
  },
  {
    id: 'agencies',
    label: 'Agencies',
    icon: Users,
    onClick: () => null // Will be overridden
  },
  {
    id: 'statistics',
    label: 'Statistics',
    icon: BarChart2,
    onClick: () => null // Will be overridden
  }
];

// Action items for creating projects
const createActionItems = (navigate: Function) => [
  {
    id: 'create-project',
    label: 'Add a New Project',
    icon: PlusCircle,
    onClick: () => navigate('/developer-dashboard/create-project')
  },
  {
    id: 'create-prelaunch',
    label: 'Add a Prelaunch',
    icon: Rocket,
    onClick: () => navigate('/developer-dashboard/create-prelaunch')
  }
];

interface DeveloperSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  developerId: string;
  activeTab: 'edit-profile' | 'projects' | 'agencies' | 'statistics' | 'import-projects' | 'api' | 'units' | 'public-page';
  onTabChange: (tab: string) => void;
}

export default function DeveloperSidebar({
  isOpen,
  onToggle,
  developerId,
  activeTab,
  onTabChange
}: DeveloperSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { role } = useRoleAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [developerSlug, setDeveloperSlug] = useState<string>('');

  // Verify user has developer role
  React.useEffect(() => {
    if (role && role !== 'developer') {
      console.warn('Non-developer accessing developer dashboard, redirecting...');
      navigate('/dashboard');
    }
  }, [role, navigate]);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Update active tab based on URL path when location changes
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/edit-project/') || path.includes('/create-project')) {
      // Don't change active tab when editing or creating a project
      return;
    } else if (path.includes('/edit-profile')) {
      onTabChange('edit-profile');
    } else if (path.includes('/agencies')) {
      onTabChange('agencies');
    } else if (path.includes('/statistics')) {
      onTabChange('statistics');
    } else if (path.includes('/import-projects')) {
      onTabChange('import-projects');
    } else if (path.includes('/api')) {
      onTabChange('api');
    } else if (path.includes('/units')) {
      onTabChange('units');
    } else if (path.includes('/public-page')) {
      onTabChange('public-page');
    } else {
      onTabChange('projects');
    }
  }, [location.pathname, onTabChange]);

  // Fetch developer slug
  useEffect(() => {
    const fetchDeveloperSlug = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('slug')
          .eq('id', developerId)
          .single();
        
        if (data?.slug) {
          setDeveloperSlug(data.slug);
        }
      } catch (error) {
        console.error('Error fetching developer slug:', error);
      }
    };

    if (developerId) {
      fetchDeveloperSlug();
    }
  }, [developerId]);

  const handleLogout = async () => {
    // Set flag to allow navigation
    sessionStorage.setItem('intentional_navigation', 'true');
    // Sign out from Supabase
    await signOut();
  };

  // Create menu items with proper onClick handlers
  const menuItems = React.useMemo(() => {
    const items = createMenuItems(navigate, developerSlug);
    
    // Override onClick handlers for tab changes
    items.find(item => item.id === 'edit-profile')!.onClick = () => {
      onTabChange('edit-profile');
      navigate('/developer-dashboard');
    };
    
    items.find(item => item.id === 'projects')!.onClick = () => {
      onTabChange('projects');
      navigate('/developer-dashboard');
    };
    
    items.find(item => item.id === 'units')!.onClick = () => {
      onTabChange('units');
      navigate('/developer-dashboard');
    };
    
    items.find(item => item.id === 'import-projects')!.onClick = () => {
      onTabChange('import-projects');
      navigate('/developer-dashboard');
    };
    
    items.find(item => item.id === 'api')!.onClick = () => {
      onTabChange('api');
      navigate('/developer-dashboard');
    };
    
    items.find(item => item.id === 'agencies')!.onClick = () => {
      onTabChange('agencies');
      navigate('/developer-dashboard');
    };
    
    items.find(item => item.id === 'statistics')!.onClick = () => {
      onTabChange('statistics');
      navigate('/developer-dashboard');
    };
    
    return items;
  }, [navigate, onTabChange, developerSlug]);

  // Action items with proper navigation
  const actionItems = React.useMemo(() => {
    return createActionItems(navigate);
  }, [navigate]);

  if (isMobile) {
    return (
      <>
        {/* Mobile Header */}
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-black">
          <div className="flex items-center">
            <img 
              src="https://edcsftvorssaojmyfqgs.supabase.co/storage/v1/object/public/homepage-assets//png%20100%20x%20100%20(1).png"
              alt="AgentVerify"
              className="h-8 w-8"
            />
            <span className="ml-3 text-white text-lg font-semibold">AgentVerify</span>
          </div>
          <button
            onClick={() => setIsFullscreen(true)}
            className="p-2 text-white"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Mobile Fullscreen Menu */}
        {isFullscreen && (
          <div className="fixed inset-0 bg-black z-50 pt-safe-top pb-safe-bottom">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center">
                <img 
                  src="https://edcsftvorssaojmyfqgs.supabase.co/storage/v1/object/public/homepage-assets//png%20100%20x%20100%20(1).png"
                  alt="AgentVerify"
                  className="h-8 w-8"
                />
                <span className="ml-3 text-white text-lg font-semibold">AgentVerify</span>
              </div>
              <button
                onClick={() => setIsFullscreen(false)}
                className="p-2 text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Navigation Items */}
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    item.onClick();
                    setIsFullscreen(false);
                  }}
                  className={`flex items-center w-full px-4 py-3 rounded-lg ${
                    activeTab === item.id
                      ? 'bg-white text-black'
                      : 'text-white hover:bg-[#333333]'
                  }`}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  <span>{item.label}</span>
                  {item.external && (
                    <span className="ml-1 text-xs opacity-60">↗</span>
                  )}
                </button>
              ))}

              {/* Divider */}
              <div className="border-t border-[#333333] my-4"></div>

              {/* Action Items */}
              {actionItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    item.onClick();
                    setIsFullscreen(false);
                  }}
                  className="flex items-center w-full px-4 py-3 rounded-lg bg-[#cefa05] text-black hover:bg-opacity-90 mb-3"
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  <span>{item.label}</span>
                </button>
              ))}

              {/* Bottom Menu Items */}
              <div className="pt-6 border-t border-[#333333]">
                <a
                  href="https://wa.me/971543106444"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center w-full px-4 py-3 text-white hover:bg-[#333333] rounded-lg mb-3"
                >
                  <HelpCircle className="h-5 w-5 mr-3" />
                  <span>Support</span>
                </a>
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-3 text-white hover:bg-[#333333] rounded-lg"
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <aside
      className={`fixed left-0 top-0 z-40 h-screen bg-[#000000] transition-all duration-300 ease-in-out ${
        isHovered ? 'w-[250px]' : 'w-[70px]'
      } border-r border-[#333333]`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo */}
      <div className="h-20 flex items-center justify-center">
        <div className={`transition-all duration-300 ${isHovered ? 'flex items-center' : 'flex justify-center'}`}>
          <img 
            src="https://edcsftvorssaojmyfqgs.supabase.co/storage/v1/object/public/homepage-assets//png%20100%20x%20100%20(1).png"
            alt="AgentVerify"
            className="h-8 w-8"
          />
          {isHovered && (
            <span className="ml-3 text-white text-lg font-semibold">AgentVerify</span>
          )}
        </div>
      </div>

      {/* Visual Separator */}
      <div className="border-t border-[#333333] w-full mb-4"></div>
     
      <nav className="flex h-full flex-col">
        <ul className="space-y-1 px-3 flex-grow overflow-y-auto">
          {/* Navigation Items */}
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={item.onClick}
                className={`flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === item.id
                    ? 'bg-primary-100 text-black'
                    : 'text-white hover:bg-[#333333]'
                } ${!isHovered ? 'justify-center' : ''}`}
              >
                <item.icon className={`h-5 w-5 ${activeTab === item.id ? 'text-black' : 'text-white'}`} />
                {isHovered && (
                  <span className="ml-3 truncate">
                    {item.label}
                    {item.external && (
                      <span className="ml-1 inline-block text-xs opacity-60">↗</span>
                    )}
                  </span>
                )}
              </button>
            </li>
          ))}
          
          {/* Divider before action items */}
          <li>
            <div className="my-3 border-t border-[#333333] w-full"></div>
          </li>
          
          {/* Action Items */}
          {actionItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={item.onClick}
                className={`flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium bg-[#cefa05] text-black hover:bg-opacity-90 mb-2 
                  ${!isHovered ? 'justify-center' : ''}`}
              >
                <item.icon className="h-5 w-5" />
                {isHovered && (
                  <span className="ml-3 truncate font-medium">
                    {item.label}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
        
        {/* Support and Logout */}
        <div className="px-3 py-6 mt-auto border-t border-[#333333] bg-[#000000] sticky bottom-0">
          <a
            href="https://wa.me/971543106444"
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium text-white hover:bg-[#333333] mb-3 ${!isHovered ? 'justify-center' : ''}`}
          >
            <HelpCircle className="h-6 w-6" />
            {isHovered && <span className="ml-3">Support</span>}
          </a>
          <button
            onClick={handleLogout}
            className={`flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-white hover:bg-[#333333] ${!isHovered ? 'justify-center' : ''}`}
          >
            <LogOut className="h-6 w-6" />
            {isHovered && <span className="ml-3">Log Out</span>}
          </button>
        </div>
      </nav>
    </aside>
  );
}
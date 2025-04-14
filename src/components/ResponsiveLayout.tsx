import React, { ReactNode } from 'react';

interface ResponsiveLayoutProps {
  children: ReactNode;
  className?: string;
  mobileOnly?: ReactNode;
  desktopOnly?: ReactNode;
  sidebarContent?: ReactNode;
  fullWidth?: boolean;
}

const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  className = '',
  mobileOnly,
  desktopOnly,
  sidebarContent,
  fullWidth = false
}) => {
  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      <div className={fullWidth ? 'w-full' : 'container mx-auto px-4 sm:px-6 lg:px-8 py-8'}>
        {mobileOnly && (
          <div className="block sm:hidden">{mobileOnly}</div>
        )}
        
        {desktopOnly && (
          <div className="hidden sm:block">{desktopOnly}</div>
        )}
        
        {sidebarContent ? (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="w-full lg:w-2/3">{children}</div>
            <div className="w-full lg:w-1/3">{sidebarContent}</div>
          </div>
        ) : (
          <div>{children}</div>
        )}
      </div>
    </div>
  );
};

// Responsive Grid component for a 2, 3, or 4 column grid based on screen size
export const ResponsiveGrid: React.FC<{
  children: ReactNode;
  className?: string;
  cols?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
}> = ({ children, className = '', cols = { sm: 1, md: 2, lg: 3, xl: 4 } }) => {
  const getColClass = () => {
    const gridCols = [];
    
    if (cols.sm) gridCols.push(`grid-cols-${cols.sm}`);
    if (cols.md) gridCols.push(`md:grid-cols-${cols.md}`);
    if (cols.lg) gridCols.push(`lg:grid-cols-${cols.lg}`);
    if (cols.xl) gridCols.push(`xl:grid-cols-${cols.xl}`);
    
    return gridCols.join(' ');
  };
  
  return (
    <div className={`grid ${getColClass()} gap-4 sm:gap-6 ${className}`}>
      {children}
    </div>
  );
};

// Responsive Container that auto-adjusts padding based on device size
export const ResponsiveContainer: React.FC<{
  children: ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return (
    <div className={`px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 ${className}`}>
      {children}
    </div>
  );
};

// Responsive Text component that scales size based on screen size
export const ResponsiveText: React.FC<{
  children: ReactNode;
  variant?: 'heading1' | 'heading2' | 'heading3' | 'body' | 'small';
  className?: string;
}> = ({ children, variant = 'body', className = '' }) => {
  const getVariantClass = () => {
    switch(variant) {
      case 'heading1':
        return 'text-2xl sm:text-3xl md:text-4xl font-bold';
      case 'heading2':
        return 'text-xl sm:text-2xl md:text-3xl font-semibold';
      case 'heading3':
        return 'text-lg sm:text-xl md:text-2xl font-medium';
      case 'small':
        return 'text-xs sm:text-sm font-normal';
      default:
        return 'text-sm sm:text-base font-normal';
    }
  };
  
  return (
    <div className={`${getVariantClass()} ${className}`}>
      {children}
    </div>
  );
};

export default ResponsiveLayout;
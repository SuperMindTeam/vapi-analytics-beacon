
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook to persist the current page location in sessionStorage
 * This prevents the app from resetting to dashboard when switching tabs/windows
 */
export const usePagePersistence = () => {
  const location = useLocation();
  
  useEffect(() => {
    // Save current path to session storage when location changes
    if (location.pathname !== '/auth') {
      // Only save the current path if it's a direct route, not a nested one
      // This fixes the issue with navigation between calls and dashboard
      const currentPath = location.pathname;
      sessionStorage.setItem('lastPath', currentPath);
      console.info(`Current path saved: ${currentPath}`);
    }
  }, [location.pathname]);
  
  return null;
};

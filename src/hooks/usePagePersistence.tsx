
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
      // Store the current path, but handle the root path correctly
      const currentPath = location.pathname;
      
      // Don't override existing path when navigating to root/dashboard
      // This was causing the navigation issue where dashboard wasn't loading
      if (currentPath !== '/' || !sessionStorage.getItem('lastPath')) {
        sessionStorage.setItem('lastPath', currentPath);
        console.info(`Current path saved: ${currentPath}`);
      }
    }
  }, [location.pathname]);
  
  return null;
};

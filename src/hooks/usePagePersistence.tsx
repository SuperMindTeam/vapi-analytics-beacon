
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
      sessionStorage.setItem('lastPath', location.pathname);
      console.info(`Current path saved: ${location.pathname}`);
    }
  }, [location]);
  
  return null;
};

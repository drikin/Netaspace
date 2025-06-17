import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useProductionCache() {
  const queryClient = useQueryClient();

  const forceClearCache = () => {
    // Clear all React Query cache
    queryClient.clear();
    
    // Clear browser cache for API requests
    if ('serviceWorker' in navigator) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
    
    // Force reload from server
    window.location.reload();
  };

  const invalidateTopicsCache = () => {
    // Invalidate all queries that start with '/api/weeks/active'
    queryClient.invalidateQueries({ 
      predicate: (query) => 
        Array.isArray(query.queryKey) && 
        query.queryKey[0] === '/api/weeks/active'
    });
    queryClient.invalidateQueries({ queryKey: ['/api/topics'] });
  };

  useEffect(() => {
    // Listen for storage events to sync across tabs
    const handleStorageChange = () => {
      invalidateTopicsCache();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return {
    forceClearCache,
    invalidateTopicsCache
  };
}
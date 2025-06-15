import { useEffect, useState } from "react";

/**
 * A simple hook to get the fingerprint for user identification
 * In a real app, you might want to use a proper fingerprinting library
 */
export function useFingerprint() {
  // Initialize with fallback fingerprint immediately
  const [fingerprint, setFingerprint] = useState<string>(() => {
    // Try to get from localStorage synchronously
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const storedFingerprint = localStorage.getItem("fingerprint");
        if (storedFingerprint && storedFingerprint.length > 10) {
          return storedFingerprint;
        }
      }
    } catch (error) {
      console.warn('localStorage not available:', error);
    }
    
    // Generate fallback fingerprint with timestamp for uniqueness
    return 'temp-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 10);
  });

  useEffect(() => {
    // Ensure we have a persistent fingerprint
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const storedFingerprint = localStorage.getItem("fingerprint");
        
        if (!storedFingerprint || storedFingerprint.startsWith('temp-') || storedFingerprint.length < 10) {
          // Generate a proper random ID as fingerprint with better entropy
          const newFingerprint = Date.now().toString(36) + '-' + 
                                 Math.random().toString(36).substring(2, 15) + '-' +
                                 Math.random().toString(36).substring(2, 15);
          localStorage.setItem("fingerprint", newFingerprint);
          setFingerprint(newFingerprint);
          console.log('Generated new fingerprint:', newFingerprint);
        } else if (storedFingerprint !== fingerprint) {
          setFingerprint(storedFingerprint);
          console.log('Using stored fingerprint:', storedFingerprint);
        }
      }
    } catch (error) {
      console.warn('Failed to persist fingerprint:', error);
      // Keep using the temporary fingerprint
    }
  }, [fingerprint]);

  return fingerprint;
}

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
      const storedFingerprint = localStorage.getItem("fingerprint");
      if (storedFingerprint) {
        return storedFingerprint;
      }
    } catch (error) {
      console.warn('localStorage not available:', error);
    }
    
    // Generate fallback fingerprint
    return 'temp-' + Math.random().toString(36).substring(2, 15);
  });

  useEffect(() => {
    // Ensure we have a persistent fingerprint
    try {
      const storedFingerprint = localStorage.getItem("fingerprint");
      
      if (!storedFingerprint || storedFingerprint.startsWith('temp-')) {
        // Generate a proper random ID as fingerprint
        const newFingerprint = Math.random().toString(36).substring(2, 15) + 
                               Math.random().toString(36).substring(2, 15);
        localStorage.setItem("fingerprint", newFingerprint);
        setFingerprint(newFingerprint);
      } else if (storedFingerprint !== fingerprint) {
        setFingerprint(storedFingerprint);
      }
    } catch (error) {
      console.warn('Failed to persist fingerprint:', error);
      // Keep using the temporary fingerprint
    }
  }, [fingerprint]);

  return fingerprint;
}

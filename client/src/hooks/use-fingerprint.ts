import { useEffect, useState } from "react";

/**
 * A simple hook to get the fingerprint for user identification
 * In a real app, you might want to use a proper fingerprinting library
 */
export function useFingerprint() {
  const [fingerprint, setFingerprint] = useState<string | null>(null);

  useEffect(() => {
    // Get from localStorage if available
    const storedFingerprint = localStorage.getItem("fingerprint");
    
    if (storedFingerprint) {
      setFingerprint(storedFingerprint);
    } else {
      // Generate a simple random ID as fingerprint
      const newFingerprint = Math.random().toString(36).substring(2, 15) + 
                             Math.random().toString(36).substring(2, 15);
      localStorage.setItem("fingerprint", newFingerprint);
      setFingerprint(newFingerprint);
    }
  }, []);

  return fingerprint;
}

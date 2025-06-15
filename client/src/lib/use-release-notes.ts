import { useState, useEffect } from 'react';
import { 
  releaseNotes, 
  getReadReleases, 
  getUnreadReleaseCount,
  markAllUnreadAsRead 
} from '@/lib/release-notes';

export function useReleaseNotes() {
  const [readReleases, setReadReleases] = useState<string[]>(getReadReleases());
  const [unreadCount, setUnreadCount] = useState(getUnreadReleaseCount());

  // Update state when localStorage changes
  const updateReadStatus = () => {
    const newReadReleases = getReadReleases();
    const newUnreadCount = getUnreadReleaseCount();
    setReadReleases(newReadReleases);
    setUnreadCount(newUnreadCount);
  };

  // Mark all unread as read and update state
  const markAllAsRead = () => {
    markAllUnreadAsRead();
    updateReadStatus();
  };

  // Listen for storage changes
  useEffect(() => {
    const handleStorageChange = () => {
      updateReadStatus();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return {
    releaseNotes,
    readReleases,
    unreadCount,
    markAllAsRead,
    isRead: (releaseId: string) => readReleases.includes(releaseId)
  };
}
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, EyeOff, ExternalLink } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { YOUTUBE_CONFIG } from '@shared/config';

interface YouTubeVideo {
  id: string;
  title: string;
  scheduledStartTime?: string;
  actualStartTime?: string;
  liveBroadcastContent: 'live' | 'upcoming' | 'none';
  viewerCount?: number;
  thumbnailUrl: string;
  channelTitle: string;
}

interface YouTubeLiveEmbedProps {
  className?: string;
  onHide?: () => void;
  onNoContent?: () => void;
  liveUrl?: string | null; // 週のライブURL
}

export function YouTubeLiveEmbed({ className, onHide, onNoContent, liveUrl }: YouTubeLiveEmbedProps) {
  const videoRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  // Extract video ID from liveUrl or use default
  const getVideoIdFromUrl = (url: string): string => {
    // Extract video ID from various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/live\/)([^?&]+)/,
      /(?:youtube\.com\/watch\?v=)([^&]+)/,
      /(?:youtu\.be\/)([^?]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    
    return YOUTUBE_CONFIG.LIVE_VIDEO_ID; // fallback
  };

  // Show content only if liveUrl is provided
  const hasLiveUrl = Boolean(liveUrl);
  const videoId = liveUrl ? getVideoIdFromUrl(liveUrl) : YOUTUBE_CONFIG.LIVE_VIDEO_ID;
  
  const isLoading = false;
  const error = null;
  const videos = hasLiveUrl ? [{
    id: videoId,
    title: 'backspace.fm ライブ配信',
    liveBroadcastContent: 'live' as const,
    thumbnailUrl: '',
    channelTitle: 'backspace.fm'
  }] : [];

  // Sync heights between video and chat
  useEffect(() => {
    const syncHeights = () => {
      if (videoRef.current && chatRef.current) {
        const videoHeight = videoRef.current.offsetHeight;
        chatRef.current.style.height = `${videoHeight}px`;
      }
    };

    syncHeights();
    window.addEventListener('resize', syncHeights);
    
    // Use ResizeObserver for more precise detection
    const resizeObserver = new ResizeObserver(syncHeights);
    if (videoRef.current) {
      resizeObserver.observe(videoRef.current);
    }

    return () => {
      window.removeEventListener('resize', syncHeights);
      resizeObserver.disconnect();
    };
  }, [videos]);

  // Notify parent when no content is available
  useEffect(() => {
    if (!hasLiveUrl || (error || !videos || videos.length === 0) && !isLoading) {
      onNoContent?.();
    }
  }, [hasLiveUrl, error, videos, isLoading, onNoContent]);

  // Return null if no live URL is provided
  if (!hasLiveUrl) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
            backspace.fm ライブ配信
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !videos || videos.length === 0) {
    return null;
  }

  const latestVideo = videos[0];


  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded-full ${
              latestVideo.liveBroadcastContent === 'live' 
                ? 'bg-red-500 animate-pulse' 
                : 'bg-blue-500'
            }`}></div>
            backspace.fm ライブ配信
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-8 px-2"
            >
              <a href={YOUTUBE_CONFIG.LIVE_URL} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
            {onHide && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onHide}
                className="h-8 w-8 p-0"
              >
                <EyeOff className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Video and Chat Layout */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* YouTube Embed */}
            <div className="flex-grow lg:w-2/3">
              <div ref={videoRef} className="relative w-full aspect-video rounded-lg overflow-hidden">
                <iframe
                  src={`${YOUTUBE_CONFIG.EMBED_BASE_URL}${YOUTUBE_CONFIG.LIVE_VIDEO_ID}?autoplay=0&rel=0&modestbranding=1`}
                  title="backspace.fm ライブ配信"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            </div>
            
            {/* YouTube Chat - Show for live and upcoming streams */}
            {(latestVideo.liveBroadcastContent === 'live' || latestVideo.liveBroadcastContent === 'upcoming') && (
              <div className="lg:w-1/3">
                <div ref={chatRef} className="relative w-full rounded-lg overflow-hidden border bg-white">
                  <iframe
                    src={`${YOUTUBE_CONFIG.LIVE_CHAT_BASE_URL}?v=${YOUTUBE_CONFIG.LIVE_VIDEO_ID}&embed_domain=${encodeURIComponent(window.location.hostname)}&theme=light`}
                    title="ライブチャット"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    className="absolute inset-0 w-full h-full"
                  />
                </div>
              </div>
            )}
          </div>


        </div>
      </CardContent>
    </Card>
  );
}
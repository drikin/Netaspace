import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users } from 'lucide-react';

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
}

export function YouTubeLiveEmbed({ className }: YouTubeLiveEmbedProps) {
  const { data: videos, isLoading, error } = useQuery<YouTubeVideo[]>({
    queryKey: ['/api/youtube/live-videos'],
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    staleTime: 2 * 60 * 1000, // Consider stale after 2 minutes
  });

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

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
            backspace.fm ライブ配信
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            現在、ライブ配信情報を取得できません。
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!videos || videos.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
            backspace.fm ライブ配信
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            現在、予定されているライブ配信はありません。
          </p>
        </CardContent>
      </Card>
    );
  }

  const latestVideo = videos[0];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return null; // Return null for invalid dates
    }
    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (video: YouTubeVideo) => {
    switch (video.liveBroadcastContent) {
      case 'live':
        return (
          <Badge variant="destructive" className="animate-pulse">
            <div className="w-2 h-2 bg-white rounded-full mr-1"></div>
            ライブ配信中
          </Badge>
        );
      case 'upcoming':
        return (
          <Badge variant="secondary">
            <Calendar className="w-3 h-3 mr-1" />
            配信予定
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className={`w-4 h-4 rounded-full ${
            latestVideo.liveBroadcastContent === 'live' 
              ? 'bg-red-500 animate-pulse' 
              : 'bg-blue-500'
          }`}></div>
          backspace.fm ライブ配信
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Video and Chat Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* YouTube Embed */}
            <div className="lg:col-span-2">
              <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                <iframe
                  src={`https://www.youtube.com/embed/${latestVideo.id}?autoplay=0&rel=0&modestbranding=1`}
                  title={latestVideo.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            </div>
            
            {/* YouTube Chat - Show for live and upcoming streams */}
            {(latestVideo.liveBroadcastContent === 'live' || latestVideo.liveBroadcastContent === 'upcoming') && (
              <div className="lg:col-span-1">
                <div className="relative w-full aspect-video rounded-lg overflow-hidden border bg-white">
                  <iframe
                    src={`https://www.youtube.com/live_chat?v=${latestVideo.id}&embed_domain=${encodeURIComponent(window.location.hostname)}&theme=light`}
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
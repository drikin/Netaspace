import React, { useState, useMemo, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mic, ExternalLink, Link, Calendar, User } from "lucide-react";
import AdminControls from "@/components/admin-controls";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { TopicWithCommentsAndStars } from "@shared/schema";
import { formatDate } from "@/lib/date-utils";
import { useFingerprint } from "@/hooks/use-fingerprint";

interface TopicCardProps {
  topic: TopicWithCommentsAndStars;
  isAdmin?: boolean;
  refetchTopics: () => void;
}

const TopicCard = ({ topic, isAdmin = false, refetchTopics }: TopicCardProps) => {
  const [showShareDialog, setShowShareDialog] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fingerprint = useFingerprint();


  const starMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/topics/${topic.id}/star`, {
        fingerprint
      });
      const result = await response.json();
      return result;
    },
    onSuccess: (data) => {
      // Invalidate the active weeks cache to force a fresh fetch
      queryClient.invalidateQueries({ queryKey: ["/api/weeks/active"] });
      // Also call the refetch function as backup
      refetchTopics();
    },
    onError: (err) => {
      console.error('❌ Star mutation error:', err);
      toast({
        title: "エラー",
        description: "「聞きたい」の更新に失敗しました。もう一度お試しください。",
        variant: "destructive",
      });
    }
  });

  // Handle star button click
  const handleStarClick = useCallback(() => {
    if (!topic.hasStarred) {
      // Show dialog for X sharing when starring
      setShowShareDialog(true);
    }
    
    // Toggle star state - API will handle the current state automatically
    starMutation.mutate();
  }, [topic.hasStarred, starMutation, topic.id, topic.starsCount]);

  const handleShareToX = useCallback(() => {
    setShowShareDialog(false);
    
    // X (Twitter) sharing
    const shareText = `このネタを聞きたい！「${topic.title}」 #backspacefm`;
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent('https://neta.backspace.fm/')}`;
    window.open(shareUrl, '_blank', 'width=550,height=420');
  }, [topic.title]);

  const handleSkipShare = useCallback(() => {
    setShowShareDialog(false);
  }, []);

  // Memoize status badge calculation
  const statusBadge = useMemo(() => {
    const statusMap = {
      approved: { label: "承認済み", variant: "default" as const },
      rejected: { label: "却下", variant: "destructive" as const },
      completed: { label: "放送済み", variant: "outline" as const }
    };

    const status = statusMap[topic.status as keyof typeof statusMap];
    return status ? (
      <Badge variant={status.variant} className="ml-2">
        {status.label}
      </Badge>
    ) : null;
  }, [topic.status]);

  // Memoize expensive card background style calculation
  const cardBg = useMemo(() => {
    // Calculate green intensity based on vote count (backspace.fm theme)
    const getGreenIntensity = (starsCount: number) => {
      if (starsCount === 0) return { bg: 'bg-white', border: 'border-gray-200' };
      
      // Progressive green intensity based on vote count
      if (starsCount >= 10) return { bg: 'bg-green-600', border: 'border-green-700', text: 'text-white' };
      if (starsCount >= 8) return { bg: 'bg-green-500', border: 'border-green-600', text: 'text-white' };
      if (starsCount >= 6) return { bg: 'bg-green-400', border: 'border-green-500', text: 'text-white' };
      if (starsCount >= 4) return { bg: 'bg-green-300', border: 'border-green-400', text: 'text-gray-900' };
      if (starsCount >= 2) return { bg: 'bg-green-200', border: 'border-green-300', text: 'text-gray-900' };
      return { bg: 'bg-green-100', border: 'border-green-200', text: 'text-gray-900' };
    };

    // Status-based styling takes precedence for admin states
    switch (topic.status) {
      case 'completed':
        return {
          className: 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200',
          style: {},
          textClass: 'text-gray-900'
        };
      case 'approved':
        return {
          className: 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200',
          style: {},
          textClass: 'text-gray-900'
        };
      case 'rejected':
        return {
          className: 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200',
          style: {},
          textClass: 'text-gray-900'
        };
      default:
        // Use vote-based green intensity for pending/default topics
        const intensity = getGreenIntensity(topic.starsCount);
        return {
          className: `${intensity.bg} ${intensity.border}`,
          style: {},
          textClass: intensity.text || 'text-gray-900'
        };
    }
  }, [topic.status, topic.starsCount]);

  return (
    <>
      <Card className={`overflow-hidden ${cardBg.className}`} style={cardBg.style}>
        <CardContent className="p-4">
          {/* Optimized header with integrated meta information */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center mb-1">
                <a
                  href={topic.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-lg font-semibold ${cardBg.textClass} hover:text-blue-600 line-clamp-2 mr-2 cursor-pointer transition-colors duration-200 flex items-center`}
                  title="記事を開く"
                >
                  <Link className={`h-4 w-4 mr-2 flex-shrink-0 ${cardBg.textClass === 'text-white' ? 'text-gray-200' : 'text-gray-500'}`} />
                  {topic.title}
                </a>
                {statusBadge}
              </div>
              
              {/* Meta information integrated in header */}
              <div className={`flex items-center space-x-3 text-xs mb-2 ${cardBg.textClass === 'text-white' ? 'text-gray-200' : 'text-gray-500'}`}>
                <div className="flex items-center">
                  <User className="h-3 w-3 mr-1" />
                  <span>{topic.submitter}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  <span>{formatDate(topic.createdAt)}</span>
                </div>
              </div>
              
              {topic.description && (
                <p className={`text-sm line-clamp-3 ${cardBg.textClass === 'text-white' ? 'text-gray-200' : 'text-gray-600'}`}>
                  {topic.description}
                </p>
              )}
            </div>

            {/* Vote button */}
            <div className="ml-4 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleStarClick}
                disabled={starMutation.isPending}
                className={`
                  group relative overflow-hidden transition-all duration-300 ease-out
                  flex items-center space-x-2 px-4 py-2.5 rounded-full font-medium text-sm
                  transform hover:scale-105 active:scale-95
                  ${topic.hasStarred 
                    ? `bg-gradient-to-r from-pink-500 via-red-500 to-orange-500 text-white shadow-lg hover:shadow-xl border-0 ${starMutation.isPending ? 'animate-pulse' : ''}` 
                    : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 hover:from-pink-100 hover:via-red-100 hover:to-orange-100 hover:text-red-600 border border-gray-300 hover:border-red-300 hover:shadow-md'
                  }
                `}
              >
                {/* Shimmer effect for voted state */}
                {topic.hasStarred && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
                )}
                
                <Mic 
                  className={`h-4 w-4 transition-all duration-300 ${
                    topic.hasStarred 
                      ? `fill-current drop-shadow-sm ${starMutation.isPending ? 'animate-bounce' : ''}` 
                      : 'group-hover:scale-110 group-hover:text-red-500'
                  }`} 
                />
                <span className="relative z-10 font-semibold">
                  {topic.hasStarred ? '聞きたい！' : '聞きたい'}
                </span>
                <div className={`
                  relative z-10 flex items-center justify-center min-w-[22px] h-6 px-2 rounded-full font-bold text-xs
                  transition-all duration-300 transform
                  ${topic.hasStarred 
                    ? 'bg-white/30 text-white backdrop-blur-sm shadow-inner' 
                    : 'bg-white text-gray-700 shadow-sm group-hover:bg-red-50 group-hover:text-red-600 group-hover:scale-110'
                  }
                `}>
                  {topic.starsCount}
                </div>
                
                {/* Floating particles effect for voted state - only during mutation */}
                {starMutation.isPending && (
                  <>
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-300 rounded-full opacity-60 animate-ping" />
                    <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5 bg-orange-300 rounded-full opacity-40 animate-bounce delay-300" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Admin controls */}
          {isAdmin && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <AdminControls
                topicId={topic.id}
                currentStatus={topic.status}
                onStatusChange={refetchTopics}
              />
            </div>
          )}
        </CardContent>
      </Card>
      {/* X Share Confirmation Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>投票ありがとうございます！</DialogTitle>
            <DialogDescription>
              いつもbackspace.fmを応援してくれてありがとうございます。この内容をXに投稿してシェアしてくれると嬉しいです。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleSkipShare}>
              今回は共有しない
            </Button>
            <Button onClick={handleShareToX}>
              Xで共有する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TopicCard;
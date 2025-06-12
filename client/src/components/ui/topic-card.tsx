import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mic, ExternalLink, Link, Calendar, User } from "lucide-react";
import { AdminControls } from "@/components/admin-controls";
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
    mutationFn: async (action: 'add' | 'remove') => {
      const method = action === 'add' ? 'POST' : 'DELETE';
      const response = await apiRequest(method, `/api/topics/${topic.id}/star`, {
        fingerprint
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/weeks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/weeks/active'] });
      refetchTopics();
    },
    onError: (error) => {
      console.error('Star mutation error:', error);
      toast({
        title: "エラー",
        description: "スターの更新に失敗しました",
        variant: "destructive",
      });
    }
  });

  const handleStarClick = () => {
    if (topic.hasStarred) {
      starMutation.mutate('remove');
    } else {
      // Immediately add the star first
      starMutation.mutate('add');
      // Then show dialog for X sharing
      setShowShareDialog(true);
    }
  };

  const handleShareToX = () => {
    setShowShareDialog(false);
    
    // X (Twitter) sharing
    const shareText = `このネタを聞きたい！「${topic.title}」 #backspacefm`;
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent('https://neta.backspace.fm/')}`;
    window.open(shareUrl, '_blank', 'width=550,height=420');
  };

  const handleSkipShare = () => {
    setShowShareDialog(false);
  };

  const getStatusBadge = () => {
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
  };

  const getCardBackgroundStyle = () => {
    switch (topic.status) {
      case 'completed':
        return {
          className: 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200',
          style: {}
        };
      case 'approved':
        return {
          className: 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200',
          style: {}
        };
      case 'rejected':
        return {
          className: 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200',
          style: {}
        };
      default:
        return {
          className: 'bg-white border-gray-200',
          style: {}
        };
    }
  };

  const cardBg = getCardBackgroundStyle();

  return (
    <>
      <Card className={`overflow-hidden ${cardBg.className}`} style={cardBg.style}>
        <CardContent className="p-4">
          {/* Compact header - always visible */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center">
                <a
                  href={topic.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-semibold text-gray-900 hover:text-blue-600 line-clamp-2 mr-2 cursor-pointer transition-colors duration-200 flex items-center"
                  title="記事を開く"
                >
                  <Link className="h-4 w-4 mr-2 flex-shrink-0 text-gray-500" />
                  {topic.title}
                </a>
                <ExternalLink className="h-4 w-4 text-gray-400 flex-shrink-0" />
                {getStatusBadge()}
              </div>
              {topic.description && (
                <p className="text-sm text-gray-600 mt-1 line-clamp-3">
                  {topic.description}
                </p>
              )}
            </div>

            {/* Star button */}
            <div className="ml-4 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleStarClick}
                disabled={starMutation.isPending}
                className={`flex items-center space-x-1 ${
                  topic.hasStarred ? 'text-red-600 hover:text-red-700' : 'text-gray-500 hover:text-red-600'
                }`}
              >
                <Mic 
                  className={`h-4 w-4 ${topic.hasStarred ? 'fill-current' : ''}`} 
                />
                <span className="text-sm font-medium">{topic.starsCount}</span>
              </Button>
            </div>
          </div>

          {/* Meta information */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <div className="flex items-center">
                <User className="h-3 w-3 mr-1" />
                <span>{topic.submitter}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                <span>{formatDate(topic.createdAt)}</span>
              </div>
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
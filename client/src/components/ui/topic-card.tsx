import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Link, User, Clock, ExternalLink } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import AdminControls from "../admin-controls";
import { useFingerprint } from "@/hooks/use-fingerprint";
import { TopicWithCommentsAndStars } from "@shared/schema";
import { formatDate } from "@/lib/date-utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface TopicCardProps {
  topic: TopicWithCommentsAndStars;
  isAdmin?: boolean;
  refetchTopics: () => void;
}

const TopicCard: React.FC<TopicCardProps> = ({
  topic,
  isAdmin = false,
  refetchTopics,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fingerprint = useFingerprint();
  const [isStarring, setIsStarring] = useState(false);
  const [starsCount, setStarsCount] = useState(topic.starsCount);
  const [hasStarred, setHasStarred] = useState(topic.hasStarred || false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  // Star/unstar toggle mutation with proper API call
  const addStarMutation = useMutation({
    mutationFn: () => {
      // Always call the API endpoint - it handles both star and unstar operations
      return apiRequest("POST", `/api/topics/${topic.id}/star`, {
        fingerprint,
      });
    },
    // 楽観的更新: APIレスポンスを待たずにUIを更新
    onMutate: async () => {
      // 既存のクエリをキャンセル
      await queryClient.cancelQueries({ queryKey: [`/api/topics/${topic.id}`] });
      await queryClient.cancelQueries({ queryKey: ["/api/weeks/active"] });
      
      // 現在のトピックデータをスナップショットとして保存
      const previousTopicData = queryClient.getQueryData([`/api/topics/${topic.id}`]);
      const previousWeekData = queryClient.getQueryData(["/api/weeks/active"]);
      
      // 新しいいいね数を計算
      const newStarsCount = hasStarred 
        ? Math.max(0, starsCount - 1)  // いいね解除の場合
        : starsCount + 1;              // いいね追加の場合
      
      const newHasStarred = !hasStarred;
      
      // キャッシュを楽観的に更新（いいね状態とカウントを更新）
      queryClient.setQueryData([`/api/topics/${topic.id}`], (oldData: any) => {
        if (!oldData) return oldData;
        
        return {
          ...oldData,
          starsCount: newStarsCount,
          hasStarred: newHasStarred
        };
      });
      
      // アクティブウィークのデータも更新
      queryClient.setQueryData(["/api/weeks/active"], (oldData: any) => {
        if (!oldData || !oldData.topics) return oldData;
        
        return {
          ...oldData,
          topics: oldData.topics.map((t: TopicWithCommentsAndStars) => 
            t.id === topic.id 
              ? { ...t, starsCount: newStarsCount, hasStarred: newHasStarred }
              : t
          )
        };
      });
      
      // UIステートを即座に更新
      setStarsCount(newStarsCount);
      setHasStarred(newHasStarred);
      
      // ロールバック用に前の状態を返す
      return { previousTopicData, previousWeekData };
    },
    onError: (err, _, context) => {
      // エラー時は以前の状態に戻す
      if (context?.previousTopicData) {
        queryClient.setQueryData([`/api/topics/${topic.id}`], context.previousTopicData);
      }
      if (context?.previousWeekData) {
        queryClient.setQueryData(["/api/weeks/active"], context.previousWeekData);
      }
      
      // UIステートも元に戻す
      setStarsCount(topic.starsCount);
      setHasStarred(topic.hasStarred || false);
      
      console.error("Failed to star topic:", err);
      toast({
        title: "操作できませんでした",
        description: "問題が発生しました。後でもう一度お試しください。",
        variant: "destructive",
      });
    },
    onSuccess: (response: any) => {
      // Update UI state with actual response from server
      if (response?.starsCount !== undefined && response?.hasStarred !== undefined) {
        setStarsCount(response.starsCount);
        setHasStarred(response.hasStarred);
        
        // Show appropriate message based on action
        const action = response.action;
        toast({
          title: action === 'starred' ? "聞きたいを追加しました！" : "聞きたいを解除しました",
          description: action === 'starred' 
            ? "フィードバックありがとうございます。" 
            : "このトピックの聞きたいを解除しました。",
        });
      }
      
      // 必要なクエリを無効化して最新データを再取得
      queryClient.invalidateQueries({ queryKey: [`/api/topics/${topic.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/weeks/active"] });
    },
    onSettled: () => {
      setIsStarring(false);
    }
  });

  const handleStarClick = () => {
    console.log('Star click - isStarring:', isStarring, 'fingerprint:', fingerprint, 'isAdmin:', isAdmin);
    
    if (isStarring || !fingerprint) {
      console.log('Star click blocked - isStarring:', isStarring, 'fingerprint:', fingerprint);
      return;
    }
    
    // If user hasn't starred yet, show share dialog
    if (!hasStarred) {
      setShowShareDialog(true);
    } else {
      // If already starred, just unstar without dialog
      setIsStarring(true);
      addStarMutation.mutate();
    }
  };

  const handleStarWithoutShare = () => {
    setShowShareDialog(false);
    setIsStarring(true);
    addStarMutation.mutate();
  };

  const handleStarAndShare = () => {
    setShowShareDialog(false);
    setIsStarring(true);
    addStarMutation.mutate();
    
    // Create X share URL
    const shareText = `このネタを聞きたい！「${topic.title}」 #backspacefm`;
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(topic.url)}`;
    
    // Open X share dialog
    window.open(shareUrl, '_blank', 'width=550,height=420');
  };

  const getStatusBadge = () => {
    if (topic.status === "deleted") {
      return (
        <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs ml-2">削除済み</span>
      );
    } else if (topic.status === "featured") {
      return (
        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs ml-2">採用</span>
      );
    }
    return null;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  // Dynamic background color based on stars count
  const getCardBackgroundStyle = () => {
    if (starsCount === 0) {
      return { className: "bg-white", style: {} };
    }

    // Progressive gradient intensity based on vote count - backspace.fm green theme
    const intensity = Math.min(starsCount / 8, 1); // Max intensity at 8+ votes (lower threshold)
    const baseHue = 160; // Green base (backspace.fm inspired)
    const saturation = 35 + (intensity * 45); // 35% to 80% saturation (more vibrant)
    const lightness = 95 - (intensity * 15); // 95% to 80% lightness (more contrast)

    const backgroundColor = `hsl(${baseHue}, ${saturation}%, ${lightness}%)`;
    const borderColor = `hsl(${baseHue}, ${saturation + 20}%, ${lightness - 12}%)`;

    return {
      className: "border-2",
      style: {
        backgroundColor,
        borderColor,
        background: `linear-gradient(135deg, ${backgroundColor} 0%, hsl(${baseHue - 8}, ${saturation + 5}%, ${lightness - 2}%) 100%)`
      }
    };
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
              {getStatusBadge()}
            </div>
            <div className="flex items-center text-xs text-gray-500 mt-1">
              <User className="h-3 w-3 mr-1" />
              <span className="mr-3">{topic.submitter}</span>
              <Clock className="h-3 w-3 mr-1" />
              <span>{formatDate(topic.createdAt as any)}</span>
            </div>
          </div>

          {/* Compact cheer button */}
          <button
            className={`ml-3 flex flex-col items-center min-w-[50px] ${hasStarred ? "text-red-500" : "text-gray-400 hover:text-red-400"} ${isStarring ? "opacity-50 cursor-wait" : "cursor-pointer"} transition-all duration-200`}
            onClick={handleStarClick}
            disabled={isStarring}
            aria-label={hasStarred ? "聞きたいを取り消す" : "聞きたいを追加する"}
            title={hasStarred ? "聞きたいを取り消す" : "この話題を聞きたい！"}
          >
            <svg className="h-5 w-5 transition-all duration-200" xmlns="http://www.w3.org/2000/svg" fill={hasStarred ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 8c0-3.3 2.7-6 6-6s6 2.7 6 6c0 1.7-.7 3.2-1.8 4.3" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 8c0-1.7 1.3-3 3-3s3 1.3 3 3c0 .8-.3 1.5-.8 2" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10.5c.3 0 .5.2.5.5s-.2.5-.5.5-.5-.2-.5-.5.2-.5.5-.5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16c0-2.2 1.8-4 4-4s4 1.8 4 4" />
              {hasStarred && (
                <>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 8c1.1 0 2-.9 2-2" opacity="0.6" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 8c1.7 0 3-1.3 3-3" opacity="0.4" />
                </>
              )}
            </svg>
            <div className="flex flex-col items-center">
              <span className={`text-xs font-semibold ${hasStarred ? "text-red-500" : "text-gray-500"}`}>{starsCount}</span>
              <span className={`text-[9px] leading-tight ${hasStarred ? "text-red-400" : "text-gray-400"}`}>聞きたい</span>
            </div>
          </button>
        </div>

        {/* Description - always visible if present */}
        {topic.description && (
          <div className="mt-2 text-gray-700 text-sm">
            <p className="line-clamp-2">{topic.description}</p>
          </div>
        )}



        {/* Admin controls - compact */}
        {isAdmin && (
          <div className="mt-3 pt-2 border-t border-gray-100">
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
      <AlertDialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>このネタをXで共有しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「聞きたい」を追加すると同時に、このネタについてXで共有することができます。
              <br />
              <span className="text-sm text-gray-500 mt-2 block">
                投稿内容: 「このネタを聞きたい！「{topic.title}」 #backspacefm」
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleStarWithoutShare}>
              共有せずに聞きたいを追加
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleStarAndShare}>
              Xで共有して聞きたいを追加
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TopicCard;

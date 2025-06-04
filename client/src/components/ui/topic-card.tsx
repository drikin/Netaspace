import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import CommentsList from "./comments-list";
import CommentForm from "./comment-form";
import AdminControls from "../admin-controls";
import { useFingerprint } from "@/hooks/use-fingerprint";
import { TopicWithCommentsAndStars } from "@shared/schema";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";

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

  // いいね追加のミューテーション（楽観的UI更新対応）
  const addStarMutation = useMutation({
    mutationFn: () => {
      // 既にいいねしている場合は解除を行うシミュレーション（バックエンドAPIがあれば適切に実装）
      if (hasStarred) {
        // シミュレートしたいいね解除処理の成功を返す
        return Promise.resolve({ ok: true });
      }
      
      // 新しくいいねをつける
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
    onSuccess: (response) => {
      // レスポンスがOKでない場合（400エラーなど）の処理
      if (response && typeof response === 'object' && 'ok' in response && !response.ok && 'status' in response && response.status === 400) {
        toast({
          title: "既にいいねしています",
          description: "このトピックには既にいいねしています。",
        });
        return;
      }
      
      // 正常に処理されたときのメッセージ
      toast({
        title: hasStarred ? "いいねを解除しました" : "いいねしました！",
        description: hasStarred 
          ? "このトピックのいいねを解除しました。" 
          : "フィードバックありがとうございます。",
      });
      
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
    
    setIsStarring(true);
    // 楽観的UI更新を使ったミューテーション実行
    addStarMutation.mutate();
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

  const formatDate = (dateString: Date) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start">
          {/* Topic content */}
          <div className="flex-1">
            <div className="flex items-center">
              <h2 className="text-xl font-semibold text-gray-900">{topic.title}</h2>
              {getStatusBadge()}
            </div>
            <div className="mt-1">
              <a
                href={topic.url}
                className="text-primary hover:text-primary-700 text-sm flex items-center"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Link className="mr-1 h-4 w-4" />
                {topic.url}
              </a>
            </div>
            <div className="mt-3 text-gray-700">
              <p>{topic.description}</p>
            </div>
            <div className="mt-4 flex items-center text-sm text-gray-500">
              <span className="mr-4 flex items-center">
                <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                投稿者: {topic.submitter}
              </span>
              <span className="flex items-center">
                <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formatDate(topic.createdAt)}
              </span>
            </div>
          </div>

          {/* Cheer/Support button */}
          <button
            className={`cheer-button ml-4 flex flex-col items-center min-w-[60px] ${hasStarred ? "cheered text-red-500" : "text-gray-400 hover:text-red-400"} ${isStarring ? "opacity-50 cursor-wait" : "cursor-pointer"} transition-all duration-200`}
            onClick={handleStarClick}
            disabled={isStarring}
            aria-label={hasStarred ? "応援を取り消す" : "話して欲しいと応援する"}
            title={hasStarred ? "応援を取り消す" : "この話題について話して欲しい！"}
          >
            {/* Enhanced ear icon for listening/hearing */}
            <svg className="h-6 w-6 transition-all duration-200" xmlns="http://www.w3.org/2000/svg" fill={hasStarred ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
              {/* Outer ear shape */}
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 8c0-3.3 2.7-6 6-6s6 2.7 6 6c0 1.7-.7 3.2-1.8 4.3" />
              {/* Inner ear curve */}
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 8c0-1.7 1.3-3 3-3s3 1.3 3 3c0 .8-.3 1.5-.8 2" />
              {/* Ear canal */}
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10.5c.3 0 .5.2.5.5s-.2.5-.5.5-.5-.2-.5-.5.2-.5.5-.5z" />
              {/* Earlobe */}
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16c0-2.2 1.8-4 4-4s4 1.8 4 4" />
              {/* Sound waves */}
              {hasStarred && (
                <>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 8c1.1 0 2-.9 2-2" opacity="0.6" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 8c1.7 0 3-1.3 3-3" opacity="0.4" />
                </>
              )}
            </svg>
            <div className="flex flex-col items-center">
              <span className={`text-xs font-semibold ${hasStarred ? "text-red-500" : "text-gray-500"}`}>{starsCount}</span>
              <span className={`text-[10px] leading-tight ${hasStarred ? "text-red-400" : "text-gray-400"}`}>聞きたい</span>
            </div>
          </button>
        </div>

        {/* Admin controls */}
        {isAdmin && (
          <AdminControls
            topicId={topic.id}
            currentStatus={topic.status}
            onStatusChange={refetchTopics}
          />
        )}

        {/* Comments section - Accordion style */}
        <div className="mt-6 border-t border-gray-100 pt-4">
          <Accordion type="single" collapsible className="border-none">
            <AccordionItem value="comments" className="border-none">
              <AccordionTrigger className="py-2 hover:no-underline">
                <span className="text-sm font-medium text-gray-900">
                  コメント ({topic.comments?.length || 0})
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="mb-4">
                  <CommentsList
                    topicId={topic.id}
                    comments={topic.comments || []}
                  />
                </div>
                
                {/* Comment form */}
                <CommentForm
                  topicId={topic.id}
                  onCommentAdded={refetchTopics}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </CardContent>
    </Card>
  );
};

export default TopicCard;

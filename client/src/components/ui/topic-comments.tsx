import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useFingerprint } from "@/hooks/use-fingerprint";
import { MessageSquare, Send, Trash2, User } from "lucide-react";
import { formatDate } from "@/lib/date-utils";
import type { Comment } from "@shared/schema";

interface TopicCommentsProps {
  topicId: number;
  isAdmin?: boolean;
}

const TopicComments: React.FC<TopicCommentsProps> = ({ topicId, isAdmin = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [commenter, setCommenter] = useState(() => {
    return localStorage.getItem("neta-commenter-name") || "";
  });
  const [content, setContent] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fingerprint = useFingerprint();

  const { data: comments = [], isLoading } = useQuery<Comment[]>({
    queryKey: ["/api/topics", topicId, "comments"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/topics/${topicId}/comments`);
      return await res.json();
    },
    enabled: isOpen,
  });

  const addCommentMutation = useMutation({
    mutationFn: async (data: { content: string; commenter: string }) => {
      const res = await apiRequest("POST", `/api/topics/${topicId}/comments`, {
        ...data,
        fingerprint,
      });
      return await res.json();
    },
    onSuccess: () => {
      setContent("");
      localStorage.setItem("neta-commenter-name", commenter);
      queryClient.invalidateQueries({ queryKey: ["/api/topics", topicId, "comments"] });
      toast({ title: "コメントを投稿しました" });
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "コメントの投稿に失敗しました。",
        variant: "destructive",
      });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      await apiRequest("DELETE", `/api/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/topics", topicId, "comments"] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !commenter.trim()) return;
    addCommentMutation.mutate({ content: content.trim(), commenter: commenter.trim() });
  };

  return (
    <div className="mt-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
      >
        <MessageSquare className="h-3.5 w-3.5" />
        <span>コメント{comments.length > 0 ? ` (${comments.length})` : ""}</span>
      </button>

      {isOpen && (
        <div className="mt-2 space-y-2">
          {/* Comment list */}
          {isLoading ? (
            <p className="text-xs text-gray-400">読み込み中...</p>
          ) : comments.length > 0 ? (
            <div className="space-y-1.5">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="bg-white/70 rounded px-3 py-2 text-sm border border-gray-100"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <User className="h-3 w-3" />
                      <span className="font-medium text-gray-700">{comment.commenter}</span>
                      <span>·</span>
                      <span>{formatDate(comment.createdAt)}</span>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => deleteCommentMutation.mutate(comment.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="コメントを削除"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <p className="text-gray-800 mt-1 whitespace-pre-wrap">{comment.content}</p>
                </div>
              ))}
            </div>
          ) : null}

          {/* Comment form */}
          <form onSubmit={handleSubmit} className="space-y-1.5">
            <Input
              value={commenter}
              onChange={(e) => setCommenter(e.target.value)}
              placeholder="名前"
              className="h-8 text-sm bg-white/70"
              required
            />
            <div className="flex gap-1.5">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="ここが聞きたい！こう思う！など自由にコメント"
                className="min-h-[60px] text-sm bg-white/70 resize-none"
                required
              />
              <Button
                type="submit"
                size="sm"
                disabled={addCommentMutation.isPending || !content.trim() || !commenter.trim()}
                className="self-end px-3"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default TopicComments;

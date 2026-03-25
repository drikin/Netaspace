import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { MessageCircle } from "lucide-react";

interface RecentComment {
  id: number;
  topicId: number;
  content: string;
  commenter: string;
  createdAt: string;
  topicTitle: string;
}

interface LatestCommentsProps {
  weekId?: number;
}

const LatestComments: React.FC<LatestCommentsProps> = ({ weekId }) => {
  const { data: comments = [] } = useQuery<RecentComment[]>({
    queryKey: ["/api/comments/recent", weekId],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "10" });
      if (weekId) params.set("weekId", String(weekId));
      const res = await apiRequest("GET", `/api/comments/recent?${params}`);
      return await res.json();
    },
    staleTime: 1000 * 60 * 2,
  });

  if (comments.length === 0) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return "たった今";
    if (diffMin < 60) return `${diffMin}分前`;
    if (diffHour < 24) return `${diffHour}時間前`;
    if (diffDay < 7) return `${diffDay}日前`;
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500">
        <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
          <MessageCircle className="h-4 w-4" />
          最新コメント
        </h3>
      </div>
      <div className="divide-y divide-gray-50">
        {comments.map((comment) => (
          <button
            key={comment.id}
            type="button"
            className="block w-full text-left px-3 py-2.5 hover:bg-blue-50/50 transition-colors group"
            onClick={() => {
              const el = document.getElementById(`topic-${comment.topicId}`);
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent("open-topic-comments", { detail: { topicId: comment.topicId } }));
                }, 400);
              }
            }}
          >
            <p className="text-xs text-gray-800 line-clamp-2 leading-relaxed">
              {comment.content}
            </p>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[11px] text-gray-500 font-medium truncate max-w-[60%]">
                {comment.commenter}
              </span>
              <span className="text-[11px] text-gray-400">
                {formatDate(comment.createdAt)}
              </span>
            </div>
            <p className="text-[11px] text-blue-500/70 truncate mt-0.5 group-hover:text-blue-600">
              {comment.topicTitle}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default LatestComments;

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Globe, ExternalLink, Loader2 } from "lucide-react";

interface ReactionResult {
  title: string;
  url: string;
  source: string;
}

interface TopicReactionsProps {
  topicId: number;
}

const TopicReactions: React.FC<TopicReactionsProps> = ({ topicId }) => {
  const [isOpen, setIsOpen] = useState(false);

  const { data, isLoading } = useQuery<{ results: ReactionResult[]; cachedAt: number }>({
    queryKey: ["/api/topics", topicId, "reactions"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/topics/${topicId}/reactions`);
      return await res.json();
    },
    enabled: isOpen,
    staleTime: 1000 * 60 * 30, // 30分キャッシュ
  });

  const results = data?.results || [];

  return (
    <div className="mt-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
      >
        <Globe className="h-3.5 w-3.5" />
        <span>世の中の反応</span>
      </button>

      {isOpen && (
        <div className="mt-2">
          {isLoading ? (
            <div className="flex items-center gap-1.5 text-xs text-gray-400 py-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>検索中...</span>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-1.5">
              {results.map((result, i) => (
                <a
                  key={i}
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 bg-white/70 rounded px-3 py-2 text-sm border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 transition-colors group"
                >
                  <ExternalLink className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-gray-400 group-hover:text-blue-500" />
                  <div className="min-w-0">
                    <p className="text-gray-800 text-sm leading-snug line-clamp-2 group-hover:text-blue-700">
                      {result.title}
                    </p>
                    <span className="text-xs text-gray-400 mt-0.5 block truncate">
                      {(() => { try { return new URL(result.url).hostname; } catch { return result.url; } })()}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 py-1">関連する反応は見つかりませんでした</p>
          )}
        </div>
      )}
    </div>
  );
};

export default TopicReactions;

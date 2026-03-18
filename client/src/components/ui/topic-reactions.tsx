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

const XIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const TopicReactions: React.FC<TopicReactionsProps> = ({ topicId }) => {
  const [isOpen, setIsOpen] = useState(false);

  const { data, isLoading } = useQuery<{ results: ReactionResult[]; xResults: ReactionResult[]; cachedAt: number }>({
    queryKey: ["/api/topics", topicId, "reactions"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/topics/${topicId}/reactions`);
      return await res.json();
    },
    enabled: isOpen,
    staleTime: 1000 * 60 * 30, // 30分キャッシュ
  });

  const results = data?.results || [];
  const xResults = data?.xResults || [];

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
          ) : (
            <div className="space-y-3">
              {/* X/Twitter reactions section */}
              {xResults.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <XIcon className="h-3.5 w-3.5 text-gray-700" />
                    <span className="text-xs font-medium text-gray-600">Xの反応（{xResults.length}件）</span>
                  </div>
                  <div className="space-y-1.5">
                    {xResults.map((result, i) => (
                      <a
                        key={i}
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-2 bg-white/70 rounded px-3 py-2 text-sm border border-gray-100 hover:border-gray-300 hover:bg-gray-50/50 transition-colors group"
                      >
                        <XIcon className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-gray-400 group-hover:text-gray-700" />
                        <div className="min-w-0">
                          <p className="text-gray-800 text-sm leading-snug line-clamp-2 group-hover:text-gray-900">
                            {result.title}
                          </p>
                          <span className="text-xs text-gray-400 mt-0.5 block truncate">
                            {(() => { try { return new URL(result.url).hostname; } catch { return result.url; } })()}
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Web reactions section */}
              {results.length > 0 && (
                <div>
                  {xResults.length > 0 && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Globe className="h-3.5 w-3.5 text-gray-500" />
                      <span className="text-xs font-medium text-gray-600">Webの反応（{results.length}件）</span>
                    </div>
                  )}
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
                </div>
              )}

              {results.length === 0 && xResults.length === 0 && (
                <p className="text-xs text-gray-400 py-1">関連する反応は見つかりませんでした</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TopicReactions;

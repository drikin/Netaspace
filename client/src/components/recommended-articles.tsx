import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Sparkles, ExternalLink, Loader2, ChevronDown, ChevronUp } from "lucide-react";

interface GrokRecommendation {
  title: string;
  url: string;
  reason: string;
}

interface RecommendedArticlesResponse {
  available: boolean;
  recommendations?: GrokRecommendation[];
}

interface RecommendedArticlesProps {
  weekId: number;
}

const RecommendedArticles: React.FC<RecommendedArticlesProps> = ({ weekId }) => {
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-articles-collapsed') === 'true';
  });

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar-articles-collapsed', String(next));
      return next;
    });
  };

  const { data, isLoading } = useQuery<RecommendedArticlesResponse>({
    queryKey: ["/api/weeks", weekId, "recommended-articles"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/weeks/${weekId}/recommended-articles`);
      return await res.json();
    },
    staleTime: 1000 * 60 * 60 * 24, // 24時間キャッシュ
  });

  // Hide entirely when not available or loading
  const headerButton = (
    <button
      type="button"
      onClick={toggleCollapsed}
      className="w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-between cursor-pointer"
    >
      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
        <Sparkles className="h-4 w-4" />
        おすすめ記事
      </h3>
      {collapsed ? (
        <ChevronDown className="h-4 w-4 text-white/80" />
      ) : (
        <ChevronUp className="h-4 w-4 text-white/80" />
      )}
    </button>
  );

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {headerButton}
        {!collapsed && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 py-6">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>記事を探索中...</span>
          </div>
        )}
      </div>
    );
  }

  if (!data?.available || !data.recommendations?.length) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {headerButton}
      {!collapsed && (
        <>
          <div className="divide-y divide-gray-50">
            {data.recommendations.map((article, i) => (
              <a
                key={i}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-3 py-2.5 hover:bg-amber-50/50 transition-colors group"
              >
                <div className="flex items-start gap-2">
                  <ExternalLink className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-gray-400 group-hover:text-amber-500" />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-800 line-clamp-2 leading-relaxed group-hover:text-amber-700 font-medium">
                      {article.title}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">
                      {article.reason}
                    </p>
                    <span className="text-[10px] text-gray-300 block truncate mt-0.5">
                      {(() => { try { return new URL(article.url).hostname; } catch { return ""; } })()}
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
          <div className="px-3 py-1.5 text-right">
            <span className="text-[10px] text-gray-300">Powered by Grok</span>
          </div>
        </>
      )}
    </div>
  );
};

export default RecommendedArticles;

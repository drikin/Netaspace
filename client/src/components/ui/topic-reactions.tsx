import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Globe, ExternalLink, Loader2, Twitter, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ReactionResult {
  title: string;
  url: string;
  source: string;
}

interface GrokXSummary {
  sentiment: "positive" | "negative" | "mixed" | "neutral";
  summary: string;
  keyOpinions: string[];
  tweetCount?: string;
}

interface XSummaryResponse {
  available: boolean;
  summary?: GrokXSummary;
  reason?: string;
}

interface TopicReactionsProps {
  topicId: number;
}

const sentimentConfig = {
  positive: { label: "ポジティブ", color: "bg-green-100 text-green-700", icon: TrendingUp },
  negative: { label: "ネガティブ", color: "bg-red-100 text-red-700", icon: TrendingDown },
  mixed: { label: "賛否両論", color: "bg-yellow-100 text-yellow-700", icon: Minus },
  neutral: { label: "中立", color: "bg-gray-100 text-gray-600", icon: Minus },
};

const TopicReactions: React.FC<TopicReactionsProps> = ({ topicId }) => {
  const [isOpen, setIsOpen] = useState(false);

  const { data, isLoading } = useQuery<{ results: ReactionResult[]; cachedAt: number }>({
    queryKey: ["/api/topics", topicId, "reactions"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/topics/${topicId}/reactions`);
      return await res.json();
    },
    enabled: isOpen,
    staleTime: 1000 * 60 * 30,
  });

  const { data: xSummary, isLoading: isXLoading } = useQuery<XSummaryResponse>({
    queryKey: ["/api/topics", topicId, "x-summary"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/topics/${topicId}/x-summary`);
      return await res.json();
    },
    enabled: isOpen,
    staleTime: 1000 * 60 * 60 * 24, // 24時間キャッシュ
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
        <div className="mt-2 space-y-3">
          {/* Grok X Summary Section */}
          {isXLoading ? (
            <div className="flex items-center gap-1.5 text-xs text-gray-400 py-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Xの反応を分析中...</span>
            </div>
          ) : xSummary?.available && xSummary.summary ? (
            <XSummaryCard summary={xSummary.summary} />
          ) : null}

          {/* Existing Web Reactions Section */}
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

const XSummaryCard: React.FC<{ summary: GrokXSummary }> = ({ summary }) => {
  const config = sentimentConfig[summary.sentiment];
  const SentimentIcon = config.icon;

  return (
    <div className="rounded-lg border border-blue-100 bg-gradient-to-r from-blue-50/80 to-sky-50/80 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Twitter className="h-3.5 w-3.5 text-sky-500" />
        <span className="text-xs font-medium text-sky-700">Xでの反応</span>
        <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full ${config.color}`}>
          <SentimentIcon className="h-3 w-3" />
          {config.label}
        </span>
        {summary.tweetCount && (
          <span className="text-xs text-gray-400 ml-auto">話題度: {summary.tweetCount}</span>
        )}
      </div>
      <p className="text-sm text-gray-700 leading-relaxed">{summary.summary}</p>
      {summary.keyOpinions.length > 0 && (
        <ul className="mt-2 space-y-1">
          {summary.keyOpinions.map((opinion, i) => (
            <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
              <span className="text-sky-400 mt-0.5">•</span>
              <span>{opinion}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[10px] text-gray-300 mt-2 text-right">Powered by Grok</p>
    </div>
  );
};

export default TopicReactions;

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import WeekSelector from "@/components/week-selector";
import TabNavigation from "@/components/tab-navigation";
import TopicCard from "@/components/ui/topic-card";
import { BookmarkletGenerator } from "@/components/bookmarklet-generator";
import { useFingerprint } from "@/hooks/use-fingerprint";
import { TopicWithCommentsAndStars, WeekWithTopics } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle, Heart, Clock } from "lucide-react";

type SortOrder = "stars" | "newest";

const Home: React.FC = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("stars");
  const fingerprint = useFingerprint();
  const queryClient = useQueryClient();

  // Fetch active week with topics
  const { data: week, isLoading, refetch, error } = useQuery<WeekWithTopics>({
    queryKey: ["/api/weeks/active", fingerprint],
    enabled: !!fingerprint,
    staleTime: 1000 * 60, // 1 minute
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Force cache clear for production issues
  const handleForceClear = () => {
    queryClient.clear();
    localStorage.removeItem('fingerprint');
    window.location.reload();
  };

  // Check if user is authenticated and is admin
  const { data: auth } = useQuery<{ user: { id: number; username: string; isAdmin: boolean } }>({
    queryKey: ["/api/auth/me"],
  });

  const isAdmin = auth?.user?.isAdmin;

  const getFilteredTopics = (): TopicWithCommentsAndStars[] => {
    if (!week || !week.topics) return [];

    let filteredTopics: TopicWithCommentsAndStars[] = [];

    switch (activeTab) {
      case "featured":
        filteredTopics = week.topics.filter(
          (topic) => topic.status === "featured"
        );
        break;
      case "pending":
        filteredTopics = week.topics.filter(
          (topic) => !topic.status || topic.status === "pending"
        );
        break;
      case "all":
      default:
        filteredTopics = week.topics;
        break;
    }

    // Sort topics based on selected sort order
    return filteredTopics.sort((a, b) => {
      switch (sortOrder) {
        case "newest":
          // Sort by creation time (newest first)
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "stars":
        default:
          // Sort by stars count (descending) - topics with more "聞きたい" votes appear first
          return b.starsCount - a.starsCount;
      }
    });
  };

  const handleTabChange = (tab: string) => {
    // Prevent non-admin users from accessing admin-only tabs
    if (!isAdmin && tab === "performance") {
      setActiveTab("all");
      return;
    }
    setActiveTab(tab);
  };

  const topics = getFilteredTopics();

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <WeekSelector week={week as any} isLoading={isLoading} />

      <div className="flex justify-between items-center mb-4">
        <TabNavigation onTabChange={handleTabChange} activeTab={activeTab} isAdmin={isAdmin} />
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            更新
          </Button>
          {error && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleForceClear}
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              完全リセット
            </Button>
          )}
        </div>
      </div>

      {/* Sort Controls */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={sortOrder === "stars" ? "default" : "outline"}
          size="sm"
          onClick={() => setSortOrder("stars")}
        >
          <Heart className="h-4 w-4 mr-2" />
          聞きたい順
        </Button>
        <Button
          variant={sortOrder === "newest" ? "default" : "outline"}
          size="sm"
          onClick={() => setSortOrder("newest")}
        >
          <Clock className="h-4 w-4 mr-2" />
          新しい順
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <h3 className="text-red-800 font-medium">データ読み込みエラー</h3>
          </div>
          <p className="text-red-700 text-sm mt-2">
            データの取得に失敗しました。ページを更新するか、完全リセットをお試しください。
          </p>
          <details className="mt-2">
            <summary className="text-red-600 cursor-pointer text-sm">詳細情報</summary>
            <pre className="text-xs text-red-600 mt-1 overflow-auto">
              {JSON.stringify(error, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {/* Debug Info for Production */}
      {!week && !isLoading && !error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
            <h3 className="text-yellow-800 font-medium">表示問題の検出</h3>
          </div>
          <p className="text-yellow-700 text-sm mt-2">
            データが正常に読み込まれていない可能性があります。「完全リセット」をお試しください。
          </p>
          <div className="mt-3 space-y-1 text-xs text-yellow-600">
            <div>フィンガープリント: {fingerprint || "未生成"}</div>
            <div>環境: {process.env.NODE_ENV || "不明"}</div>
            <div>タイムスタンプ: {new Date().toLocaleString('ja-JP')}</div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleForceClear}
            className="mt-3"
          >
            完全リセット
          </Button>
        </div>
      )}

      <div className="space-y-6 px-4 sm:px-0">
        {isLoading ? (
          // Loading state
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-lg shadow overflow-hidden p-6 animate-pulse"
            >
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
              <div className="h-16 bg-gray-200 rounded w-full mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))
        ) : topics.length > 0 ? (
          // Topics list
          topics.map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              isAdmin={isAdmin}
              refetchTopics={refetch}
            />
          ))
        ) : (
          // Empty state
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-500">
              {activeTab === "all"
                ? "この週にはまだトピックがありません。新しいトピックを投稿しましょう！"
                : activeTab === "featured"
                ? "この週にはまだ採用されたトピックがありません。"
                : "この週には未確認のトピックがありません。"}
            </p>
          </div>
        )}
        
        {/* Bookmarklet Generator */}
        <BookmarkletGenerator className="mt-8" />
      </div>
    </div>
  );
};

export default Home;

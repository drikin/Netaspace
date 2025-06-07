import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import WeekSelector from "@/components/week-selector";
import TabNavigation from "@/components/tab-navigation";
import TopicCard from "@/components/ui/topic-card";
import { BookmarkletGenerator } from "@/components/bookmarklet-generator";
import { useFingerprint } from "@/hooks/use-fingerprint";
import { TopicWithCommentsAndStars } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle } from "lucide-react";

const Home: React.FC = () => {
  const [activeTab, setActiveTab] = useState("all");
  const fingerprint = useFingerprint();
  const queryClient = useQueryClient();

  // Fetch active week with topics
  const { data: week, isLoading, refetch, error } = useQuery({
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
  const { data: auth } = useQuery({
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

    // Sort by stars count (descending) - topics with more "聞きたい" votes appear first
    return filteredTopics.sort((a, b) => b.starsCount - a.starsCount);
  };

  const handleTabChange = (tab: string) => {
    // Prevent non-admin users from accessing admin-only tabs
    if (!isAdmin && (tab === "deleted" || tab === "performance")) {
      setActiveTab("all");
      return;
    }
    setActiveTab(tab);
  };

  const topics = getFilteredTopics();

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <WeekSelector week={week} isLoading={isLoading} />

      <div className="flex justify-between items-center mb-4">
        <TabNavigation onTabChange={handleTabChange} activeTab={activeTab} isAdmin={isAdmin} />
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
          className="ml-4"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          更新
        </Button>
      </div>

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

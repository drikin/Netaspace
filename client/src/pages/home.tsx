import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import WeekSelector from "@/components/week-selector";
import TabNavigation from "@/components/tab-navigation";
import TopicCard from "@/components/ui/topic-card";
import { BookmarkletGenerator } from "@/components/bookmarklet-generator";
import { useFingerprint } from "@/hooks/use-fingerprint";
import { TopicWithCommentsAndStars } from "@shared/schema";

const Home: React.FC = () => {
  const [activeTab, setActiveTab] = useState("all");
  const fingerprint = useFingerprint();

  // Fetch active week with topics
  const { data: week, isLoading, refetch } = useQuery({
    queryKey: ["/api/weeks/active", fingerprint],
    enabled: !!fingerprint,
  });

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
    setActiveTab(tab);
  };

  const topics = getFilteredTopics();

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <WeekSelector week={week} isLoading={isLoading} />

      <TabNavigation onTabChange={handleTabChange} activeTab={activeTab} />

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

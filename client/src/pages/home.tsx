import React, { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import WeekSelector from "@/components/week-selector";
import TabNavigation from "@/components/tab-navigation";
import TopicCard from "@/components/ui/topic-card";
import { YouTubeLiveEmbed } from "@/components/youtube-live-embed";
import TopicTop10Board from "@/components/topic-top10-board";
import TrendingSidebar from "@/components/trending-sidebar";
import { useFingerprint } from "@/hooks/use-fingerprint";
import { TopicWithCommentsAndStars, WeekWithTopics } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle, Heart, Clock, Eye, EyeOff, PanelLeftClose, PanelLeft } from "lucide-react";
import { Article } from "@shared/types/article-source";

type SortOrder = "stars" | "newest";

const Home: React.FC = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("stars");
  const [isLiveVisible, setIsLiveVisible] = useState(() => {
    // Load state from localStorage, default to true if not found
    const saved = localStorage.getItem('liveVisible');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [hasLiveContent, setHasLiveContent] = useState(true); // Track if live content exists
  const [selectedSubmitters, setSelectedSubmitters] = useState<string[]>([]);
  const [rankingBoardOffset, setRankingBoardOffset] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    // Load sidebar state from localStorage
    const saved = localStorage.getItem('trendingSidebarOpen');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const topicListRef = useRef<HTMLDivElement>(null);
  const contentHeaderRef = useRef<HTMLDivElement>(null);
  const fingerprint = useFingerprint();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  // Star functionality verified and working correctly

  // Fetch active week with topics - optimized refresh strategy
  const { data: week, isLoading, refetch, error } = useQuery<WeekWithTopics>({
    queryKey: ["/api/weeks/active", fingerprint],
    enabled: !!fingerprint,
    // Use global staleTime from queryClient (2 minutes)
    refetchInterval: false, // Disable automatic polling for better performance
    refetchOnMount: true,
    refetchOnWindowFocus: false, // Manual refresh only
    refetchIntervalInBackground: false,
  });

  // Smart refresh when returning to tab - only if data is stale
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && fingerprint) {
        // Only refetch if data is older than 2 minutes
        const lastFetch = queryClient.getQueryState(["/api/weeks/active", fingerprint])?.dataUpdatedAt;
        const isStale = !lastFetch || (Date.now() - lastFetch) > 1000 * 60 * 2;
        
        if (isStale) {
          refetch();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refetch, fingerprint, queryClient]);

  // Keyboard shortcut for topic submission (N key)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only trigger if no input elements are focused and no modifiers are pressed
      if (
        event.key.toLowerCase() === 'n' && 
        !event.ctrlKey && 
        !event.metaKey && 
        !event.altKey &&
        !event.shiftKey &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.role !== 'textbox'
      ) {
        event.preventDefault();
        navigate('/submit');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  // Keyboard shortcut for toggling sort order (Tab key)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only trigger if Tab key is pressed without modifiers and no input is focused
      if (
        event.key === 'Tab' &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !event.shiftKey &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.role !== 'textbox'
      ) {
        event.preventDefault();
        setSortOrder(prev => prev === 'stars' ? 'newest' : 'stars');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Force cache clear for production issues
  const handleForceClear = () => {
    queryClient.clear();
    localStorage.removeItem('fingerprint');
    window.location.reload();
  };

  // Check if user is authenticated and is admin - optimized caching
  const { data: auth } = useQuery<{ user: { id: number; username: string; isAdmin: boolean } }>({
    queryKey: ["/api/auth/me"],
    staleTime: 1000 * 60 * 5, // 5 minutes for auth data
    gcTime: 1000 * 60 * 15, // 15 minutes cache retention
    refetchOnWindowFocus: false,
  });

  const isAdmin = auth?.user?.isAdmin;
  const isAuthenticated = !!auth?.user;

  // Memoize expensive filtering and sorting operations
  const topics = useMemo((): TopicWithCommentsAndStars[] => {
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

    // Apply submitter filter if any
    if (selectedSubmitters.length > 0) {
      filteredTopics = filteredTopics.filter(topic => 
        selectedSubmitters.includes(topic.submitter)
      );
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
  }, [week?.topics, activeTab, sortOrder, selectedSubmitters]);

  // Calculate offset for ranking board alignment
  useEffect(() => {
    const calculateOffset = () => {
      if (contentHeaderRef.current && topicListRef.current && window.innerWidth >= 1280) {
        const headerRect = contentHeaderRef.current.getBoundingClientRect();
        const topicListRect = topicListRef.current.getBoundingClientRect();
        const offset = topicListRect.top - headerRect.top;
        setRankingBoardOffset(offset);
      }
    };

    // Calculate on mount and when content changes
    calculateOffset();
    
    // Recalculate on window resize
    window.addEventListener('resize', calculateOffset);
    
    // Small delay to ensure DOM is fully rendered
    const timer = setTimeout(calculateOffset, 100);
    
    return () => {
      window.removeEventListener('resize', calculateOffset);
      clearTimeout(timer);
    };
  }, [topics.length, isLoading, activeTab, sortOrder, selectedSubmitters.length, week]);

  const handleTabChange = (tab: string) => {
    // Prevent non-authenticated users from accessing any tabs
    if (!isAuthenticated) {
      return;
    }
    // Prevent non-admin users from accessing admin-only tabs
    if (!isAdmin && tab === "performance") {
      setActiveTab("all");
      return;
    }
    setActiveTab(tab);
  };

  const handleLiveVisibilityChange = (visible: boolean) => {
    setIsLiveVisible(visible);
    localStorage.setItem('liveVisible', JSON.stringify(visible));
  };

  // Handler for when no live content is found
  const handleNoLiveContent = () => {
    setHasLiveContent(false);
    setIsLiveVisible(false);
  };

  // Wrapper for refetch function
  const refetchTopics = () => {
    return refetch();
  };

  // Handler for toggling submitter filter
  const handleSubmitterToggle = (submitter: string) => {
    setSelectedSubmitters(prev => 
      prev.includes(submitter)
        ? prev.filter(s => s !== submitter)
        : [...prev, submitter]
    );
  };

  // Handler for clearing all filters
  const handleClearFilters = () => {
    setSelectedSubmitters([]);
  };

  // Handler for adding article as topic
  const handleAddArticleAsTopic = (article: Article) => {
    // Navigate to submit page with article data
    const params = new URLSearchParams({
      title: article.title,
      url: article.url,
      description: article.description || '',
      submitter: localStorage.getItem('submitterName') || ''
    });
    navigate(`/submit?${params.toString()}`);
  };

  // Toggle sidebar visibility
  const toggleSidebar = () => {
    const newState = !isSidebarOpen;
    setIsSidebarOpen(newState);
    localStorage.setItem('trendingSidebarOpen', JSON.stringify(newState));
  };

  return (
    <div className="min-h-screen w-full flex">
      {/* Trending Sidebar */}
      {isSidebarOpen && (
        <div className="hidden lg:block">
          <TrendingSidebar 
            onAddTopic={handleAddArticleAsTopic}
            className="h-screen sticky top-0"
          />
        </div>
      )}
      
      {/* Main Content Area */}
      <div className="flex-1">
        {/* Content wrapper for centering */}
        <div className="w-full show-ranking:max-w-[1600px] mx-auto show-ranking:flex show-ranking:justify-center show-ranking:gap-8 transition-all duration-300">
          {/* Main Content */}
          <div className="w-full max-w-7xl py-6 px-4 sm:px-6 lg:px-8" ref={contentHeaderRef}>
          <WeekSelector week={week as any} isLoading={isLoading} />

          {/* YouTube Live Embed - above tabs */}
          {isLiveVisible && hasLiveContent && (
            <YouTubeLiveEmbed 
              className="mb-6" 
              onHide={() => handleLiveVisibilityChange(false)}
              onNoContent={handleNoLiveContent}
            />
          )}

          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="hidden lg:flex"
                title={isSidebarOpen ? "サイドバーを閉じる" : "サイドバーを開く"}
              >
                {isSidebarOpen ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeft className="h-4 w-4" />
                )}
              </Button>
              <TabNavigation onTabChange={handleTabChange} activeTab={activeTab} isAdmin={isAdmin} isAuthenticated={isAuthenticated} context="home" />
            </div>
            <div className="flex items-center gap-2">
              {!isLiveVisible && hasLiveContent && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleLiveVisibilityChange(true)}
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  ライブ配信を表示
                </Button>
              )}
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

          {/* Sort Controls and Total Count */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
            <div className="flex flex-wrap gap-2">
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
            <div className="flex items-center gap-2">
              {selectedSubmitters.length > 0 && (
                <div className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                  {selectedSubmitters.length}人でフィルター中
                </div>
              )}
              {week?.topics && (
                <div className="text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded-full">
                  {topics.length === week.topics.length 
                    ? `総ネタ数: ${week.topics.length}件`
                    : `表示中: ${topics.length} / ${week.topics.length}件`
                  }
                </div>
              )}
            </div>
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

          <div className="space-y-6 px-4 sm:px-0" ref={topicListRef}>
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
                  refetchTopics={refetchTopics}
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
          </div>
        </div>
        
        {/* Top 10 Board - Part of flex layout on wide screens */}
        {week?.topics && week.topics.length > 0 && (
          <div className="hidden show-ranking:block">
            {/* Dynamic spacer to align with first topic card */}
            <div 
              style={{ height: `${rankingBoardOffset}px` }} 
              aria-hidden="true"
            />
            <div className="sticky top-6">
              <TopicTop10Board
                topics={week.topics}
                selectedSubmitters={selectedSubmitters}
                onSubmitterToggle={handleSubmitterToggle}
                onClearFilters={handleClearFilters}
              />
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default Home;

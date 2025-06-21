import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Sparkles, X, Crown, Medal } from "lucide-react";
import { TopicWithCommentsAndStars } from "@shared/schema";
import { cn } from "@/lib/utils";

interface TopicTop10BoardProps {
  topics: TopicWithCommentsAndStars[];
  selectedSubmitters: string[];
  onSubmitterToggle: (submitter: string) => void;
  onClearFilters: () => void;
}

const TopicTop10Board: React.FC<TopicTop10BoardProps> = ({
  topics,
  selectedSubmitters,
  onSubmitterToggle,
  onClearFilters,
}) => {
  // Calculate submitter statistics - Top 10 only
  const submitterStats = useMemo(() => {
    const stats = new Map<string, { count: number; totalStars: number }>();
    
    topics.forEach((topic) => {
      const current = stats.get(topic.submitter) || { count: 0, totalStars: 0 };
      stats.set(topic.submitter, {
        count: current.count + 1,
        totalStars: current.totalStars + topic.starsCount,
      });
    });
    
    // Convert to array and calculate composite scores
    return Array.from(stats.entries())
      .map(([submitter, data]) => ({
        submitter,
        ...data,
        // Composite score: 30% for post count, 70% for total stars
        score: (data.count * 0.3) + (data.totalStars * 0.7)
      }))
      .sort((a, b) => {
        // Sort by composite score
        const scoreDiff = b.score - a.score;
        
        // If scores are equal (or very close due to floating point), use tiebreakers
        if (Math.abs(scoreDiff) < 0.001) {
          // First tiebreaker: total stars
          if (a.totalStars !== b.totalStars) {
            return b.totalStars - a.totalStars;
          }
          // Second tiebreaker: post count
          return b.count - a.count;
        }
        
        return scoreDiff;
      })
      .slice(0, 10);
  }, [topics]);

  // Helper function to get rank display
  const getRankDisplay = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="relative">
            <Crown className="h-8 w-8 text-yellow-500 animate-bounce" />
            <span className="absolute -top-1 -right-1 text-xs font-bold text-yellow-600">1</span>
          </div>
        );
      case 2:
        return (
          <div className="relative">
            <Medal className="h-7 w-7 text-gray-400" />
            <span className="absolute -top-1 -right-1 text-xs font-bold text-gray-600">2</span>
          </div>
        );
      case 3:
        return (
          <div className="relative">
            <Medal className="h-7 w-7 text-orange-600" />
            <span className="absolute -top-1 -right-1 text-xs font-bold text-orange-700">3</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-gray-300">
            <span className="text-sm font-bold text-gray-700">{rank}</span>
          </div>
        );
    }
  };

  // Helper function to get row styling based on rank
  const getRowStyling = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-50 via-amber-50 to-yellow-50 border-2 border-yellow-300 shadow-lg";
      case 2:
        return "bg-gradient-to-r from-gray-50 via-slate-50 to-gray-50 border-2 border-gray-300";
      case 3:
        return "bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border-2 border-orange-300";
      default:
        return "bg-white hover:bg-gray-50 border border-gray-200";
    }
  };

  const hasActiveFilters = selectedSubmitters.length > 0;

  return (
    <div className="animate-in slide-in-from-right duration-500">
      <div className="relative">
        
        {/* Main board container */}
        <div className="relative rounded-lg border bg-card shadow-sm overflow-hidden w-64 xl:w-72 2xl:w-80">
          {/* Header with animated background */}
          <div className="relative bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 p-4 text-white">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 animate-gradient-x"></div>
            <div className="relative">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Trophy className="h-6 w-6 text-yellow-300 animate-pulse" />
                <h3 className="font-black text-lg tracking-tight">
                  ネタ投稿 TOP 10
                </h3>
                <Trophy className="h-6 w-6 text-yellow-300 animate-pulse" />
              </div>
              <p className="text-xs text-center text-white/90">
                今週のMVPリスナーたち！
              </p>
            </div>
          </div>

          {/* Clear filters button if active */}
          {hasActiveFilters && (
            <div className="px-4 pt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="w-full h-8 text-xs border border-dashed border-gray-300 hover:border-gray-400"
              >
                <X className="h-3 w-3 mr-1" />
                フィルターをクリア ({selectedSubmitters.length}人選択中)
              </Button>
            </div>
          )}

          {/* Ranking list */}
          <div className="max-h-[calc(80vh-200px)] overflow-y-auto p-4">
            <div className="space-y-2">
              {submitterStats.map(({ submitter, count, totalStars }, index) => {
                const isSelected = selectedSubmitters.includes(submitter);
                const rank = index + 1;
                
                return (
                  <button
                    key={submitter}
                    onClick={() => onSubmitterToggle(submitter)}
                    className={cn(
                      "w-full p-3 rounded-lg transition-all duration-300 transform",
                      getRowStyling(rank),
                      isSelected && "ring-2 ring-primary ring-offset-2",
                      "hover:shadow-md active:scale-[0.98]"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {/* Rank display */}
                      {getRankDisplay(rank)}
                      
                      {/* User info */}
                      <div className="flex-1 text-left">
                        <p className={cn(
                          "font-semibold truncate",
                          rank === 1 ? "text-lg" : "text-base",
                          isSelected && "text-primary"
                        )}>
                          {submitter}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-600">
                            {count}ネタ
                          </span>
                          {totalStars > 0 && (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-orange-500 fill-current" />
                              <span className="text-xs font-semibold text-orange-600">
                                {totalStars}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Special badges for top 3 */}
                      {rank <= 3 && (
                        <div className="flex items-center">
                          <Sparkles className={cn(
                            "h-5 w-5 animate-pulse",
                            rank === 1 ? "text-yellow-500" :
                            rank === 2 ? "text-gray-500" :
                            "text-orange-600"
                          )} />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer message */}
          <div className="border-t bg-gradient-to-r from-purple-50 to-pink-50 p-3">
            <p className="text-xs text-center text-gray-700 font-medium">
              <span className="inline-block animate-bounce">🎉</span>
              {" "}クリックで投稿者のネタを見る{" "}
              <span className="inline-block animate-bounce delay-100">🎉</span>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TopicTop10Board;
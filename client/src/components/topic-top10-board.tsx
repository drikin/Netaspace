import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Sparkles, X, Crown, Medal, Info } from "lucide-react";
import { TopicWithCommentsAndStars } from "@shared/schema";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
    const stats = new Map<string, { 
      count: number; 
      totalStars: number;
      totalShares: number;
      adoptedCount: number;
    }>();
    
    topics.forEach((topic) => {
      const current = stats.get(topic.submitter) || { 
        count: 0, 
        totalStars: 0,
        totalShares: 0,
        adoptedCount: 0,
      };
      stats.set(topic.submitter, {
        count: current.count + 1,
        totalStars: current.totalStars + topic.starsCount,
        totalShares: current.totalShares + (topic.sharesCount || 0),
        adoptedCount: current.adoptedCount + (topic.status === "featured" ? 1 : 0),
      });
    });
    
    // Convert to array and calculate total scores (point addition system)
    return Array.from(stats.entries())
      .map(([submitter, data]) => ({
        submitter,
        ...data,
        // Simple point addition system:
        // Posts: 1 point each
        // Stars: 2 points each  
        // Shares: 3 points each
        // Adopted topics: 10 points each
        score: (data.count * 1) + (data.totalStars * 2) + (data.totalShares * 3) + (data.adoptedCount * 10)
      }))
      .sort((a, b) => {
        // Sort by total score
        const scoreDiff = b.score - a.score;
        
        // If scores are equal, use tiebreakers
        if (scoreDiff === 0) {
          // First tiebreaker: adopted count
          if (a.adoptedCount !== b.adoptedCount) {
            return b.adoptedCount - a.adoptedCount;
          }
          // Second tiebreaker: total stars
          if (a.totalStars !== b.totalStars) {
            return b.totalStars - a.totalStars;
          }
          // Third tiebreaker: post count
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
              {submitterStats.map(({ submitter, count, totalStars, totalShares, adoptedCount }, index) => {
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
                        <div className="flex items-center gap-2 mt-1">
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
                          {totalShares > 0 && (
                            <div className="flex items-center gap-1">
                              <svg className="h-3 w-3 text-blue-500 fill-current" viewBox="0 0 24 24">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                              </svg>
                              <span className="text-xs font-semibold text-blue-600">
                                {totalShares}
                              </span>
                            </div>
                          )}
                          {adoptedCount > 0 && (
                            <div className="flex items-center gap-1">
                              <Trophy className="h-3 w-3 text-green-600 fill-current" />
                              <span className="text-xs font-semibold text-green-700">
                                {adoptedCount}
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

          {/* Footer with scoring rules popover */}
          <div className="border-t bg-gradient-to-r from-purple-50 to-pink-50 p-3">
            <div className="flex items-center justify-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs font-medium text-gray-700 hover:text-gray-900 hover:bg-transparent p-1"
                  >
                    <Info className="h-3 w-3 mr-1" />
                    採点ルールについて
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="center">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">TOP10 採点ルール</h4>
                    <div className="space-y-2 text-xs">
                      <div className="p-2 bg-blue-50 rounded">
                        <p className="font-semibold text-blue-900 mb-1">加点ルール</p>
                        <div className="space-y-1 text-blue-800">
                          <p>📝 ネタ投稿: 1点/件</p>
                          <p>⭐ 獲得スター: 2点/個</p>
                          <p>🐦 X共有: 3点/件</p>
                          <p>🏆 ネタ採用: 10点/件</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-orange-500 font-bold">1.</span>
                        <div>
                          <p className="font-medium">加点方式</p>
                          <p className="text-gray-600">各要素のポイントを単純に合計</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-orange-500 font-bold">2.</span>
                        <div>
                          <p className="font-medium">X共有ボーナス</p>
                          <p className="text-gray-600">「聞きたい」後に「Xで共有」ボタンを押すと加点(3点)</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-orange-500 font-bold">3.</span>
                        <div>
                          <p className="font-medium">ネタ採用ボーナス</p>
                          <p className="text-gray-600">番組で実際に採用されたネタには大幅加点(10点)</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-orange-500 font-bold">4.</span>
                        <div>
                          <p className="font-medium">同点の場合</p>
                          <p className="text-gray-600">①採用数 ②スター数 ③投稿数の順で順位決定</p>
                        </div>
                      </div>
                    </div>
                    <div className="pt-2 border-t text-xs text-gray-500">
                      <p>毎週月曜日リセット。みんなで盛り上げよう！</p>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
    </div>
  );
};

export default TopicTop10Board;
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  SidebarProvider,
  Sidebar, 
  SidebarContent, 
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, TrendingUp, Sparkles, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Article, ArticleCategory } from '@shared/types/article-source';
import ArticleCard from './ArticleCard';
import SourceTabs from './SourceTabs';
import CategoryFilter from './CategoryFilter';

interface TrendingSidebarProps {
  className?: string;
  onAddTopic?: (article: Article) => void;
}

const TrendingSidebar: React.FC<TrendingSidebarProps> = ({ className, onAddTopic }) => {
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedCategories, setSelectedCategories] = useState<ArticleCategory[]>([]);
  const queryClient = useQueryClient();

  // Fetch trending articles
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/trending-articles', selectedSource],
    queryFn: async () => {
      const response = await fetch(`/api/trending-articles?source=${selectedSource}`);
      if (!response.ok) throw new Error('Failed to fetch articles');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 15 * 60 * 1000, // 15 minutes
  });

  // Manual refresh mutation
  const refreshMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/trending-articles/refresh', {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to refresh');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trending-articles'] });
    },
  });

  const handleRefresh = () => {
    refreshMutation.mutate();
  };

  const filteredArticles = data?.articles?.filter((article: Article) => {
    if (selectedCategories.length === 0) return true;
    return selectedCategories.includes(article.category);
  }) || [];

  const getCategoryColor = (category: ArticleCategory): string => {
    const colors = {
      [ArticleCategory.TECH]: 'text-blue-600',
      [ArticleCategory.AI]: 'text-purple-600',
      [ArticleCategory.PROGRAMMING]: 'text-green-600',
      [ArticleCategory.GADGET]: 'text-orange-600',
      [ArticleCategory.ENTERTAINMENT]: 'text-pink-600',
      [ArticleCategory.SPORTS]: 'text-red-600',
      [ArticleCategory.BUSINESS]: 'text-gray-600',
      [ArticleCategory.SCIENCE]: 'text-cyan-600',
      [ArticleCategory.GAMING]: 'text-yellow-600',
      [ArticleCategory.OTHER]: 'text-gray-500',
    };
    return colors[category] || 'text-gray-500';
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar className={cn('w-80 border-r', className)}>
        <SidebarHeader className="border-b p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-base">気になる記事</h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshMutation.isPending}
            className="h-8 w-8"
          >
            <RefreshCw className={cn('h-4 w-4', refreshMutation.isPending && 'animate-spin')} />
          </Button>
        </div>
        
        {data?.sources && data.sources.length > 0 && (
          <SourceTabs
            sources={data.sources}
            selectedSource={selectedSource}
            onSourceChange={setSelectedSource}
          />
        )}
      </SidebarHeader>

      <SidebarContent>
        {data?.stats && (
          <CategoryFilter
            stats={data.stats}
            selectedCategories={selectedCategories}
            onCategoryToggle={(category) => {
              setSelectedCategories(prev =>
                prev.includes(category)
                  ? prev.filter(c => c !== category)
                  : [...prev, category]
              );
            }}
            getCategoryColor={getCategoryColor}
          />
        )}

        <ScrollArea className="flex-1 px-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">記事を取得中...</p>
              </div>
            </div>
          ) : error ? (
            <div className="py-8 px-4">
              <div className="flex flex-col items-center text-center">
                <AlertCircle className="h-8 w-8 text-destructive mb-2" />
                <p className="text-sm text-destructive font-medium">記事の取得に失敗しました</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {error instanceof Error ? error.message : '不明なエラー'}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  className="mt-3"
                >
                  再試行
                </Button>
              </div>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="py-8 px-4">
              <div className="flex flex-col items-center text-center">
                <Sparkles className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {selectedCategories.length > 0 
                    ? '選択したカテゴリーの記事がありません'
                    : '現在表示できる記事がありません'
                  }
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 py-3">
              {filteredArticles.map((article: Article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  onAddTopic={onAddTopic}
                  getCategoryColor={getCategoryColor}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {data?.timestamp && (
          <div className="border-t px-4 py-2">
            <p className="text-xs text-muted-foreground text-center">
              最終更新: {new Date(data.timestamp).toLocaleTimeString('ja-JP')}
            </p>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
    </SidebarProvider>
  );
};

export default TrendingSidebar;
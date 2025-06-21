import React from 'react';
import { ArticleCategory, CategoryDistribution } from '@shared/types/article-source';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface CategoryFilterProps {
  stats: CategoryDistribution;
  selectedCategories: ArticleCategory[];
  onCategoryToggle: (category: ArticleCategory) => void;
  getCategoryColor: (category: ArticleCategory) => string;
}

const categoryLabels: Record<ArticleCategory, string> = {
  [ArticleCategory.TECH]: 'テック',
  [ArticleCategory.AI]: 'AI',
  [ArticleCategory.PROGRAMMING]: 'プログラミング',
  [ArticleCategory.GADGET]: 'ガジェット',
  [ArticleCategory.ENTERTAINMENT]: 'エンタメ',
  [ArticleCategory.SPORTS]: 'スポーツ',
  [ArticleCategory.BUSINESS]: 'ビジネス',
  [ArticleCategory.SCIENCE]: 'サイエンス',
  [ArticleCategory.GAMING]: 'ゲーム',
  [ArticleCategory.OTHER]: 'その他',
};

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  stats,
  selectedCategories,
  onCategoryToggle,
  getCategoryColor,
}) => {
  const hasSelection = selectedCategories.length > 0;

  return (
    <div className="px-4 py-3 border-b">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">カテゴリー</span>
        {hasSelection && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => selectedCategories.forEach(onCategoryToggle)}
            className="h-6 px-2 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            クリア
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {Object.entries(stats).map(([category, count]) => {
          if (count === 0) return null;
          const cat = category as ArticleCategory;
          const isSelected = selectedCategories.includes(cat);
          
          return (
            <Badge
              key={cat}
              variant={isSelected ? 'default' : 'secondary'}
              className={cn(
                'cursor-pointer transition-colors text-xs px-2 py-0.5',
                !isSelected && getCategoryColor(cat),
                isSelected && 'bg-primary'
              )}
              onClick={() => onCategoryToggle(cat)}
            >
              {categoryLabels[cat]} ({count})
            </Badge>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryFilter;
import React, { useState } from 'react';
import { Article, ArticleCategory } from '@shared/types/article-source';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ExternalLink, 
  Plus, 
  Check,
  TrendingUp,
  Star,
  Zap,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ArticleCardProps {
  article: Article;
  onAddTopic?: (article: Article) => void;
  getCategoryColor: (category: ArticleCategory) => string;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ article, onAddTopic, getCategoryColor }) => {
  const [isAdded, setIsAdded] = useState(false);
  const { toast } = useToast();

  const handleAddTopic = () => {
    if (onAddTopic) {
      onAddTopic(article);
      setIsAdded(true);
      toast({
        title: "ネタを追加しました",
        description: article.title,
        duration: 3000,
      });
      
      // Reset after 3 seconds
      setTimeout(() => setIsAdded(false), 3000);
    }
  };

  const getRecommendationReason = () => {
    const reasons = [];
    
    if (article.trendingScore > 80) {
      reasons.push({ icon: TrendingUp, text: '現在トレンド' });
    }
    if (article.techScore > 70) {
      reasons.push({ icon: Zap, text: '技術的に興味深い' });
    }
    if (article.entertainmentValue > 70) {
      reasons.push({ icon: MessageSquare, text: '議論を呼びそう' });
    }
    if (article.relevanceScore > 85) {
      reasons.push({ icon: Star, text: '高関連性' });
    }
    
    return reasons[0]; // Return the most relevant reason
  };

  const recommendationReason = getRecommendationReason();

  return (
    <Card className="p-3 hover:shadow-md transition-shadow duration-200">
      <div className="space-y-2">
        {/* Header with category and source */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Badge variant="secondary" className={cn('text-xs px-1.5 py-0', getCategoryColor(article.category))}>
              {article.category}
            </Badge>
            <span className="text-xs text-muted-foreground truncate">
              {article.sourceName}
            </span>
          </div>
          <time className="text-xs text-muted-foreground whitespace-nowrap">
            {new Date(article.publishedAt).toLocaleTimeString('ja-JP', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </time>
        </div>

        {/* Title */}
        <h4 className="font-medium text-sm line-clamp-2 leading-tight">
          {article.title}
        </h4>

        {/* Description if available */}
        {article.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {article.description}
          </p>
        )}

        {/* Recommendation reason */}
        {recommendationReason && (
          <div className="flex items-center gap-1 text-xs text-primary">
            <recommendationReason.icon className="h-3 w-3" />
            <span>{recommendationReason.text}</span>
          </div>
        )}

        {/* Scores */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span title="話題性">🔥 {Math.round(article.trendingScore)}</span>
          <span title="技術度">💻 {Math.round(article.techScore)}</span>
          <span title="関連度">🎯 {Math.round(article.relevanceScore)}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            variant={isAdded ? "default" : "outline"}
            size="sm"
            onClick={handleAddTopic}
            disabled={isAdded}
            className="flex-1 h-7 text-xs"
          >
            {isAdded ? (
              <>
                <Check className="h-3 w-3 mr-1" />
                追加済み
              </>
            ) : (
              <>
                <Plus className="h-3 w-3 mr-1" />
                ネタに追加
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="h-7 w-7 p-0"
          >
            <a 
              href={article.url} 
              target="_blank" 
              rel="noopener noreferrer"
              title="元記事を開く"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ArticleCard;
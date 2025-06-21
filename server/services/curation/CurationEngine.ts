import { 
  Article, 
  ArticleCategory, 
  CurationSettings, 
  CategoryDistribution 
} from '@shared/types/article-source';

export class CurationEngine {
  // Default ideal distribution for a tech podcast
  private readonly DEFAULT_DISTRIBUTION: CategoryDistribution = {
    [ArticleCategory.TECH]: 25,
    [ArticleCategory.AI]: 15,
    [ArticleCategory.PROGRAMMING]: 10,
    [ArticleCategory.GADGET]: 10,
    [ArticleCategory.ENTERTAINMENT]: 10,
    [ArticleCategory.SPORTS]: 8,
    [ArticleCategory.BUSINESS]: 8,
    [ArticleCategory.SCIENCE]: 7,
    [ArticleCategory.GAMING]: 5,
    [ArticleCategory.OTHER]: 2
  };
  
  private settings: CurationSettings = {
    techBias: 60,
    diversityLevel: 70,
    trendingWeight: 50,
    includeNiche: true,
    maxArticles: 20
  };
  
  constructor(settings?: Partial<CurationSettings>) {
    if (settings) {
      this.settings = { ...this.settings, ...settings };
    }
  }
  
  /**
   * Curate articles based on settings and ideal distribution
   */
  curateArticles(articles: Article[]): Article[] {
    if (articles.length === 0) return [];
    
    // Step 1: Enhance articles with additional scoring
    const enhancedArticles = articles.map(article => this.enhanceArticleScoring(article));
    
    // Step 2: Apply tech bias adjustment
    const biasAdjusted = this.applyTechBias(enhancedArticles);
    
    // Step 3: Group by category
    const categorized = this.groupByCategory(biasAdjusted);
    
    // Step 4: Select articles based on distribution
    const selected = this.selectByDistribution(categorized);
    
    // Step 5: Final ranking and limit
    const finalList = this.finalRanking(selected);
    
    return finalList.slice(0, this.settings.maxArticles);
  }
  
  private enhanceArticleScoring(article: Article): Article {
    // Calculate composite score based on various factors
    const trendingFactor = (article.trendingScore / 100) * (this.settings.trendingWeight / 100);
    const techFactor = (article.techScore / 100) * (this.settings.techBias / 100);
    const entertainmentFactor = (article.entertainmentValue / 100) * ((100 - this.settings.techBias) / 100);
    
    // Time decay factor (newer articles get higher scores)
    const ageInHours = (Date.now() - new Date(article.publishedAt).getTime()) / (1000 * 60 * 60);
    const timeFactor = Math.max(0, 1 - (ageInHours / 168)); // Decay over a week
    
    // Calculate final relevance score
    const relevanceScore = Math.min(100, 
      (trendingFactor * 30) + 
      (techFactor * 40) + 
      (entertainmentFactor * 20) + 
      (timeFactor * 10) * 100
    );
    
    return {
      ...article,
      relevanceScore
    };
  }
  
  private applyTechBias(articles: Article[]): Article[] {
    // Adjust scores based on tech bias setting
    return articles.map(article => {
      const isTechRelated = [
        ArticleCategory.TECH,
        ArticleCategory.AI,
        ArticleCategory.PROGRAMMING,
        ArticleCategory.GADGET
      ].includes(article.category);
      
      if (isTechRelated) {
        // Boost tech articles based on bias
        const boost = (this.settings.techBias / 100) * 20;
        article.relevanceScore = Math.min(100, article.relevanceScore + boost);
      } else if (this.settings.diversityLevel > 50) {
        // If high diversity is desired, don't penalize non-tech too much
        const penalty = ((100 - this.settings.diversityLevel) / 100) * 10;
        article.relevanceScore = Math.max(0, article.relevanceScore - penalty);
      }
      
      return article;
    });
  }
  
  private groupByCategory(articles: Article[]): Map<ArticleCategory, Article[]> {
    const groups = new Map<ArticleCategory, Article[]>();
    
    for (const article of articles) {
      const category = article.category;
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(article);
    }
    
    // Sort each category by relevance score
    groups.forEach((categoryArticles, category) => {
      categoryArticles.sort((a, b) => b.relevanceScore - a.relevanceScore);
    });
    
    return groups;
  }
  
  private selectByDistribution(categorized: Map<ArticleCategory, Article[]>): Article[] {
    const selected: Article[] = [];
    const targetCount = this.settings.maxArticles;
    
    // Calculate actual counts based on distribution percentages
    const categoryCounts = new Map<ArticleCategory, number>();
    let totalPercentage = 0;
    
    Object.entries(this.DEFAULT_DISTRIBUTION).forEach(([category, percentage]) => {
      totalPercentage += percentage;
    });
    
    Object.entries(this.DEFAULT_DISTRIBUTION).forEach(([category, percentage]) => {
      const count = Math.round((percentage / totalPercentage) * targetCount);
      categoryCounts.set(category as ArticleCategory, count);
    });
    
    // Select articles from each category
    categoryCounts.forEach((targetCount, category) => {
      const categoryArticles = categorized.get(category) || [];
      const articlesToTake = Math.min(targetCount, categoryArticles.length);
      
      if (articlesToTake > 0) {
        selected.push(...categoryArticles.slice(0, articlesToTake));
      }
    });
    
    // If we have fewer articles than target, fill with highest scoring remaining articles
    if (selected.length < targetCount) {
      const remaining: Article[] = [];
      
      categorized.forEach((articles, category) => {
        const alreadySelected = selected.filter(a => a.category === category).length;
        const availableFromCategory = articles.slice(alreadySelected);
        remaining.push(...availableFromCategory);
      });
      
      remaining.sort((a, b) => b.relevanceScore - a.relevanceScore);
      const additionalNeeded = targetCount - selected.length;
      selected.push(...remaining.slice(0, additionalNeeded));
    }
    
    return selected;
  }
  
  private finalRanking(articles: Article[]): Article[] {
    // Apply final ranking considering multiple factors
    return articles.sort((a, b) => {
      // Primary sort by relevance score
      const scoreDiff = b.relevanceScore - a.relevanceScore;
      if (Math.abs(scoreDiff) > 10) return scoreDiff;
      
      // Secondary sort by trending score
      const trendingDiff = b.trendingScore - a.trendingScore;
      if (Math.abs(trendingDiff) > 5) return trendingDiff;
      
      // Tertiary sort by publish date (newer first)
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
  }
  
  /**
   * Get distribution statistics for a set of articles
   */
  getDistributionStats(articles: Article[]): CategoryDistribution {
    const stats: CategoryDistribution = {
      [ArticleCategory.TECH]: 0,
      [ArticleCategory.AI]: 0,
      [ArticleCategory.PROGRAMMING]: 0,
      [ArticleCategory.GADGET]: 0,
      [ArticleCategory.ENTERTAINMENT]: 0,
      [ArticleCategory.SPORTS]: 0,
      [ArticleCategory.BUSINESS]: 0,
      [ArticleCategory.SCIENCE]: 0,
      [ArticleCategory.GAMING]: 0,
      [ArticleCategory.OTHER]: 0
    };
    
    for (const article of articles) {
      stats[article.category]++;
    }
    
    return stats;
  }
  
  /**
   * Update curation settings
   */
  updateSettings(settings: Partial<CurationSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }
  
  /**
   * Get current settings
   */
  getSettings(): CurationSettings {
    return { ...this.settings };
  }
}
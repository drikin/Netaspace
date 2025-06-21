// Article source interfaces for the curation system

export interface Article {
  id: string;
  title: string;
  url: string;
  description?: string;
  source: string;
  sourceName: string;
  publishedAt: Date;
  author?: string;
  imageUrl?: string;
  tags?: string[];
  
  // Curation fields
  category: ArticleCategory;
  relevanceScore: number;      // Podcast relevance (0-100)
  trendingScore: number;       // Trending score (0-100)
  techScore: number;           // Tech relevance (0-100)
  entertainmentValue: number;  // Entertainment value (0-100)
}

export enum ArticleCategory {
  TECH = 'tech',
  AI = 'ai',
  PROGRAMMING = 'programming',
  GADGET = 'gadget',
  ENTERTAINMENT = 'entertainment',
  SPORTS = 'sports',
  BUSINESS = 'business',
  SCIENCE = 'science',
  GAMING = 'gaming',
  OTHER = 'other'
}

export interface ArticleSource {
  id: string;
  name: string;
  icon?: string;
  isEnabled: boolean;
  
  // Fetch articles from the source
  fetchArticles(): Promise<Article[]>;
  
  // Check if the source is available
  isAvailable(): Promise<boolean>;
  
  // Get rate limit info if applicable
  getRateLimitInfo?(): Promise<RateLimitInfo | null>;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
}

export interface CurationSettings {
  techBias: number;        // Tech bias level (0-100)
  diversityLevel: number;  // Diversity level (0-100)
  trendingWeight: number;  // Trending weight (0-100)
  includeNiche: boolean;   // Include niche topics
  maxArticles: number;     // Maximum articles to return
}

export interface CategoryDistribution {
  [ArticleCategory.TECH]: number;
  [ArticleCategory.ENTERTAINMENT]: number;
  [ArticleCategory.SPORTS]: number;
  [ArticleCategory.BUSINESS]: number;
  [ArticleCategory.SCIENCE]: number;
  [ArticleCategory.GAMING]: number;
  [ArticleCategory.AI]: number;
  [ArticleCategory.PROGRAMMING]: number;
  [ArticleCategory.GADGET]: number;
  [ArticleCategory.OTHER]: number;
}
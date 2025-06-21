import { Article, ArticleCategory, RateLimitInfo } from '@shared/types/article-source';
import { ArticleSourceBase } from '../base/ArticleSourceBase';

interface TwitterV2Response {
  data?: Tweet[];
  meta?: {
    result_count: number;
    next_token?: string;
  };
  includes?: {
    users?: TwitterUser[];
  };
}

interface Tweet {
  id: string;
  text: string;
  created_at: string;
  author_id?: string;
  entities?: {
    urls?: Array<{
      expanded_url: string;
      display_url: string;
      title?: string;
      description?: string;
    }>;
  };
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
  };
}

interface TwitterUser {
  id: string;
  name: string;
  username: string;
}

export class XApiSource extends ArticleSourceBase {
  id = 'x-api';
  name = 'X (Twitter)';
  icon = '𝕏';
  
  private bearerToken: string;
  private searchQueries: string[] = [
    '(テクノロジー OR AI OR プログラミング) lang:ja -is:retweet',
    '(Apple OR ゲーム OR エンタメ) lang:ja -is:retweet'
  ];
  
  constructor() {
    super();
    this.bearerToken = process.env.TWITTER_BEARER_TOKEN || '';
    if (!this.bearerToken) {
      console.warn('X API Bearer token not configured');
      this._isEnabled = false;
    }
  }
  
  async fetchArticles(): Promise<Article[]> {
    if (!this.bearerToken) {
      throw new Error('X API Bearer token not configured');
    }
    
    // Check cache first
    const cached = this.getCachedArticles();
    if (cached) {
      return cached;
    }
    
    const allArticles: Article[] = [];
    
    // Fetch tweets for each search query with delay between requests
    let successfulQueries = 0;
    for (let i = 0; i < this.searchQueries.length; i++) {
      const query = this.searchQueries[i];
      
      // Add delay between requests to avoid rate limiting (except for first request)
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
      
      try {
        console.log(`Searching X API with query: ${query}`);
        const tweets = await this.searchTweets(query);
        console.log(`Found ${tweets.length} tweets for query: ${query}`);
        const articles = this.tweetsToArticles(tweets);
        allArticles.push(...articles);
        successfulQueries++;
      } catch (error) {
        console.error(`Error fetching tweets for query "${query}":`, error);
      }
    }
    
    // If all queries failed, throw error
    if (successfulQueries === 0 && allArticles.length === 0) {
      throw new Error('Failed to fetch any articles from X API');
    }
    
    // Remove duplicates and sort by trending score
    const uniqueArticles = this.deduplicateArticles(allArticles);
    const sortedArticles = uniqueArticles.sort((a, b) => b.trendingScore - a.trendingScore);
    
    // Cache the results
    this.setCachedArticles(sortedArticles);
    
    return sortedArticles;
  }
  
  private async searchTweets(query: string): Promise<Tweet[]> {
    const endpoint = 'https://api.twitter.com/2/tweets/search/recent';
    const params = new URLSearchParams({
      query,
      max_results: '10',
      'tweet.fields': 'created_at,author_id,entities,public_metrics'
    });
    
    try {
      const response = await fetch(`${endpoint}?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`X API error response: ${errorText}`);
        throw new Error(`X API error: ${response.status} ${response.statusText}`);
      }
      
      const data: TwitterV2Response = await response.json();
      return data.data || [];
    } catch (error) {
      console.error(`Error searching tweets with query "${query}":`, error);
      throw error;
    }
  }
  
  private tweetsToArticles(tweets: Tweet[]): Article[] {
    return tweets
      .filter(tweet => tweet.text && tweet.text.trim().length > 0)
      .map(tweet => this.tweetToArticle(tweet));
  }
  
  private hasValidUrl(tweet: Tweet): boolean {
    return !!(tweet.entities?.urls && tweet.entities.urls.length > 0);
  }
  
  private tweetToArticle(tweet: Tweet): Article {
    const url = tweet.entities?.urls?.[0];
    const metrics = tweet.public_metrics;
    
    // Use tweet URL if no link is embedded
    const articleUrl = url?.expanded_url || `https://twitter.com/i/web/status/${tweet.id}`;
    
    // Extract article info from tweet
    const title = url?.title || this.extractTitle(tweet.text);
    const description = url?.description || tweet.text;
    
    // Calculate scores
    const engagementScore = this.calculateEngagementScore(metrics);
    const category = this.categorizeContent(tweet.text);
    const techScore = this.calculateTechScore(tweet.text, category);
    
    return {
      id: this.generateArticleId({ url: articleUrl, publishedAt: new Date(tweet.created_at || new Date()) }),
      title,
      url: articleUrl,
      description,
      source: this.id,
      sourceName: this.name,
      publishedAt: new Date(tweet.created_at || new Date()),
      author: `@${tweet.author_id}`, // Will be replaced with actual username if expansion works
      tags: this.extractHashtags(tweet.text),
      category,
      relevanceScore: Math.min(100, engagementScore * 0.8 + techScore * 0.2),
      trendingScore: engagementScore,
      techScore,
      entertainmentValue: category === ArticleCategory.ENTERTAINMENT ? 80 : 
                         category === ArticleCategory.SPORTS ? 70 : 
                         category === ArticleCategory.GAMING ? 60 : 40
    };
  }
  
  private extractTitle(text: string): string {
    // Remove URLs and clean up text
    const cleanText = text.replace(/https?:\/\/\S+/g, '').trim();
    
    // Take first 100 characters or until first line break
    const firstLine = cleanText.split('\n')[0];
    return firstLine.length > 100 ? firstLine.substring(0, 97) + '...' : firstLine;
  }
  
  private calculateEngagementScore(metrics?: Tweet['public_metrics']): number {
    if (!metrics) return 0;
    
    const { retweet_count = 0, reply_count = 0, like_count = 0, quote_count = 0 } = metrics;
    
    // Weighted engagement score
    const score = (like_count * 1) + 
                 (retweet_count * 2) + 
                 (quote_count * 3) + 
                 (reply_count * 0.5);
    
    // Normalize to 0-100 scale (assuming 1000+ engagement is max)
    return Math.min(100, (score / 1000) * 100);
  }
  
  private categorizeContent(text: string): ArticleCategory {
    const lowerText = text.toLowerCase();
    
    // Check for category keywords
    if (/(?:ai|人工知能|機械学習|deep learning|chatgpt|llm)/i.test(text)) return ArticleCategory.AI;
    if (/(?:プログラミング|コード|開発|エンジニア|javascript|python|react)/i.test(text)) return ArticleCategory.PROGRAMMING;
    if (/(?:iphone|android|スマホ|ガジェット|apple watch|airpods)/i.test(text)) return ArticleCategory.GADGET;
    if (/(?:ゲーム|nintendo|playstation|xbox|steam|任天堂)/i.test(text)) return ArticleCategory.GAMING;
    if (/(?:芸能|エンタメ|映画|ドラマ|アニメ|音楽|アイドル)/i.test(text)) return ArticleCategory.ENTERTAINMENT;
    if (/(?:スポーツ|野球|サッカー|オリンピック|ワールドカップ)/i.test(text)) return ArticleCategory.SPORTS;
    if (/(?:ビジネス|経済|株|投資|企業|スタートアップ)/i.test(text)) return ArticleCategory.BUSINESS;
    if (/(?:科学|研究|宇宙|医療|発見|ノーベル)/i.test(text)) return ArticleCategory.SCIENCE;
    if (/(?:技術|テクノロジー|イノベーション|デジタル)/i.test(text)) return ArticleCategory.TECH;
    
    return ArticleCategory.OTHER;
  }
  
  private calculateTechScore(text: string, category: ArticleCategory): number {
    // Tech-related categories get base score
    const techCategories = [ArticleCategory.TECH, ArticleCategory.AI, ArticleCategory.PROGRAMMING, ArticleCategory.GADGET];
    let score = techCategories.includes(category) ? 60 : 20;
    
    // Additional points for tech keywords
    const techKeywords = /(?:api|sdk|framework|アルゴリズム|データベース|セキュリティ|クラウド|aws|azure|gcp)/i;
    if (techKeywords.test(text)) score += 20;
    
    // Bonus for specific tech companies
    const techCompanies = /(?:google|apple|microsoft|meta|amazon|openai|nvidia)/i;
    if (techCompanies.test(text)) score += 10;
    
    return Math.min(100, score);
  }
  
  private extractHashtags(text: string): string[] {
    const hashtags = text.match(/#[^\s#]+/g) || [];
    return hashtags.map(tag => tag.substring(1)); // Remove # symbol
  }
  
  private deduplicateArticles(articles: Article[]): Article[] {
    const seen = new Set<string>();
    return articles.filter(article => {
      const key = article.url;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  
  async getRateLimitInfo(): Promise<RateLimitInfo | null> {
    // X API v2 rate limits are returned in headers
    // For search endpoint: 450 requests per 15-minute window
    // This would need to be tracked from actual API responses
    return {
      limit: 450,
      remaining: 450, // Would need to track this
      reset: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes from now
    };
  }
}
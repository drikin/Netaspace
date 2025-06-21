import { Article, ArticleSource, RateLimitInfo } from '@shared/types/article-source';

export abstract class ArticleSourceBase implements ArticleSource {
  abstract id: string;
  abstract name: string;
  abstract icon?: string;
  
  protected _isEnabled: boolean = true;
  protected cache: Map<string, { articles: Article[], timestamp: number }> = new Map();
  protected cacheTimeout: number = 15 * 60 * 1000; // 15 minutes default
  
  get isEnabled(): boolean {
    return this._isEnabled;
  }
  
  set isEnabled(value: boolean) {
    this._isEnabled = value;
  }
  
  abstract fetchArticles(): Promise<Article[]>;
  
  async isAvailable(): Promise<boolean> {
    try {
      // Try to fetch a small number of articles to check availability
      await this.fetchArticles();
      return true;
    } catch (error) {
      console.error(`Source ${this.name} is not available:`, error);
      return false;
    }
  }
  
  async getRateLimitInfo(): Promise<RateLimitInfo | null> {
    // Default implementation returns null (no rate limit info)
    return null;
  }
  
  /**
   * Get cached articles if available and not expired
   */
  protected getCachedArticles(key: string = 'default'): Article[] | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const isExpired = Date.now() - cached.timestamp > this.cacheTimeout;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.articles;
  }
  
  /**
   * Cache articles with timestamp
   */
  protected setCachedArticles(articles: Article[], key: string = 'default'): void {
    this.cache.set(key, {
      articles,
      timestamp: Date.now()
    });
  }
  
  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
  }
  
  /**
   * Generate unique article ID
   */
  protected generateArticleId(article: Partial<Article>): string {
    // Create a unique ID based on source and URL
    const hash = Buffer.from(`${this.id}-${article.url}-${article.publishedAt}`).toString('base64');
    return hash.replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  }
}
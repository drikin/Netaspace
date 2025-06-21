import { Article, ArticleSource } from '@shared/types/article-source';
import { XApiSource } from './implementations/XApiSource';
import { MockSource } from './implementations/MockSource';

export class SourceManager {
  private sources: Map<string, ArticleSource> = new Map();
  private static instance: SourceManager;
  
  private constructor() {
    // Initialize sources
    const xApiSource = new XApiSource();
    
    // Only register X API source if token is available
    if (process.env.TWITTER_BEARER_TOKEN && process.env.USE_MOCK_DATA !== 'true') {
      this.registerSource(xApiSource);
    } else {
      console.log('Using mock data source (X API may be rate limited or disabled)');
      this.registerSource(new MockSource());
    }
    
    // Future sources can be added here:
    // this.registerSource(new GoogleNewsSource());
    // this.registerSource(new TechCrunchSource());
  }
  
  static getInstance(): SourceManager {
    if (!SourceManager.instance) {
      SourceManager.instance = new SourceManager();
    }
    return SourceManager.instance;
  }
  
  registerSource(source: ArticleSource): void {
    this.sources.set(source.id, source);
    console.log(`Registered article source: ${source.name} (${source.id})`);
  }
  
  getSource(id: string): ArticleSource | undefined {
    return this.sources.get(id);
  }
  
  getAllSources(): ArticleSource[] {
    return Array.from(this.sources.values());
  }
  
  getEnabledSources(): ArticleSource[] {
    return this.getAllSources().filter(source => source.isEnabled);
  }
  
  async fetchAllArticles(): Promise<Article[]> {
    const enabledSources = this.getEnabledSources();
    const allArticles: Article[] = [];
    
    // Fetch articles from all enabled sources in parallel
    const promises = enabledSources.map(async source => {
      try {
        console.log(`Fetching articles from ${source.name}...`);
        const articles = await source.fetchArticles();
        console.log(`Fetched ${articles.length} articles from ${source.name}`);
        return articles;
      } catch (error) {
        console.error(`Error fetching from ${source.name}:`, error);
        return [];
      }
    });
    
    const results = await Promise.all(promises);
    
    // Flatten results
    for (const articles of results) {
      allArticles.push(...articles);
    }
    
    return allArticles;
  }
  
  async fetchArticlesFromSource(sourceId: string): Promise<Article[]> {
    const source = this.getSource(sourceId);
    if (!source) {
      throw new Error(`Source ${sourceId} not found`);
    }
    
    if (!source.isEnabled) {
      throw new Error(`Source ${sourceId} is disabled`);
    }
    
    return source.fetchArticles();
  }
  
  async checkSourceAvailability(): Promise<Map<string, boolean>> {
    const availability = new Map<string, boolean>();
    
    for (const source of this.getAllSources()) {
      const isAvailable = await source.isAvailable();
      availability.set(source.id, isAvailable);
    }
    
    return availability;
  }
  
  enableSource(sourceId: string): void {
    const source = this.getSource(sourceId);
    if (source) {
      source.isEnabled = true;
    }
  }
  
  disableSource(sourceId: string): void {
    const source = this.getSource(sourceId);
    if (source) {
      source.isEnabled = false;
    }
  }
}
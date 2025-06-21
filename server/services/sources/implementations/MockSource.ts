import { Article, ArticleCategory } from '@shared/types/article-source';
import { ArticleSourceBase } from '../base/ArticleSourceBase';

/**
 * Mock source for development and testing
 */
export class MockSource extends ArticleSourceBase {
  id = 'mock';
  name = 'Mock Data';
  icon = '🧪';
  
  async fetchArticles(): Promise<Article[]> {
    // Check cache first
    const cached = this.getCachedArticles();
    if (cached) {
      return cached;
    }
    
    // Generate mock articles
    const mockArticles: Article[] = [
      {
        id: this.generateArticleId({ url: 'https://example.com/ai-breakthrough' }),
        title: 'OpenAI、GPT-5の開発を発表 - より高度な推論能力を実現',
        url: 'https://example.com/ai-breakthrough',
        description: '次世代AIモデルは、複雑な問題解決能力と創造性を大幅に向上させる見込み',
        source: this.id,
        sourceName: this.name,
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        author: 'テック太郎',
        tags: ['AI', 'OpenAI', 'GPT-5'],
        category: ArticleCategory.AI,
        relevanceScore: 95,
        trendingScore: 90,
        techScore: 100,
        entertainmentValue: 60
      },
      {
        id: this.generateArticleId({ url: 'https://example.com/apple-vision-pro' }),
        title: 'Apple Vision Pro、日本での予約開始 - 空間コンピューティングの新時代',
        url: 'https://example.com/apple-vision-pro',
        description: '価格は50万円から。開発者向けSDKも同時リリース',
        source: this.id,
        sourceName: this.name,
        publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        author: 'ガジェット花子',
        tags: ['Apple', 'VisionPro', 'AR'],
        category: ArticleCategory.GADGET,
        relevanceScore: 88,
        trendingScore: 85,
        techScore: 90,
        entertainmentValue: 75
      },
      {
        id: this.generateArticleId({ url: 'https://example.com/react-19' }),
        title: 'React 19正式リリース - Server Componentsが標準機能に',
        url: 'https://example.com/react-19',
        description: 'パフォーマンスが大幅に向上し、新しいフック機能も追加',
        source: this.id,
        sourceName: this.name,
        publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        author: 'コード次郎',
        tags: ['React', 'JavaScript', 'Web開発'],
        category: ArticleCategory.PROGRAMMING,
        relevanceScore: 82,
        trendingScore: 70,
        techScore: 95,
        entertainmentValue: 40
      },
      {
        id: this.generateArticleId({ url: 'https://example.com/nintendo-direct' }),
        title: 'Nintendo Direct開催決定！新作ゼルダDLCの情報解禁か',
        url: 'https://example.com/nintendo-direct',
        description: '任天堂が重大発表を予告。ファンの期待が高まる',
        source: this.id,
        sourceName: this.name,
        publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        author: 'ゲーム部長',
        tags: ['Nintendo', 'ゼルダ', 'ゲーム'],
        category: ArticleCategory.GAMING,
        relevanceScore: 75,
        trendingScore: 88,
        techScore: 30,
        entertainmentValue: 95
      },
      {
        id: this.generateArticleId({ url: 'https://example.com/movie-news' }),
        title: 'ハリウッド大作、AI俳優の起用で話題に - 倫理的議論も',
        url: 'https://example.com/movie-news',
        description: '完全にAIで生成された俳優が主演を務める初の大作映画',
        source: this.id,
        sourceName: this.name,
        publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
        author: 'エンタメ記者',
        tags: ['映画', 'AI', 'エンタメ'],
        category: ArticleCategory.ENTERTAINMENT,
        relevanceScore: 70,
        trendingScore: 92,
        techScore: 60,
        entertainmentValue: 100
      },
      {
        id: this.generateArticleId({ url: 'https://example.com/sports-tech' }),
        title: '大谷翔平、AIトレーニングシステムで更なる進化',
        url: 'https://example.com/sports-tech',
        description: '最新のモーション解析技術を活用し、投打の精度が向上',
        source: this.id,
        sourceName: this.name,
        publishedAt: new Date(Date.now() - 7 * 60 * 60 * 1000), // 7 hours ago
        author: 'スポーツアナリスト',
        tags: ['野球', '大谷翔平', 'スポーツテック'],
        category: ArticleCategory.SPORTS,
        relevanceScore: 65,
        trendingScore: 80,
        techScore: 50,
        entertainmentValue: 85
      },
      {
        id: this.generateArticleId({ url: 'https://example.com/startup-funding' }),
        title: '日本のAIスタートアップ、100億円の資金調達に成功',
        url: 'https://example.com/startup-funding',
        description: '医療診断AIの開発で注目。海外展開も視野に',
        source: this.id,
        sourceName: this.name,
        publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
        author: 'ビジネス編集部',
        tags: ['スタートアップ', 'AI', '医療'],
        category: ArticleCategory.BUSINESS,
        relevanceScore: 72,
        trendingScore: 65,
        techScore: 80,
        entertainmentValue: 45
      },
      {
        id: this.generateArticleId({ url: 'https://example.com/quantum-computing' }),
        title: '量子コンピューター、室温動作に成功 - 実用化へ大きな一歩',
        url: 'https://example.com/quantum-computing',
        description: '東大とIBMの共同研究チームが画期的なブレークスルー',
        source: this.id,
        sourceName: this.name,
        publishedAt: new Date(Date.now() - 10 * 60 * 60 * 1000), // 10 hours ago
        author: 'サイエンスライター',
        tags: ['量子コンピューター', '科学', '技術'],
        category: ArticleCategory.SCIENCE,
        relevanceScore: 85,
        trendingScore: 75,
        techScore: 100,
        entertainmentValue: 55
      },
      {
        id: this.generateArticleId({ url: 'https://example.com/microsoft-copilot' }),
        title: 'Microsoft、Copilot Pro+を発表 - コード生成精度が95%に',
        url: 'https://example.com/microsoft-copilot',
        description: 'エンタープライズ向けの高度なAI開発支援ツール',
        source: this.id,
        sourceName: this.name,
        publishedAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        author: 'デベロッパー通信',
        tags: ['Microsoft', 'Copilot', 'AI開発'],
        category: ArticleCategory.TECH,
        relevanceScore: 90,
        trendingScore: 82,
        techScore: 98,
        entertainmentValue: 50
      },
      {
        id: this.generateArticleId({ url: 'https://example.com/space-tourism' }),
        title: 'SpaceX、一般向け月旅行の受付開始 - 2025年出発予定',
        url: 'https://example.com/space-tourism',
        description: '価格は1人5000万円。すでに100名以上が申し込み',
        source: this.id,
        sourceName: this.name,
        publishedAt: new Date(Date.now() - 9 * 60 * 60 * 1000), // 9 hours ago
        author: '宇宙ニュース',
        tags: ['SpaceX', '宇宙', '観光'],
        category: ArticleCategory.SCIENCE,
        relevanceScore: 78,
        trendingScore: 95,
        techScore: 70,
        entertainmentValue: 90
      }
    ];
    
    // Cache the results
    this.setCachedArticles(mockArticles);
    
    return mockArticles;
  }
}
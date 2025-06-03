import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Database, Globe, Users, Clock, Gauge } from "lucide-react";

interface PerformanceMetrics {
  totalRequests: number;
  averageResponseTime: number;
  errorRate: number;
  cacheHitRate: number;
  urlCacheHits: number;
  urlCacheMisses: number;
  totalCacheRequests: number;
  uptime: number;
  memoryUsage: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  urlCacheSize: number;
  activeConnections: number;
  // Database cache metrics
  dbCacheHits: number;
  dbCacheMisses: number;
  dbCacheHitRate: number;
  dbCacheSize: number;
  totalDbCacheRequests: number;
}

export function PerformanceMonitor() {
  const { data: metrics, isLoading } = useQuery<PerformanceMetrics>({
    queryKey: ["/api/metrics"],
    refetchInterval: 30000, // Update every 30 seconds
  });

  if (isLoading || !metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="w-5 h-5" />
            パフォーマンス監視
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">データを読み込み中...</p>
        </CardContent>
      </Card>
    );
  }

  const formatBytes = (bytes: number) => {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}時間 ${minutes}分`;
  };

  const getCacheEfficiencyColor = (rate: number) => {
    if (rate >= 80) return "bg-green-100 text-green-800";
    if (rate >= 60) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="w-5 h-5" />
            パフォーマンス監視
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* URL Cache Performance */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-500" />
                <span className="font-medium">URLキャッシュ</span>
              </div>
              <div className="space-y-2">
                <Badge className={getCacheEfficiencyColor(metrics.cacheHitRate)}>
                  ヒット率: {metrics.cacheHitRate.toFixed(1)}%
                </Badge>
                <div className="text-sm text-muted-foreground">
                  <div>ヒット: {metrics.urlCacheHits}</div>
                  <div>ミス: {metrics.urlCacheMisses}</div>
                  <div>サイズ: {metrics.urlCacheSize} エントリ</div>
                </div>
              </div>
            </div>

            {/* Database Cache Performance */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-green-500" />
                <span className="font-medium">DBクエリキャッシュ</span>
              </div>
              <div className="space-y-2">
                <Badge className={getCacheEfficiencyColor(metrics.dbCacheHitRate)}>
                  ヒット率: {metrics.dbCacheHitRate.toFixed(1)}%
                </Badge>
                <div className="text-sm text-muted-foreground">
                  <div>ヒット: {metrics.dbCacheHits}</div>
                  <div>ミス: {metrics.dbCacheMisses}</div>
                  <div>サイズ: {metrics.dbCacheSize} エントリ</div>
                </div>
              </div>
            </div>

            {/* Connection Stats */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-green-500" />
                <span className="font-medium">接続状況</span>
              </div>
              <div className="space-y-2">
                <Badge variant="outline">
                  アクティブ: {metrics.activeConnections}
                </Badge>
                <div className="text-sm text-muted-foreground">
                  <div>総リクエスト: {metrics.totalRequests}</div>
                  <div>エラー率: {metrics.errorRate.toFixed(2)}%</div>
                </div>
              </div>
            </div>

            {/* System Health */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-500" />
                <span className="font-medium">システム状況</span>
              </div>
              <div className="space-y-2">
                <Badge variant="secondary">
                  稼働時間: {formatUptime(metrics.uptime)}
                </Badge>
                <div className="text-sm text-muted-foreground">
                  <div>使用メモリ: {formatBytes(metrics.memoryUsage.heapUsed)}</div>
                  <div>総メモリ: {formatBytes(metrics.memoryUsage.heapTotal)}</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            最適化状況
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <div className="font-medium text-green-800">URL情報キャッシング</div>
                <div className="text-sm text-green-600">同じURLの情報取得を24時間キャッシュ</div>
              </div>
              <Badge className="bg-green-100 text-green-800">有効</Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <div className="font-medium text-blue-800">レート制限</div>
                <div className="text-sm text-blue-600">1分間に30リクエストまで制限</div>
              </div>
              <Badge className="bg-blue-100 text-blue-800">有効</Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div>
                <div className="font-medium text-purple-800">セキュリティヘッダー</div>
                <div className="text-sm text-purple-600">XSS保護・フレーム埋め込み防止</div>
              </div>
              <Badge className="bg-purple-100 text-purple-800">有効</Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <div>
                <div className="font-medium text-orange-800">静的リソースキャッシング</div>
                <div className="text-sm text-orange-600">JavaScript・CSSファイルを1年間キャッシュ</div>
              </div>
              <Badge className="bg-orange-100 text-orange-800">有効</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Database, Clock, Gauge } from "lucide-react";

interface PerformanceMetrics {
  totalQueries: number;
  slowQueries: number;
  averageQueryTime: number;
  totalQueryTime: number;
  connectionCount: number;
  errors: number;
}

export function PerformanceMonitor() {
  const { data: metrics, isLoading } = useQuery<PerformanceMetrics>({
    queryKey: ["/api/performance"],
    refetchInterval: 30000, // Update every 30 seconds
  });

  if (isLoading || !metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            データベースパフォーマンス監視
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">データを読み込み中...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          データベースパフォーマンス監視
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Query Performance */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4" />
              クエリパフォーマンス
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">総クエリ数</span>
                <Badge variant="outline">
                  {metrics.totalQueries}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">平均実行時間</span>
                <Badge variant={metrics.averageQueryTime > 100 ? "destructive" : "default"}>
                  {metrics.averageQueryTime.toFixed(2)}ms
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">総実行時間</span>
                <span className="text-sm">{metrics.totalQueryTime.toFixed(2)}ms</span>
              </div>
            </div>
          </div>

          {/* Slow Query Detection */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4" />
              スロークエリ
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">スロークエリ数</span>
                <Badge variant={metrics.slowQueries > 0 ? "destructive" : "default"}>
                  {metrics.slowQueries}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">スロークエリ率</span>
                <Badge variant={metrics.totalQueries > 0 && (metrics.slowQueries / metrics.totalQueries) > 0.1 ? "destructive" : "default"}>
                  {metrics.totalQueries > 0 ? ((metrics.slowQueries / metrics.totalQueries) * 100).toFixed(1) : '0.0'}%
                </Badge>
              </div>
            </div>
          </div>

          {/* Error Tracking */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Gauge className="w-4 h-4" />
              エラー追跡
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">エラー数</span>
                <Badge variant={metrics.errors > 0 ? "destructive" : "default"}>
                  {metrics.errors}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">接続数</span>
                <span className="text-sm">{metrics.connectionCount}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t">
          <div className="text-xs text-muted-foreground">
            スロークエリ: 100ms以上のクエリを自動検出・記録しています
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
import { useState, useEffect, useCallback, useRef } from 'react';
import { queryClient } from '@/lib/queryClient';

type WebSocketEvent = {
  type: string;
  data: any;
};

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  const handleWebSocketEvent = useCallback((event: WebSocketEvent) => {
    // キャッシュ更新を高速化し、必要なクエリだけを直接更新
    const { type, data } = event;
    
    // イベントデータから週IDを取り出す
    const weekId = data?.weekId;
    const topicId = data?.topicId;
    
    // アクティブウィークのエンドポイントのキャッシュキー
    const activeWeekKey = ['/api/weeks/active'];
    
    // 週ごとのトピックスのキャッシュキー
    const weekTopicsKey = weekId ? [`/api/weeks/${weekId}/topics`] : undefined;
    
    // 個別トピックのキャッシュキー
    const topicKey = topicId ? [`/api/topics/${topicId}`] : undefined;
    
    // リアルタイム更新を高速化するために直接データを更新できる場合は直接更新する
    switch (type) {
      case 'topic_created':
        // トピック作成時は、アクティブウィークのデータに新しいトピックを追加
        if (data.topic) {
          // アクティブウィークのキャッシュを取得
          const activeWeekCache = queryClient.getQueryData<any>(activeWeekKey);
          if (activeWeekCache && activeWeekCache.topics) {
            // 既存のキャッシュに新しいトピックを追加
            queryClient.setQueryData(activeWeekKey, {
              ...activeWeekCache,
              topics: [data.topic, ...activeWeekCache.topics]
            });
          } else {
            // キャッシュがない場合は再取得
            queryClient.invalidateQueries({ queryKey: activeWeekKey });
          }
          
          // 同様に週のトピックリストも更新
          if (weekTopicsKey) {
            const weekTopicsCache = queryClient.getQueryData<any[]>(weekTopicsKey);
            if (weekTopicsCache) {
              queryClient.setQueryData(weekTopicsKey, [data.topic, ...weekTopicsCache]);
            } else {
              queryClient.invalidateQueries({ queryKey: weekTopicsKey });
            }
          }
        } else {
          // トピックデータが含まれていない場合は従来通り無効化
          if (weekTopicsKey) queryClient.invalidateQueries({ queryKey: weekTopicsKey });
          queryClient.invalidateQueries({ queryKey: activeWeekKey });
        }
        
        // 全トピックリストのキャッシュも更新
        queryClient.invalidateQueries({ queryKey: ['/api/topics'] });
        break;
        
      case 'topic_status_changed':
        // ステータス変更時は該当トピックのデータを直接更新
        if (data.topic && topicKey) {
          // 個別トピックのキャッシュを更新
          queryClient.setQueryData(topicKey, data.topic);
          
          // アクティブウィークの当該トピックも更新
          const activeWeekCache = queryClient.getQueryData<any>(activeWeekKey);
          if (activeWeekCache && activeWeekCache.topics) {
            queryClient.setQueryData(activeWeekKey, {
              ...activeWeekCache,
              topics: activeWeekCache.topics.map((t: any) => 
                t.id === data.topic.id ? data.topic : t
              )
            });
          } else {
            queryClient.invalidateQueries({ queryKey: activeWeekKey });
          }
          
          // 週のトピックリストも更新
          if (weekTopicsKey) {
            const weekTopicsCache = queryClient.getQueryData<any[]>(weekTopicsKey);
            if (weekTopicsCache) {
              queryClient.setQueryData(weekTopicsKey, 
                weekTopicsCache.map(t => t.id === data.topic.id ? data.topic : t)
              );
            } else {
              queryClient.invalidateQueries({ queryKey: weekTopicsKey });
            }
          }
        } else {
          // 従来通りキャッシュを無効化
          if (topicKey) queryClient.invalidateQueries({ queryKey: topicKey });
          if (weekTopicsKey) queryClient.invalidateQueries({ queryKey: weekTopicsKey });
          queryClient.invalidateQueries({ queryKey: activeWeekKey });
        }
        break;
        
      case 'topic_deleted':
        // トピック削除時はキャッシュからも削除
        if (topicId) {
          // アクティブウィークからトピックを削除
          const activeWeekCache = queryClient.getQueryData<any>(activeWeekKey);
          if (activeWeekCache && activeWeekCache.topics) {
            queryClient.setQueryData(activeWeekKey, {
              ...activeWeekCache,
              topics: activeWeekCache.topics.filter((t: any) => t.id !== topicId)
            });
          } else {
            queryClient.invalidateQueries({ queryKey: activeWeekKey });
          }
          
          // 週のトピックリストからも削除
          if (weekTopicsKey) {
            const weekTopicsCache = queryClient.getQueryData<any[]>(weekTopicsKey);
            if (weekTopicsCache) {
              queryClient.setQueryData(weekTopicsKey, 
                weekTopicsCache.filter(t => t.id !== topicId)
              );
            } else {
              queryClient.invalidateQueries({ queryKey: weekTopicsKey });
            }
          }
          
          // トピックのキャッシュを削除
          if (topicKey) {
            queryClient.removeQueries({ queryKey: topicKey });
          }
        } else {
          // データがない場合は従来通り無効化
          if (weekTopicsKey) queryClient.invalidateQueries({ queryKey: weekTopicsKey });
          queryClient.invalidateQueries({ queryKey: activeWeekKey });
        }
        queryClient.invalidateQueries({ queryKey: ['/api/topics'] });
        break;
        
      case 'comment_added':
        // コメント追加時は該当トピックのコメントリストを直接更新
        if (data.comment && topicKey) {
          const topicCache = queryClient.getQueryData<any>(topicKey);
          if (topicCache) {
            queryClient.setQueryData(topicKey, {
              ...topicCache,
              comments: [...(topicCache.comments || []), data.comment]
            });
          } else {
            queryClient.invalidateQueries({ queryKey: topicKey });
          }
        } else {
          if (topicKey) queryClient.invalidateQueries({ queryKey: topicKey });
        }
        break;
        
      case 'star_added':
        // いいね追加時は該当トピックのいいね数を直接更新
        if (data.starsCount !== undefined && topicKey) {
          const topicCache = queryClient.getQueryData<any>(topicKey);
          if (topicCache) {
            queryClient.setQueryData(topicKey, {
              ...topicCache,
              starsCount: data.starsCount
            });
            
            // アクティブウィークの該当トピックのいいね数も更新
            const activeWeekCache = queryClient.getQueryData<any>(activeWeekKey);
            if (activeWeekCache && activeWeekCache.topics) {
              queryClient.setQueryData(activeWeekKey, {
                ...activeWeekCache,
                topics: activeWeekCache.topics.map((t: any) => 
                  t.id === topicId ? { ...t, starsCount: data.starsCount } : t
                )
              });
            }
            
            // 週のトピックリストの該当トピックのいいね数も更新
            if (weekTopicsKey) {
              const weekTopicsCache = queryClient.getQueryData<any[]>(weekTopicsKey);
              if (weekTopicsCache) {
                queryClient.setQueryData(weekTopicsKey, 
                  weekTopicsCache.map(t => t.id === topicId ? { ...t, starsCount: data.starsCount } : t)
                );
              }
            }
          } else {
            queryClient.invalidateQueries({ queryKey: topicKey });
          }
        } else {
          if (topicKey) queryClient.invalidateQueries({ queryKey: topicKey });
        }
        break;
        
      default:
        // 不明なイベントの場合は安全のため関連クエリのみ更新
        if (topicKey) queryClient.invalidateQueries({ queryKey: topicKey });
        if (weekTopicsKey) queryClient.invalidateQueries({ queryKey: weekTopicsKey });
    }
  }, []);

  const connect = useCallback(() => {
    // 既存の接続があれば閉じる
    if (socketRef.current) {
      if (socketRef.current.readyState === WebSocket.OPEN || 
          socketRef.current.readyState === WebSocket.CONNECTING) {
        return; // 既に接続中または接続試行中なら新たに接続しない
      }
      socketRef.current.close();
    }
    
    // WebSocketのプロトコルをHTTPプロトコルに合わせて設定
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('WebSocket接続が確立されました');
        setIsConnected(true);
        
        // 接続成功時に状態を同期するためのping-pongを送信
        socket.send(JSON.stringify({ type: 'ping' }));
      };

      socket.onclose = (event) => {
        // 予期しない切断のみログ出力
        if (!event.wasClean) {
          console.log('WebSocket connection status:', socket.readyState === WebSocket.OPEN);
        }
        setIsConnected(false);
      };

      socket.onerror = () => {
        // エラー発生時は接続状態をリセット
        setIsConnected(false);
      };

      socket.onmessage = (event) => {
        try {
          const message: WebSocketEvent = JSON.parse(event.data);
          handleWebSocketEvent(message);
        } catch (error) {
          console.error('WebSocketメッセージの解析エラー:', error);
        }
      };
    } catch (error) {
      console.error('WebSocket初期化エラー:', error);
      setIsConnected(false);
    }
  }, [handleWebSocketEvent]);

  // 最適化された接続管理
  useEffect(() => {
    // 初期接続
    connect();
    
    // 短い間隔での接続チェック（アプリの応答性向上のため）
    const quickReconnectCheck = setInterval(() => {
      if (!isConnected) {
        connect();
      }
    }, 2000);
    
    // 定期的な接続チェック（バックグラウンドでの安定性のため）
    const stableReconnectCheck = setInterval(() => {
      // 接続中だが、実際は切断されているケースに対応
      if (socketRef.current?.readyState !== WebSocket.OPEN) {
        setIsConnected(false);
        connect();
      }
    }, 10000);
    
    // ネットワーク状態の変化を監視
    window.addEventListener('online', connect);
    
    return () => {
      // クリーンアップ
      clearInterval(quickReconnectCheck);
      clearInterval(stableReconnectCheck);
      window.removeEventListener('online', connect);
      
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect, isConnected]);

  return { isConnected };
};
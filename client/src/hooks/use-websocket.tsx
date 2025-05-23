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

  // 接続試行中フラグを追加
  const [connecting, setConnecting] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const connect = useCallback(() => {
    // 既に接続中または接続試行中なら、新たに接続を試みない
    if (isConnected || connecting) {
      return;
    }
    
    // 接続試行中フラグをセット
    setConnecting(true);
    
    // 既存の接続を適切にクリーンアップ
    if (socketRef.current) {
      try {
        if (socketRef.current.readyState === WebSocket.OPEN) {
          // 正常に接続されているのにここに来た場合は状態の矛盾なのでフラグを修正
          setIsConnected(true);
          setConnecting(false);
          return;
        }
        
        // 接続待ちの状態なら少し待ってみる
        if (socketRef.current.readyState === WebSocket.CONNECTING) {
          // 既に接続試行中なら、タイムアウトを設定して様子を見る
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          
          reconnectTimeoutRef.current = setTimeout(() => {
            // 3秒経っても接続できなければ再接続を試みる
            if (socketRef.current && socketRef.current.readyState !== WebSocket.OPEN) {
              try {
                socketRef.current.close();
              } catch (e) {
                // エラーは無視
              }
              socketRef.current = null;
              setConnecting(false);
              connect(); // 再接続
            }
          }, 3000);
          
          return;
        }
        
        // クローズ済みまたはクローズ中の場合は改めて閉じる
        socketRef.current.close();
      } catch (e) {
        // エラーは無視して新しい接続を試みる
      }
    }
    
    // WebSocketのプロトコルをHTTPプロトコルに合わせて設定
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // Replitの環境ではwindow.location.hostを使用
    // localhost:undefinedというエラーを避けるため、明示的にサーバーのホスト/パスを指定
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log('Connecting to WebSocket URL:', wsUrl);
    
    try {
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        // 接続が確立された - ログを最小限に
        if (!isConnected) {
          console.log('WebSocket接続が確立されました');
        }
        setIsConnected(true);
        setConnecting(false);
        
        // 接続成功時にハートビートを開始
        if (socket.readyState === WebSocket.OPEN) {
          // ハートビートを送信（サーバーがping-pongに対応していることを前提）
          try {
            socket.send(JSON.stringify({ type: 'ping' }));
          } catch (e) {
            // 送信エラーは無視
          }
        }
      };

      socket.onclose = () => {
        // 接続が閉じられた - 状態変更のみ行い、ログは出さない
        setIsConnected(false);
        setConnecting(false);
      };

      socket.onerror = () => {
        // エラーが発生した - 状態変更のみ行い、ログは出さない
        setIsConnected(false);
        setConnecting(false);
      };

      socket.onmessage = (event) => {
        try {
          const message: WebSocketEvent = JSON.parse(event.data);
          handleWebSocketEvent(message);
        } catch (error) {
          // パース失敗は無視
        }
      };
    } catch (error) {
      // 初期化エラー
      setIsConnected(false);
      setConnecting(false);
    }
  }, [handleWebSocketEvent, isConnected, connecting]);

  // 最適化された接続管理
  useEffect(() => {
    // 初期接続
    connect();
    
    // 接続状態の定期チェック（負荷を抑えるため間隔を長めにする）
    const reconnectCheck = setInterval(() => {
      // 接続していない、かつ接続試行中でもない場合に再接続
      if (!isConnected && !connecting) {
        connect();
      }
    }, 5000);
    
    // 視認性向上のため、状態をコンソールに表示するのは開発時のみ
    if (process.env.NODE_ENV === 'development') {
      const statusCheck = setInterval(() => {
        const status = socketRef.current?.readyState === WebSocket.OPEN;
        if (status !== isConnected) {
          // 状態の不一致がある場合は修正
          setIsConnected(status);
        }
      }, 10000);
      
      return () => {
        clearInterval(statusCheck);
        clearInterval(reconnectCheck);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        if (socketRef.current) {
          try {
            socketRef.current.close();
          } catch (e) {
            // エラーは無視
          }
        }
      };
    }
    
    return () => {
      clearInterval(reconnectCheck);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (socketRef.current) {
        try {
          socketRef.current.close();
        } catch (e) {
          // エラーは無視
        }
      }
    };
  }, [connect, isConnected, connecting]);

  return { isConnected };
};
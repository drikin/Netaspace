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
    console.log('WebSocketイベントを受信:', event);
    
    // キャッシュ更新を最適化し、必要なクエリだけを更新
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
    
    // 対象のキャッシュを効率的に無効化
    switch (type) {
      case 'topic_created':
        // トピック作成時は、週のトピックリストとアクティブウィークを更新
        if (weekTopicsKey) {
          queryClient.invalidateQueries({ queryKey: weekTopicsKey });
        }
        queryClient.invalidateQueries({ queryKey: activeWeekKey });
        
        // 必要であれば、全トピックのリストも更新
        queryClient.invalidateQueries({ queryKey: ['/api/topics'] });
        break;
        
      case 'topic_status_changed':
        // ステータス変更時は該当トピックと週のトピックリストを更新
        if (topicKey) {
          queryClient.invalidateQueries({ queryKey: topicKey });
        }
        if (weekTopicsKey) {
          queryClient.invalidateQueries({ queryKey: weekTopicsKey });
        }
        queryClient.invalidateQueries({ queryKey: activeWeekKey });
        break;
        
      case 'topic_deleted':
        // トピック削除時は週のトピックリストとアクティブウィークを更新
        console.log('トピックが削除されました:', data);
        if (weekTopicsKey) {
          queryClient.invalidateQueries({ queryKey: weekTopicsKey });
        }
        queryClient.invalidateQueries({ queryKey: activeWeekKey });
        queryClient.invalidateQueries({ queryKey: ['/api/topics'] });
        break;
        
      case 'comment_added':
        // コメント追加時は該当トピックのみ更新
        if (topicKey) {
          queryClient.invalidateQueries({ queryKey: topicKey });
        }
        break;
        
      case 'star_added':
        // いいね追加時は該当トピックのみ更新
        if (topicKey) {
          queryClient.invalidateQueries({ queryKey: topicKey });
        }
        break;
        
      default:
        console.log('未処理のWebSocketイベント:', event);
        // 不明なイベントの場合は関連クエリのみ更新
        if (topicKey) {
          queryClient.invalidateQueries({ queryKey: topicKey });
        }
        if (weekTopicsKey) {
          queryClient.invalidateQueries({ queryKey: weekTopicsKey });
        }
    }
  }, []);

  const connect = useCallback(() => {
    // WebSocketのプロトコルをHTTPプロトコルに合わせて設定
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('WebSocket接続が確立されました');
      setIsConnected(true);
    };

    socket.onclose = () => {
      // 開発環境では大量のログが出るので、運用環境のみログを出力
      if (process.env.NODE_ENV === 'production') {
        console.log('WebSocket接続が切断されました');
      }
      setIsConnected(false);
      
      // 数秒後に再接続を試みる
      setTimeout(() => {
        if (socketRef.current?.readyState !== WebSocket.OPEN) {
          connect();
        }
      }, 3000);
    };

    socket.onerror = (error) => {
      // 開発環境では大量のログが出るので、運用環境のみログを出力
      if (process.env.NODE_ENV === 'production') {
        console.error('WebSocket接続エラー:', error);
      }
    };

    socket.onmessage = (event) => {
      try {
        const message: WebSocketEvent = JSON.parse(event.data);
        handleWebSocketEvent(message);
      } catch (error) {
        console.error('WebSocketメッセージの解析エラー:', error);
      }
    };
  }, [handleWebSocketEvent]);

  useEffect(() => {
    // 接続を即時実行
    connect();
    
    // 定期的に接続状態を確認し、切断されていれば再接続
    const checkInterval = setInterval(() => {
      if (!isConnected && (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN)) {
        console.log('WebSocket再接続を試みます...');
        connect();
      }
    }, 5000);
    
    return () => {
      // クリーンアップ
      clearInterval(checkInterval);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect, isConnected]);

  return { isConnected };
};
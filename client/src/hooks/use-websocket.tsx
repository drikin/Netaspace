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
    
    // イベントタイプに応じてReact Queryのキャッシュを無効化
    switch (event.type) {
      case 'topic_created':
        // より広範なクエリの無効化 - すべてのトピック関連クエリを更新
        queryClient.invalidateQueries();
        break;
        
      case 'topic_status_changed':
        // より広範なクエリの無効化 - すべてのトピック関連クエリを更新
        queryClient.invalidateQueries();
        break;
        
      case 'topic_deleted':
        // トピックが削除された場合も、すべてのクエリをリフレッシュ
        console.log('トピックが削除されました:', event.data);
        queryClient.invalidateQueries();
        break;
        
      case 'comment_added':
        // トピックとその関連データを無効化
        queryClient.invalidateQueries({ queryKey: [`/api/topics/${event.data.topicId}`] });
        queryClient.invalidateQueries({ queryKey: ['/api/topics'] });
        break;
        
      case 'star_added':
        // トピックとその関連データを無効化
        queryClient.invalidateQueries({ queryKey: [`/api/topics/${event.data.topicId}`] });
        queryClient.invalidateQueries({ queryKey: ['/api/topics'] });
        break;
        
      default:
        console.log('未処理のWebSocketイベント:', event);
        // 不明なイベントの場合は広範囲に更新
        queryClient.invalidateQueries();
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
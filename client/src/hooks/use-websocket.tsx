import { useState, useEffect, useCallback, useRef } from 'react';
import { queryClient } from '@/lib/queryClient';

type WebSocketEvent = {
  type: string;
  data: any;
};

export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

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
      console.log('WebSocket接続が切断されました');
      setIsConnected(false);
      
      // 数秒後に再接続を試みる
      setTimeout(() => {
        if (socketRef.current?.readyState !== WebSocket.OPEN) {
          connect();
        }
      }, 3000);
    };

    socket.onerror = (error) => {
      console.error('WebSocket接続エラー:', error);
    };

    socket.onmessage = (event) => {
      try {
        const message: WebSocketEvent = JSON.parse(event.data);
        handleWebSocketEvent(message);
      } catch (error) {
        console.error('WebSocketメッセージの解析エラー:', error);
      }
    };
  }, []);

  const handleWebSocketEvent = useCallback((event: WebSocketEvent) => {
    console.log('WebSocketイベントを受信:', event);
    
    // イベントタイプに応じてReact Queryのキャッシュを無効化
    switch (event.type) {
      case 'topic_created':
        // トピック一覧と週のデータを再取得
        queryClient.invalidateQueries({ queryKey: ['/api/topics'] });
        queryClient.invalidateQueries({ queryKey: ['/api/weeks/active'] });
        break;
        
      case 'topic_status_changed':
        // 対象トピックと関連データを再取得
        queryClient.invalidateQueries({ queryKey: ['/api/topics'] });
        queryClient.invalidateQueries({ queryKey: [`/api/topics/${event.data.topicId}`] });
        break;
        
      case 'comment_added':
        // 対象トピックとコメントを再取得
        queryClient.invalidateQueries({ queryKey: [`/api/topics/${event.data.topicId}`] });
        break;
        
      case 'star_added':
        // 対象トピックのスター状態を再取得
        queryClient.invalidateQueries({ queryKey: [`/api/topics/${event.data.topicId}`] });
        break;
        
      default:
        console.log('未処理のWebSocketイベント:', event);
    }
  }, []);

  useEffect(() => {
    connect();
    
    return () => {
      // コンポーネントアンマウント時にWebSocket接続を閉じる
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  return { isConnected };
};
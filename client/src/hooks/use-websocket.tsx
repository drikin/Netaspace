import { useState, useEffect, useCallback, useRef } from 'react';
import { queryClient } from '@/lib/queryClient';

type WebSocketEvent = {
  type: string;
  data: any;
};

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  const handleWebSocketEvent = useCallback((event: MessageEvent) => {
    try {
      const eventData: WebSocketEvent = JSON.parse(event.data);
      const { type, data } = eventData;
      
      // イベントデータから週IDを取り出す
      const weekId = data?.weekId;
      const topicId = data?.topicId;
      
      // アクティブウィークのエンドポイントのキャッシュキー
      const activeWeekKey = ['/api/weeks/active'];
      
      // 週ごとのトピックスのキャッシュキー
      const weekTopicsKey = weekId ? [`/api/weeks/${weekId}/topics`] : undefined;
      
      // 個別トピックのキャッシュキー
      const topicKey = topicId ? [`/api/topics/${topicId}`] : undefined;
      
      // イベントタイプに応じたキャッシュ更新
      switch (type) {
        case 'topic_created':
          // トピック作成時は、関連するクエリを更新
          queryClient.invalidateQueries({ queryKey: activeWeekKey });
          if (weekTopicsKey) queryClient.invalidateQueries({ queryKey: weekTopicsKey });
          queryClient.invalidateQueries({ queryKey: ['/api/topics'] });
          break;
          
        case 'topic_status_changed':
          // ステータス変更時も関連クエリを更新
          queryClient.invalidateQueries({ queryKey: activeWeekKey });
          if (topicKey) queryClient.invalidateQueries({ queryKey: topicKey });
          if (weekTopicsKey) queryClient.invalidateQueries({ queryKey: weekTopicsKey });
          break;
          
        case 'topic_deleted':
          // トピック削除時はキャッシュから削除
          queryClient.invalidateQueries({ queryKey: activeWeekKey });
          if (weekTopicsKey) queryClient.invalidateQueries({ queryKey: weekTopicsKey });
          if (topicKey) queryClient.removeQueries({ queryKey: topicKey });
          queryClient.invalidateQueries({ queryKey: ['/api/topics'] });
          break;
          
        case 'comment_added':
          // コメント追加時はトピックを更新
          if (topicKey) queryClient.invalidateQueries({ queryKey: topicKey });
          break;
          
        case 'star_added':
          // いいね追加時もトピックとリストを更新
          if (topicKey) queryClient.invalidateQueries({ queryKey: topicKey });
          queryClient.invalidateQueries({ queryKey: activeWeekKey });
          if (weekTopicsKey) queryClient.invalidateQueries({ queryKey: weekTopicsKey });
          break;
          
        default:
          // 不明なイベントの場合は関連クエリを更新
          queryClient.invalidateQueries({ queryKey: activeWeekKey });
      }
    } catch (error) {
      // パース失敗は無視
      console.error('WebSocketメッセージエラー:', error);
    }
  }, []);

  useEffect(() => {
    // WebSocketの接続を管理する関数
    const connectWebSocket = () => {
      // すでに接続中なら何もしない
      if (socketRef.current && 
          (socketRef.current.readyState === WebSocket.OPEN || 
           socketRef.current.readyState === WebSocket.CONNECTING)) {
        return;
      }
      
      // 既存の接続をクリーンアップ
      if (socketRef.current) {
        try {
          socketRef.current.close();
        } catch (e) {
          // エラーは無視
        }
      }
      
      try {
        // WebSocketのURLを作成
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        console.log('Connecting to WebSocket URL:', wsUrl);
        
        // WebSocketを作成
        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;
        
        // 各種イベントハンドラを設定
        socket.onopen = () => {
          console.log('WebSocket connection established');
          setIsConnected(true);
        };
        
        socket.onclose = () => {
          console.log('WebSocket connection closed');
          setIsConnected(false);
        };
        
        socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          setIsConnected(false);
        };
        
        socket.onmessage = handleWebSocketEvent;
      } catch (error) {
        console.error('WebSocket initialization error:', error);
        setIsConnected(false);
      }
    };
    
    // 初期接続
    connectWebSocket();
    
    // 接続状態の定期チェック（5秒ごと）
    const reconnectInterval = setInterval(() => {
      if (socketRef.current?.readyState !== WebSocket.OPEN) {
        console.log('Attempting to reconnect WebSocket...');
        connectWebSocket();
      }
    }, 5000);
    
    // クリーンアップ
    return () => {
      clearInterval(reconnectInterval);
      
      if (socketRef.current) {
        try {
          socketRef.current.close();
        } catch (e) {
          // エラーは無視
        }
      }
    };
  }, [handleWebSocketEvent]);

  return { isConnected };
};
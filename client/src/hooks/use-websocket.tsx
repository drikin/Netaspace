// WebSocket機能を削除してトランザクションベース実装に変更
// Compute Unit消費を大幅削減するため、リアルタイム更新を無効化

export function useWebSocket() {
  // WebSocket接続を完全に無効化
  const isConnected = false;
  
  // トランザクションベース実装では接続状態のみ返す
  return { isConnected };
}
// リリースノート情報を管理するためのデータ構造

export interface ReleaseNote {
  id: string;          // リリースID (日付などでユニーク)
  version: string;     // バージョン番号
  date: string;        // リリース日
  title: string;       // リリースタイトル
  description: string; // 詳細説明
  features: string[];  // 新機能リスト
  isNew?: boolean;     // 新着フラグ (ユーザーがまだ見ていない)
}

// リリース履歴データ（新しい順）
export const releaseNotes: ReleaseNote[] = [
  {
    id: "2025-05-24",
    version: "1.3.0",
    date: "2025年5月24日",
    title: "リアルタイム通信の安定性向上とHTML構造の最適化",
    description: "WebSocket接続の安定性を大幅に向上させました。また、HTML5標準に準拠するようページ構造を修正し、より高速で安定したブラウザ表示を実現しています。",
    features: [
      "WebSocket接続の安定性を強化",
      "リアルタイムデータ同期の最適化",
      "HTML5標準に準拠したページ構造に修正",
      "エラーハンドリングの強化",
      "全体的なパフォーマンスの向上"
    ],
    isNew: true
  },
  {
    id: "2025-05-23",
    version: "1.2.0",
    date: "2025年5月23日",
    title: "トピック管理機能の強化",
    description: "管理者向け機能を強化し、トピックの削除機能を追加しました。削除操作は確認ダイアログで誤操作を防止し、削除時は関連するコメントやいいねも同時に削除されます。",
    features: [
      "管理者がトピックを削除できる機能を追加",
      "削除前に確認ダイアログを表示",
      "関連するコメントといいねを一括削除",
      "WebSocketでリアルタイム反映",
      "お知らせ機能の追加"
    ]
  },
  {
    id: "2025-05-15",
    version: "1.1.0",
    date: "2025年5月15日",
    title: "WebSocketによるリアルタイム更新",
    description: "アプリケーション全体にWebSocketを導入し、複数ユーザー間でのリアルタイム更新を実現しました。トピックの投稿、ステータス変更、コメント、いいねなどの操作がリアルタイムに他のユーザーにも反映されます。",
    features: [
      "WebSocketによるリアルタイム更新機能",
      "複数デバイス間での同期",
      "自動再接続機能の実装",
      "いいね機能の強化"
    ]
  },
  {
    id: "2025-05-01",
    version: "1.0.0",
    date: "2025年5月1日",
    title: "初回リリース",
    description: "backspace.fm用のトピック管理システムの初回リリースです。パーソナリティとリスナーがトピックを共同管理できるプラットフォームを提供します。",
    features: [
      "トピック投稿機能",
      "コメント機能",
      "いいね（スター）機能",
      "管理者用ステータス管理",
      "Weekly管理機能",
      "URLからのタイトル・説明文の自動取得"
    ]
  }
];

// ローカルストレージにユーザーが既読したリリースを保存するキー
export const READ_RELEASES_KEY = 'backspace-read-releases';

// ユーザーが既読したリリースIDを取得
export function getReadReleases(): string[] {
  try {
    const stored = localStorage.getItem(READ_RELEASES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('既読リリース情報の取得に失敗しました:', e);
    return [];
  }
}

// リリースを既読としてマーク
export function markReleaseAsRead(releaseId: string) {
  try {
    const readReleases = getReadReleases();
    if (!readReleases.includes(releaseId)) {
      readReleases.push(releaseId);
      localStorage.setItem(READ_RELEASES_KEY, JSON.stringify(readReleases));
    }
  } catch (e) {
    console.error('リリースの既読マークに失敗しました:', e);
  }
}

// リリースを既読としてマーク（複数）
export function markReleasesAsRead(releaseIds: string[]) {
  try {
    let readReleases = getReadReleases();
    let updated = false;
    
    for (const releaseId of releaseIds) {
      if (!readReleases.includes(releaseId)) {
        readReleases.push(releaseId);
        updated = true;
      }
    }
    
    if (updated) {
      localStorage.setItem(READ_RELEASES_KEY, JSON.stringify(readReleases));
    }
  } catch (e) {
    console.error('リリースの既読マークに失敗しました:', e);
  }
}

// 未読リリースの件数を取得
export function getUnreadReleaseCount(): number {
  const readReleases = getReadReleases();
  return releaseNotes.filter(note => !readReleases.includes(note.id)).length;
}

// 未読リリースの一覧を取得
export function getUnreadReleases(): ReleaseNote[] {
  const readReleases = getReadReleases();
  return releaseNotes.filter(note => !readReleases.includes(note.id));
}
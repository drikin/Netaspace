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
    id: "2025-06-12-v2.5.0",
    version: "2.5.0",
    date: "2025年6月12日",
    title: "UIリファクタリングと認証ベースナビゲーション",
    description: "ユーザーインターフェースを大幅に改善し、認証状態に基づくスマートなナビゲーションシステムを実装しました。非ログイン時はシンプルな表示に、ログイン時は全機能にアクセス可能になります。",
    features: [
      "認証状態に基づくタブナビゲーション（非ログイン時は非表示）",
      "フッターからGitHubアイコンを削除してシンプル化",
      "ロゴクリックでホームページへの直接リンク機能",
      "「今週のネタ」ナビゲーションリンクを削除",
      "ブックマークレット機能を拡張機能ページに統合",
      "総ネタ数の表示機能追加",
      "ユーザビリティ向上のための全体的なUI改善"
    ],
    isNew: true
  },
  {
    id: "2025-06-07-v2.4.0",
    version: "2.4.0",
    date: "2025年6月7日",
    title: "永続ストレージシステムと自動既読機能",
    description: "データの永続化システムを実装し、Replitの再デプロイ時でもデータが失われることがなくなりました。また、リリースノートの自動既読機能を追加し、一度開くだけで全ての新着項目が既読になります。",
    features: [
      "永続ストレージシステムによる完全なデータ保護",
      "再デプロイ時のデータ消失防止機能",
      "自動バックアップシステムと復元機能",
      "リリースノート自動既読機能（開いた時点で全て既読）",
      "スマートなデータベースパス検出システム",
      "フォールバック保護による高い信頼性",
      "管理画面でのバックアップダウンロード機能"
    ],
    isNew: false
  },
  {
    id: "2025-06-06-v2.3.0",
    version: "2.3.0",
    date: "2025年6月6日",
    title: "人気トピック視覚化機能",
    description: "「聞きたい」投票が入っているトピックに動的な背景カラーを追加しました。投票数が多いほど色が濃くなり、人気のあるネタを一目で判別できるようになりました。",
    features: [
      "投票数に応じた動的背景カラー（backspace.fm風グリーン）",
      "投票数が増加するほど濃くなるグラデーション効果",
      "読みやすさを保った洗練されたカラーリング",
      "人気トピックの視覚的識別性向上",
      "スタイリッシュで直感的なユーザー体験"
    ],
    isNew: true
  },
  {
    id: "2025-06-06-v2.2.0",
    version: "2.2.0",
    date: "2025年6月6日",
    title: "UI最適化とユーザビリティ向上",
    description: "トピック表示の大幅な最適化により、1画面により多くのネタを表示できるようになりました。また、タイトルクリックで直接記事にアクセスできる機能を追加し、より効率的な閲覧が可能です。",
    features: [
      "コンパクトビュー実装（1画面に3-4倍のトピック表示）",
      "記事詳細・コメントをデフォルトで折りたたみ",
      "タイトルクリックで記事が直接開く機能を追加",
      "パディングとフォントサイズの最適化",
      "単一アコーディオンによる詳細表示の統合",
      "ホバーエフェクトによるクリック可能性の明示",
      "画面密度の大幅向上とスクロール削減"
    ]
  },
  {
    id: "2025-06-06-v2.1.0",
    version: "2.1.0",
    date: "2025年6月6日",
    title: "Chrome拡張機能とUI/UX改善",
    description: "Chrome拡張機能のダウンロード機能を修正し、ヘッダー表示の不具合を解消しました。また、ナビゲーションメニューの最適化を行い、より使いやすいインターフェースを提供します。",
    features: [
      "Chrome拡張機能のZIPファイル生成を修正（正常なダウンロードが可能に）",
      "拡張機能ページでのヘッダー重複表示問題を解決",
      "デプロイ用サーバーURL（netaspace.replit.app）をデフォルト設定",
      "ナビゲーションメニューから「ネタを投稿」項目を削除",
      "API ルーティングの競合問題を修正（POST/GET エンドポイント順序最適化）",
      "ES モジュールインポートエラーを解決",
      "拡張機能のトピック投稿機能が正常に動作"
    ]
  },
  {
    id: "2025-06-05-v2.0.0",
    version: "2.0.0",
    date: "2025年6月5日",
    title: "トランザクションベース実装への移行",
    description: "Compute Unit消費を最大限削減するため、WebSocketによるリアルタイム更新を削除し、トランザクションベース実装に移行しました。ユーザー操作時のみデータを取得する方式に変更することで、大幅なコスト削減を実現しています。",
    features: [
      "WebSocket機能完全削除（常時接続からオンデマンド取得へ）",
      "Compute Unit消費大幅削減（リアルタイム機能無効化）",
      "トランザクションベース実装（ユーザー操作時のみデータ更新）",
      "データベース接続プール最適化（50→5接続、90%削減）",
      "キャッシュ戦略改善（TTL 5分、React Query 10分）",
      "URL取得処理軽量化（エンコード処理簡素化）",
      "パフォーマンス監視効率化（5分間隔更新）"
    ]
  },
  {
    id: "2025-06-04-v1",
    version: "1.9.0",
    date: "2025年6月4日",
    title: "管理者権限強化とパフォーマンス改善",
    description: "管理者専用機能のセキュリティを強化し、システム全体のパフォーマンスを大幅に改善しました。データベースキャッシュとクエリ最適化により、トピック一覧の読み込み速度が向上しています。",
    features: [
      "管理者専用タブ（削除済み・パフォーマンス）の権限制御を実装",
      "非管理者ユーザーには基本タブのみ表示",
      "データベースクエリのキャッシュシステム追加（30秒TTL）",
      "トピック一覧読み込みの大幅な高速化",
      "パフォーマンス監視ダッシュボードでリアルタイム統計表示",
      "説明欄を任意入力に変更してユーザビリティ向上",
      "聞きたいボタンのアイコンを耳マークに変更"
    ]
  },
  {
    id: "2025-05-31-v4",
    version: "1.8.0",
    date: "2025年5月31日",
    title: "ブックマークレット機能の追加",
    description: "ワンクリックで現在のWebページをネタとして投稿できるブックマークレット機能を実装しました。気になったページをすぐに投稿でき、ユーザーの利便性が大幅に向上します。",
    features: [
      "ブックマークレットジェネレーターをホームページに追加",
      "ページタイトル・URL・説明文を自動取得",
      "投稿者名を事前設定して専用ブックマークレット生成",
      "投稿フォームでURLパラメータからの事前入力対応",
      "他のWebページから直接投稿可能"
    ]
  },
  {
    id: "2025-05-31-v3",
    version: "1.7.0",
    date: "2025年5月31日",
    title: "マークダウンリスト出力機能の追加",
    description: "管理画面の採用タブに、採用済みトピックをマークダウン形式のリストでクリップボードにコピーできる機能を追加しました。ポッドキャスト番組ノートの作成が簡単になります。",
    features: [
      "採用タブにマークダウンリスト出力ボタンを追加",
      "採用済みトピックを箇条書き形式で出力",
      "タイトルとURLがマークダウンリンク形式",
      "採用時刻順でソートされたリスト生成",
      "ワンクリックでクリップボードにコピー"
    ]
  },
  {
    id: "2025-05-31-v2",
    version: "1.6.0",
    date: "2025年5月31日",
    title: "重複URL投稿防止機能の追加",
    description: "同じURLの重複投稿を防ぐ機能を実装しました。重複時には既存の投稿情報（タイトル・投稿者名）を表示し、ユーザーに分かりやすくフィードバックします。",
    features: [
      "重複URL投稿防止機能の実装",
      "重複時の詳細なエラーメッセージ表示",
      "既存投稿情報（タイトル・投稿者）の表示",
      "投稿フォームのエラーハンドリング強化",
      "データ品質の向上"
    ]
  },
  {
    id: "2025-05-31",
    version: "1.5.0",
    date: "2025年5月31日",
    title: "応援機能と採用時刻ソート機能の追加",
    description: "「聞きたい」応援ボタンを導入し、リスナーの要望をより明確に表現できるようになりました。また、管理画面で採用時刻順にソートする機能と文字エンコーディング対応を強化しました。",
    features: [
      "「聞きたい」応援ボタンに変更（ハートアイコン）",
      "聞きたい票数順でのトピック自動ソート",
      "採用時刻での管理画面ソート機能",
      "Shift-JIS等の日本語文字エンコーディング対応",
      "より直感的なユーザーインターフェース"
    ]
  },
  {
    id: "2025-05-25",
    version: "1.4.0",
    date: "2025年5月25日",
    title: "Googleニュース対応とURL処理の強化",
    description: "Googleニュースのリンクを検出して元記事のURLを入力できる機能を追加しました。また、リダイレクトURLの処理を改善し、より正確なコンテンツ情報の取得が可能になりました。",
    features: [
      "Googleニュースリンクの検出機能",
      "元記事URLを手動入力できるインターフェース",
      "リダイレクトURL対応の強化",
      "URL情報取得の安定性向上",
      "エラーメッセージの改善"
    ]
  },
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
    ]
  },
  {
    id: "2025-05-23",
    version: "1.2.0",
    date: "2025年5月23日",
    title: "トピック管理機能の強化",
    description: "管理者向け機能を強化し、トピックの削除機能を追加しました。削除操作は確認ダイアログで誤操作を防止し、削除時は関連するコメントや聞きたい投票も同時に削除されます。",
    features: [
      "管理者がトピックを削除できる機能を追加",
      "削除前に確認ダイアログを表示",
      "関連するコメントや聞きたい投票を一括削除",
      "WebSocketでリアルタイム反映",
      "お知らせ機能の追加"
    ]
  },
  {
    id: "2025-05-15",
    version: "1.1.0",
    date: "2025年5月15日",
    title: "WebSocketによるリアルタイム更新",
    description: "アプリケーション全体にWebSocketを導入し、複数ユーザー間でのリアルタイム更新を実現しました。トピックの投稿、ステータス変更、コメント、聞きたい投票などの操作がリアルタイムに他のユーザーにも反映されます。",
    features: [
      "WebSocketによるリアルタイム更新機能",
      "複数デバイス間での同期",
      "自動再接続機能の実装",
      "聞きたい機能の強化"
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
      "聞きたい（スター）機能",
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

// 全ての未読リリースを既読にマーク
export function markAllUnreadAsRead() {
  const unreadReleases = getUnreadReleases();
  if (unreadReleases.length > 0) {
    const unreadIds = unreadReleases.map(note => note.id);
    markReleasesAsRead(unreadIds);
  }
}
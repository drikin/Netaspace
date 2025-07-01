// アプリケーション全体のバージョン管理
export const APP_VERSION = '2.9.0';
export const EXTENSION_VERSION = '2.1.1';

// バージョン情報を取得する関数
export function getVersionInfo() {
  return {
    app: APP_VERSION,
    extension: EXTENSION_VERSION,
    releaseDate: '2025-07-01'
  };
}
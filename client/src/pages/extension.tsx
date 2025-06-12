import { ExtensionInstaller } from '@/components/extension-installer';
import { BookmarkletGenerator } from '@/components/bookmarklet-generator';

export default function ExtensionPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Chrome拡張機能
          </h1>
          <p className="text-lg text-gray-600">
            ワンクリックでネタを投稿できる便利な拡張機能をインストールしましょう
          </p>
        </div>
        
        <ExtensionInstaller />
        
        <div className="mt-12 grid md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-3">主な機能</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• ページタイトルとURLの自動取得</li>
              <li>• ページ説明文の自動抽出</li>
              <li>• 投稿者名とサーバーURLの保存</li>
              <li>• ワンクリックでの簡単投稿</li>
              <li>• 安全なフィンガープリント生成</li>
            </ul>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-3">動作環境</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Google Chrome（推奨）</li>
              <li>• Microsoft Edge（Chromium版）</li>
              <li>• その他Chromium系ブラウザ</li>
              <li>• デベロッパーモードが有効</li>
            </ul>
          </div>
        </div>

        {/* ブックマークレットセクションを最下部に追加 */}
        <div className="mt-12">
          <BookmarkletGenerator />
        </div>
      </div>
    </div>
  );
}
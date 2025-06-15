import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Download, Chrome, CheckCircle, ExternalLink, Copy } from 'lucide-react';

export function ExtensionInstaller() {
  const [step, setStep] = useState(1);
  const [copied, setCopied] = useState(false);

  const serverUrl = window.location.origin;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const downloadExtension = () => {
    // Create a zip file download link
    const link = document.createElement('a');
    link.href = '/api/extension/download';
    link.download = 'backspace-fm-extension.zip';
    link.click();
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Chrome className="h-6 w-6" />
          Chrome拡張機能のインストール
        </CardTitle>
        <CardDescription>
          ワンクリックでネタを投稿できるChrome拡張機能をインストールしましょう
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step 1: Download */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant={step >= 1 ? "default" : "secondary"}>1</Badge>
            <h3 className="text-lg font-semibold">拡張機能をダウンロード</h3>
            {step > 1 && <CheckCircle className="h-5 w-5 text-green-500" />}
          </div>
          
          <Button 
            onClick={downloadExtension}
            className="w-full"
            disabled={step > 1}
          >
            <Download className="mr-2 h-4 w-4" />
            拡張機能をダウンロード
          </Button>
          
          {step === 1 && (
            <Button 
              variant="outline" 
              onClick={() => setStep(2)}
              className="w-full"
            >
              ダウンロード済み - 次へ
            </Button>
          )}
        </div>

        {/* Step 2: Install */}
        {step >= 2 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant={step >= 2 ? "default" : "secondary"}>2</Badge>
              <h3 className="text-lg font-semibold">Chrome拡張機能をインストール</h3>
              {step > 2 && <CheckCircle className="h-5 w-5 text-green-500" />}
            </div>
            
            <div className="space-y-2 text-sm">
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Chromeで <code className="bg-gray-100 px-2 py-1 rounded">chrome://extensions/</code> を開く</li>
                <li>右上の「デベロッパーモード」をオンにする</li>
                <li>「パッケージ化されていない拡張機能を読み込む」をクリック</li>
                <li>ダウンロードした <code>chrome-extension</code> フォルダを選択</li>
              </ol>
            </div>

            <Alert>
              <AlertDescription>
                拡張機能が正常に読み込まれると、ツールバーにBackspace.fmのアイコンが表示されます。
              </AlertDescription>
            </Alert>

            {step === 2 && (
              <Button 
                variant="outline" 
                onClick={() => setStep(3)}
                className="w-full"
              >
                インストール完了 - 次へ
              </Button>
            )}
          </div>
        )}

        {/* Step 3: Setup */}
        {step >= 3 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="default">3</Badge>
              <h3 className="text-lg font-semibold">初期設定</h3>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">サーバーURL</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 bg-gray-100 px-3 py-2 rounded text-sm">
                    {serverUrl}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(serverUrl)}
                  >
                    {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Alert>
                <AlertDescription>
                  1. ツールバーのBackspace.fmアイコンをクリック<br/>
                  2. 上記のサーバーURLを設定欄に貼り付け<br/>
                  3. お好みの投稿者名を入力<br/>
                  4. 設定完了！
                </AlertDescription>
              </Alert>
            </div>
          </div>
        )}

        {/* Usage Guide */}
        {step >= 3 && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-3">使用方法</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline">1</Badge>
                <span>ネタにしたいページを開く</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">2</Badge>
                <span>ツールバーのBackspace.fmアイコンをクリック</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">3</Badge>
                <span>内容を確認・編集して投稿</span>
              </div>
            </div>
          </div>
        )}

        {/* Alternative Installation */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-3">手動インストール</h3>
          <p className="text-sm text-gray-600 mb-3">
            上記の方法でうまくいかない場合は、GitHubから直接ダウンロードできます。
          </p>
          <Button variant="outline" className="w-full">
            <ExternalLink className="mr-2 h-4 w-4" />
            GitHubで拡張機能を見る
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
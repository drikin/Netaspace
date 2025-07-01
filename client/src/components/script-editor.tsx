import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Save, RefreshCw, Copy, Check } from "lucide-react";
import { Week, Script } from "@shared/schema";

// Default script template
const DEFAULT_SCRIPT_TEMPLATE = `# backspace.fm 第XXX回 台本

## ✔︎指差し確認

- [ ] 音声チェック
- [ ] riverside録音スタート
- [ ] YouTubeストリームが正しいことを確認
- [ ] YTライブ開始
- [ ] YTライブ停止
- [ ] 次回カレンダー更新
- [ ] ライブページ更新
- [ ] YTライブ予約
- [ ] 即日配信
- [ ] アフターショー配信

## 今週の台本

＜パン＞

こんにちは、backspace.fm 第XXX回です。
backspace.fmは、AIアーティストの松尾、サンフランシスコ在住のプロ散財家ドリキン、テクニカルジャーナリストの西川善司が時折ゲストを交えながら、毎週、今一番気になることについて話し合うポッドキャスト番組です。

### 今週の一言
**松尾さん**：「＜今週のひとことからの＞ 松尾です。今週もよろしくお願いします。」
**ドリキン**：「＜今週のひとことからの＞ ドリキンです。今週もよろしくお願いします。」
**善司さん**：「＜今週のひとことからの＞ 西川善司です。今週もよろしくお願いします。」

### ゲスト回の時
今週は○○さんをゲストに迎えております。
（ゲストさん紹介一言コメント）

では○○さん簡単に自己紹介をお願いします！
(ここからゲストさんスピーチ開始)

## 番組について
この番組はポッドキャストとYouTubeにて配信しています。
ぜひ番組についての感想やフィードバックをSNSやYouTubeにてコメントください！

この番組はフェンリル株式会社の提供でお届けしております。

フェンリルではこれまで 400 社、600 本以上のアプリを開発しており、
AppStore1位となったものや、ダウンロード数100万本以上のアプリも多数開発しています。
iOS、Android アプリなどモバイルアプリ開発の依頼はフェンリルまでお願いします。

またbackspace.fmをより楽しんでいただくためにBSMという月額有料サービスも行っています。
こちらではアーカイブの即日配信やBSM限定コンテンツなどの特典だけでなく
Discordによる限定コミュニティーも盛り上がっています。
我々の活動サポートにもなりますので、ぜひ登録をご検討ください。

最後に、このポッドキャストの収録はRiverside.fmを利用してリモート収録しています。
Riversideはポッドキャストに特化したリモート収録サービスです。

詳しい情報はポッドキャストやYouTubeの概要欄に記載しています。ぜひチェックしてみてください！

## 告知
話す人と、聴く人。
その間に、さくらインターネットのデジタルインフラサービスがあります。
「『やりたいこと』を『できる』に変える」の企業理念のもと、お客さまのご要望にお応えする多様なサービスを開発し、あらゆる分野に対応するDXソリューションを提案します。

### 5月イベント情報
5月15日（木）さくらのAI Meetup vol.10「MCP」東京支社32F

5月23日（金）さくらのテックナイト in 那覇〜さくらのクラウド編〜inobase沖縄

詳しい情報などがさくらさんの公式Xなどを参考にしてください
https://x.com/sakura_users

---

## 今週のネタ

### 採用ネタ一覧
[採用されたネタのリストがここに表示されます]

---

＜ここからフリートーク＞

---

## エンディング
今週もbackspace.fmをお聞きいただきありがとうございました。

バックスペース主催のSNSコミュニティー、グルドンはさくらインターネットのサポートを受けて運用しています。

さくらインターネットは、1996年創業のインターネット企業です。個人から法人、文教・公共分野まで、さまざまなお客さまのニーズに合わせ、「さくらのレンタルサーバ」「さくらのVPS」「さくらのクラウド」などのクラウドコンピューティングサービスを自社運営の国内のデータセンターを生かし提供しています。「『やりたいこと』を『できる』に変える」の理念のもと、あらゆる分野に対応するDXソリューションを提案します。

今回、番組中に紹介したネタのリンクなどはエピソードの概要欄から参照できます。
ぜひこちらも活用してください！

また来週お楽しみに！
今週も長時間お付き合いいただきありがとうございました。

＜パン＞`;

export const ScriptEditor: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch active week
  const { data: activeWeek } = useQuery<Week>({
    queryKey: ["/api/weeks/active"],
    queryFn: () => apiRequest("GET", "/api/weeks/active"),
  });

  // Fetch script for active week
  const { data: script, isLoading } = useQuery<Script>({
    queryKey: ["/api/scripts", activeWeek?.id],
    queryFn: () => apiRequest("GET", `/api/scripts/week/${activeWeek?.id}`),
    enabled: !!activeWeek?.id,
  });

  // Initialize content when script loads
  useEffect(() => {
    if (script) {
      setContent(script.content);
    } else if (activeWeek && !isLoading) {
      // Use default template if no script exists
      generateDefaultScript();
    }
  }, [script, activeWeek, isLoading]);

  // Save script mutation
  const saveScriptMutation = useMutation({
    mutationFn: (data: { weekId: number; content: string }) => {
      return apiRequest("POST", "/api/scripts", data);
    },
    onSuccess: () => {
      toast({
        title: "台本を保存しました",
        description: "台本が正常に保存されました。",
      });
      setIsEditing(false);
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["/api/scripts", activeWeek?.id] });
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "台本の保存に失敗しました。",
        variant: "destructive",
      });
    },
  });

  const generateDefaultScript = async () => {
    if (!activeWeek) return;

    try {
      // Fetch featured topics for the active week
      const topics = await apiRequest("GET", `/api/topics?weekId=${activeWeek.id}&status=featured`);
      
      // Generate topic list
      const topicList = topics.map((topic: any) => 
        `- [${topic.title}](${topic.url}) by ${topic.submitter}`
      ).join('\n');

      // Replace placeholders in template
      let generatedScript = DEFAULT_SCRIPT_TEMPLATE
        .replace(/第XXX回/g, activeWeek.title)
        .replace('[採用されたネタのリストがここに表示されます]', topicList || '（まだ採用されたネタはありません）');

      setContent(generatedScript);
      setHasChanges(true);
    } catch (error) {
      console.error("Failed to generate script:", error);
      setContent(DEFAULT_SCRIPT_TEMPLATE);
      setHasChanges(true);
    }
  };

  const handleSave = () => {
    if (!activeWeek?.id || !hasChanges) return;
    saveScriptMutation.mutate({ weekId: activeWeek.id, content });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast({
        title: "コピーしました",
        description: "台本をクリップボードにコピーしました。",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "エラー",
        description: "コピーに失敗しました。",
        variant: "destructive",
      });
    }
  };

  const handleRegenerate = () => {
    if (window.confirm("台本を再生成しますか？現在の内容は失われます。")) {
      generateDefaultScript();
    }
  };

  if (!activeWeek) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-gray-500">
            アクティブな週が設定されていません。
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>{activeWeek.title} - 台本</CardTitle>
        <div className="flex gap-2">
          <Button
            onClick={handleRegenerate}
            variant="outline"
            size="sm"
            disabled={saveScriptMutation.isPending}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            再生成
          </Button>
          <Button
            onClick={handleCopy}
            variant="outline"
            size="sm"
          >
            {copied ? (
              <Check className="w-4 h-4 mr-2" />
            ) : (
              <Copy className="w-4 h-4 mr-2" />
            )}
            {copied ? "コピー済み" : "コピー"}
          </Button>
          {isEditing ? (
            <>
              <Button
                onClick={() => {
                  setIsEditing(false);
                  setContent(script?.content || "");
                  setHasChanges(false);
                }}
                variant="outline"
                size="sm"
              >
                キャンセル
              </Button>
              <Button
                onClick={handleSave}
                size="sm"
                disabled={!hasChanges || saveScriptMutation.isPending}
              >
                {saveScriptMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                保存
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setIsEditing(true)}
              size="sm"
            >
              編集
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : isEditing ? (
          <Textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setHasChanges(true);
            }}
            className="min-h-[600px] font-mono text-sm text-gray-900 bg-white"
            placeholder="台本を入力してください..."
          />
        ) : (
          <div className="prose prose-sm max-w-none">
            <pre className="whitespace-pre-wrap bg-gray-50 p-4 rounded-lg overflow-x-auto text-gray-900 font-medium leading-relaxed text-base">
              {content || "台本がまだ作成されていません。"}
            </pre>
          </div>
        )}
        {script && (
          <div className="mt-4 text-xs text-gray-500">
            最終更新: {new Date(script.updatedAt).toLocaleString('ja-JP')}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
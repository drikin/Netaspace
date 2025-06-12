import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface BookmarkletGeneratorProps {
  className?: string;
}

export function BookmarkletGenerator({ className }: BookmarkletGeneratorProps) {
  const [submitterName, setSubmitterName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  // Get the current domain for the bookmarklet
  const currentDomain = typeof window !== 'undefined' ? window.location.origin : '';

  // Generate the bookmarklet code
  const generateBookmarkletCode = (name: string) => {
    const bookmarkletCode = `(function(){var title=document.title||'';var url=window.location.href;var description='';var metaDesc=document.querySelector('meta[name="description"]');if(metaDesc){description=metaDesc.content||'';}if(!description){var firstP=document.querySelector('p');if(firstP){description=firstP.textContent.substring(0,200)+'...';}}var submissionUrl='${currentDomain}/submit?'+'title='+encodeURIComponent(title)+'&url='+encodeURIComponent(url)+'&description='+encodeURIComponent(description)+'&submitter='+encodeURIComponent('${name}');window.open(submissionUrl,'_blank');})();`;

    return `javascript:${bookmarkletCode}`;
  };

  const copyBookmarkletToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast({
        title: "コピーしました",
        description: "ブックマークレットをクリップボードにコピーしました。ブラウザのブックマークとして保存してください。",
      });
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast({
        title: "エラー",
        description: "クリップボードへのコピーに失敗しました。",
        variant: "destructive",
      });
    }
  };

  const handleGenerateBookmarklet = () => {
    if (!submitterName.trim()) {
      toast({
        title: "エラー",
        description: "投稿者名を入力してください。",
        variant: "destructive",
      });
      return;
    }

    const bookmarkletCode = generateBookmarkletCode(submitterName);
    copyBookmarkletToClipboard(bookmarkletCode);
    setIsDialogOpen(false);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          ブックマークレット
        </CardTitle>
        <CardDescription>
          ワンクリックで現在のページをネタとして投稿できるブックマークレットを生成します
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">ブックマークレットを生成</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>ブックマークレット生成</DialogTitle>
              <DialogDescription>
                投稿者名を入力してブックマークレットを生成してください
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="submitter-name">投稿者名</Label>
                <Input
                  id="submitter-name"
                  placeholder="あなたの名前"
                  value={submitterName}
                  onChange={(e) => setSubmitterName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleGenerateBookmarklet();
                    }
                  }}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Button onClick={handleGenerateBookmarklet} className="w-full">
                  生成してコピー
                </Button>
                <p className="text-xs text-muted-foreground">
                  生成されたコードがクリップボードにコピーされます。
                  ブラウザのブックマークバーに貼り付けて保存してください。
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">使い方：</h4>
          <ol className="text-sm text-muted-foreground space-y-1">
            <li>1. 上のボタンをクリックして投稿者名を設定</li>
            <li>2. 生成されたコードをブラウザのブックマークとして保存</li>
            <li>3. 投稿したいページでブックマークをクリック</li>
            <li>4. 投稿フォームが自動的に開きます</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
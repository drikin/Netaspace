import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TopicWithCommentsAndStars, Week } from "@shared/schema";
import { generateMarkdown } from "@/lib/markdown";
import { FileText, Clipboard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MarkdownExportProps {
  week: Week;
  topics: TopicWithCommentsAndStars[];
}

const MarkdownExport: React.FC<MarkdownExportProps> = ({ week, topics }) => {
  const { toast } = useToast();
  const [showMarkdown, setShowMarkdown] = useState(false);
  const markdown = generateMarkdown(week, topics);

  const handleExport = () => {
    setShowMarkdown(true);
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(markdown).then(
      () => {
        toast({
          title: "クリップボードにコピーしました",
          description: "Markdownテキストをクリップボードにコピーしました",
        });
      },
      (err) => {
        console.error("Could not copy text: ", err);
        toast({
          title: "コピーに失敗しました",
          description: "テキストのコピーに失敗しました。もう一度お試しください。",
          variant: "destructive",
        });
      }
    );
  };

  return (
    <div className="mt-8 px-4 sm:px-0">
      <Card className="border border-gray-200">
        <CardContent className="p-4 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900">管理者ツール</h2>
          <p className="mt-1 text-sm text-gray-500">
            今週のネタをMarkdownフォーマットでエクスポートします
          </p>

          <div className="mt-4 flex space-x-3">
            <Button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <FileText className="h-4 w-4 mr-1" />
              Markdownで出力
            </Button>
            {showMarkdown && (
              <Button
                type="button"
                onClick={handleCopyToClipboard}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                <Clipboard className="h-4 w-4 mr-1" />
                クリップボードにコピー
              </Button>
            )}
          </div>

          {showMarkdown && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <pre className="text-xs text-gray-800 overflow-x-auto whitespace-pre-wrap">
                {markdown}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MarkdownExport;

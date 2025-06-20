import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const KeyboardShortcutsDialog: React.FC<KeyboardShortcutsDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const shortcuts = [
    {
      key: "N",
      description: "新しいトピックを投稿",
      context: "全ページ",
    },
    {
      key: "Tab",
      description: "表示順を切り替え（聞きたい順 ⇔ 新しい順）",
      context: "メインページ",
    },
    {
      key: "Esc",
      description: "メインページに戻る",
      context: "投稿ページ",
    },
    {
      key: "?",
      description: "このヘルプを表示（英数の ? キー）",
      context: "全ページ",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            キーボードショートカット
          </DialogTitle>
          <DialogDescription>
            利用可能なキーボードショートカットの一覧です
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left pb-2 font-medium text-sm text-muted-foreground">キー</th>
                <th className="text-left pb-2 font-medium text-sm text-muted-foreground">機能</th>
                <th className="text-left pb-2 font-medium text-sm text-muted-foreground">対象</th>
              </tr>
            </thead>
            <tbody>
              {shortcuts.map((shortcut, index) => (
                <tr key={index} className="border-b last:border-0">
                  <td className="py-3">
                    <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">
                      {shortcut.key}
                    </kbd>
                  </td>
                  <td className="py-3 text-sm">{shortcut.description}</td>
                  <td className="py-3 text-sm text-muted-foreground">
                    {shortcut.context}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KeyboardShortcutsDialog;
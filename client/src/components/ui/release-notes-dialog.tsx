import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Sparkles, Layout, Zap, X, Globe, Settings } from 'lucide-react';
import { APP_VERSION } from '@shared/version';

interface ReleaseNotesDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReleaseNotesDialog({ isOpen, onClose }: ReleaseNotesDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="bg-gradient-to-r from-pink-500 to-orange-500 p-2 rounded-full">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                新機能のお知らせ
              </DialogTitle>
              <Badge variant="secondary" className="mt-1">
                v{APP_VERSION}
              </Badge>
            </div>
          </div>
          <DialogDescription>
            日本語サイトの文字化け問題を解決しました！
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* New Features */}
          <div className="space-y-3">
            <div className="flex items-start space-x-3 p-3 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
              <div className="bg-gradient-to-r from-blue-500 to-green-500 p-1 rounded-full mt-0.5">
                <Globe className="h-3 w-3 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-sm text-gray-900">
                  🌏 SHIFT-JIS文字化け解決
                </h4>
                <p className="text-xs text-gray-600 mt-1">
                  ITMediaなどの日本語サイトの文字化けを完全解決。SHIFT-JIS、EUC-JP対応
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="bg-purple-500 p-1 rounded-full mt-0.5">
                <Settings className="h-3 w-3 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-sm text-gray-900">
                  🔧 エンコーディング自動検出
                </h4>
                <p className="text-xs text-gray-600 mt-1">
                  HTTPヘッダーとHTMLメタタグから文字セットを自動識別・変換
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="bg-green-500 p-1 rounded-full mt-0.5">
                <Zap className="h-3 w-3 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-sm text-gray-900">
                  ✅ 技術基盤強化
                </h4>
                <p className="text-xs text-gray-600 mt-1">
                  モダンAPI対応とパフォーマンス最適化を実施
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="bg-purple-500 p-1 rounded-full mt-0.5">
                <Zap className="h-3 w-3 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-sm text-gray-900">
                  ⚡ 65%高速化
                </h4>
                <p className="text-xs text-gray-600 mt-1">
                  データベース最適化により、ページ読み込みが大幅に高速化されました
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100">
          <Button 
            variant="outline" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="flex items-center space-x-1"
          >
            <span>確認しました</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function useReleaseNotification() {
  const [showDialog, setShowDialog] = useState(false);
  
  useEffect(() => {
    try {
      const lastSeenVersion = localStorage.getItem('lastSeenVersion');
      
      if (lastSeenVersion !== APP_VERSION) {
        // Show notification after a short delay for better UX
        const timer = setTimeout(() => {
          setShowDialog(true);
        }, 2000);
        return () => clearTimeout(timer);
      }
    } catch (error) {
      console.error('Error in useReleaseNotification:', error);
    }
  }, []);

  const handleClose = () => {
    try {
      setShowDialog(false);
      localStorage.setItem('lastSeenVersion', APP_VERSION);
    } catch (error) {
      console.error('Error closing dialog:', error);
    }
  };

  return {
    showDialog,
    handleClose
  };
}
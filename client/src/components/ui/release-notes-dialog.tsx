import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Sparkles, Layout, Zap, X } from 'lucide-react';
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
            backspace.fmのネタ帳がさらに使いやすくなりました！
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* New Features */}
          <div className="space-y-3">
            <div className="flex items-start space-x-3 p-3 bg-gradient-to-r from-pink-50 to-orange-50 rounded-lg border border-pink-200">
              <div className="bg-gradient-to-r from-pink-500 to-orange-500 p-1 rounded-full mt-0.5">
                <Sparkles className="h-3 w-3 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-sm text-gray-900">
                  ✨ 投票ボタンの大幅リニューアル
                </h4>
                <p className="text-xs text-gray-600 mt-1">
                  グラデーション、アニメーション、パーティクル効果でより楽しく投票できます
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="bg-green-500 p-1 rounded-full mt-0.5">
                <Zap className="h-3 w-3 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-sm text-gray-900">
                  🚀 人気度ビジュアル表示
                </h4>
                <p className="text-xs text-gray-600 mt-1">
                  投票数に応じて背景色が緑色に変化。人気のネタが一目でわかります
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="bg-blue-500 p-1 rounded-full mt-0.5">
                <Layout className="h-3 w-3 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-sm text-gray-900">
                  📱 レイアウト最適化
                </h4>
                <p className="text-xs text-gray-600 mt-1">
                  よりコンパクトで見やすいカードデザインに改善しました
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
      console.log('Last seen version:', lastSeenVersion, 'Current version:', APP_VERSION);
      
      // For testing - clear localStorage to always show dialog
      localStorage.removeItem('lastSeenVersion');
      
      if (lastSeenVersion !== APP_VERSION) {
        // Show notification after a short delay for better UX
        const timer = setTimeout(() => {
          console.log('Showing release dialog');
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
      console.log('Closing release dialog');
      setShowDialog(false);
      localStorage.setItem('lastSeenVersion', APP_VERSION);
      console.log('Saved version to localStorage:', APP_VERSION);
    } catch (error) {
      console.error('Error closing dialog:', error);
    }
  };

  return {
    showDialog,
    handleClose
  };
}
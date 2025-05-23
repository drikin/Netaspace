import React, { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ReleaseNote, releaseNotes, getReadReleases, markReleasesAsRead } from '@/lib/release-notes';
import { Badge } from '@/components/ui/badge';
import { Bell, Check, Info } from 'lucide-react';

interface ReleaseNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialReleaseId?: string; // 最初に表示するリリースID
}

export function ReleaseNotesDialog({
  open,
  onOpenChange,
  initialReleaseId,
}: ReleaseNotesDialogProps) {
  const [selectedReleaseId, setSelectedReleaseId] = useState<string | undefined>(initialReleaseId);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // 初期表示時、選択がなければ最新のリリースを選択
  useEffect(() => {
    if (open && !isLoaded) {
      setIsLoaded(true);
      if (!selectedReleaseId && releaseNotes.length > 0) {
        setSelectedReleaseId(releaseNotes[0].id);
      }
    }
  }, [open, selectedReleaseId, isLoaded]);
  
  // ダイアログが閉じられるとき、表示したリリースを既読にする
  useEffect(() => {
    if (!open && isLoaded && selectedReleaseId) {
      markReleasesAsRead([selectedReleaseId]);
    }
  }, [open, selectedReleaseId, isLoaded]);
  
  // 選択されたリリースノートを取得
  const selectedRelease = releaseNotes.find(note => note.id === selectedReleaseId);
  
  // 既読済みリリースIDリスト
  const readReleases = getReadReleases();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Info className="h-5 w-5" />
            リリースノート
          </DialogTitle>
          <DialogDescription>
            アプリケーションの更新履歴と新機能のお知らせです
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col sm:flex-row gap-4 flex-1 overflow-hidden mt-4">
          {/* リリース一覧（サイドバー） */}
          <div className="w-full sm:w-1/3 border-r pr-2">
            <ScrollArea className="h-[300px] sm:h-[400px]">
              <div className="space-y-2 pr-3">
                {releaseNotes.map((note) => {
                  const isSelected = note.id === selectedReleaseId;
                  const isRead = readReleases.includes(note.id);
                  
                  return (
                    <Button
                      key={note.id}
                      variant={isSelected ? "default" : "ghost"}
                      className={`w-full justify-start py-2 px-3 h-auto text-left ${
                        isSelected ? "" : "hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                      onClick={() => setSelectedReleaseId(note.id)}
                    >
                      <div className="flex flex-col items-start">
                        <div className="flex items-center w-full justify-between">
                          <span className="font-medium truncate">{note.version}</span>
                          {!isRead && (
                            <Badge variant="default" className="ml-2 bg-blue-500">新着</Badge>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{note.date}</span>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
          
          {/* リリースノート詳細 */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {selectedRelease ? (
              <ScrollArea className="flex-1">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold">{selectedRelease.title}</h3>
                    <div className="flex items-center mt-1 gap-2">
                      <Badge variant="outline" className="bg-gray-100">v{selectedRelease.version}</Badge>
                      <span className="text-sm text-gray-500">{selectedRelease.date}</span>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 dark:text-gray-300">
                    {selectedRelease.description}
                  </p>
                  
                  <div>
                    <h4 className="font-semibold mb-2">新機能</h4>
                    <ul className="space-y-1 list-disc pl-5">
                      {selectedRelease.features.map((feature, index) => (
                        <li key={index} className="text-gray-700 dark:text-gray-300">
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </ScrollArea>
            ) : (
              <div className="flex items-center justify-center h-full">
                リリースを選択してください
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter className="mt-4">
          <Button onClick={() => onOpenChange(false)}>
            <Check className="h-4 w-4 mr-2" />
            閉じる
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ReleaseNotesButton() {
  const [open, setOpen] = useState(false);
  const unreadCount = releaseNotes.filter(note => !getReadReleases().includes(note.id)).length;
  
  return (
    <>
      <Button 
        variant="ghost" 
        size="sm" 
        className="relative"
        onClick={() => setOpen(true)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </Button>
      
      <ReleaseNotesDialog 
        open={open} 
        onOpenChange={setOpen} 
      />
    </>
  );
}
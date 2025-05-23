import { useEffect, useState } from 'react';
import { ReleaseNotesDialog } from '@/components/ui/release-notes-dialog';
import { releaseNotes, getReadReleases, markReleasesAsRead } from '@/lib/release-notes';

const WELCOME_SHOWN_KEY = 'backspace-welcome-shown';

export function WelcomeNotification() {
  const [showDialog, setShowDialog] = useState(false);
  
  useEffect(() => {
    // ローカルストレージから表示済みフラグを確認
    const hasShownWelcome = localStorage.getItem(WELCOME_SHOWN_KEY) === 'true';
    const readReleases = getReadReleases();
    
    // 新規リリースがあり、まだウェルカムメッセージを表示していない場合
    const hasNewReleases = releaseNotes.some(note => !readReleases.includes(note.id));
    
    // 新着のリリースがあり、まだウェルカムモーダルを表示していない場合は表示
    if (hasNewReleases && !hasShownWelcome) {
      // 少し遅延させて表示（ページの読み込み完了後）
      const timer = setTimeout(() => {
        setShowDialog(true);
        // 表示したフラグを保存
        localStorage.setItem(WELCOME_SHOWN_KEY, 'true');
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);
  
  // ダイアログを閉じたときの処理
  const handleClose = () => {
    setShowDialog(false);
    
    // 最新のリリースを既読に設定
    if (releaseNotes.length > 0) {
      markReleasesAsRead([releaseNotes[0].id]);
    }
  };
  
  return (
    <ReleaseNotesDialog
      open={showDialog}
      onOpenChange={handleClose}
      initialReleaseId={releaseNotes.length > 0 ? releaseNotes[0].id : undefined}
    />
  );
}
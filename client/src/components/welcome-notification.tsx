import { ReleaseNotesDialog, useReleaseNotification } from '@/components/ui/release-notes-dialog';

export function WelcomeNotification() {
  const { showDialog, handleClose } = useReleaseNotification();
  
  return (
    <ReleaseNotesDialog
      isOpen={showDialog}
      onClose={handleClose}
    />
  );
}
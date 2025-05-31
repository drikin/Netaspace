import React, { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Trash2, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AdminControlsProps {
  topicId: number;
  onTopicDeleted: () => void;
}

const AdminControls: React.FC<AdminControlsProps> = ({
  topicId,
  onTopicDeleted,
}) => {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const handleDeleteTopic = async () => {
    setIsDeleting(true);
    try {
      const response = await apiRequest("DELETE", `/api/topics/${topicId}`);
      
      if (!response.ok) {
        throw new Error('Failed to delete topic');
      }
      
      toast({
        title: "トピック削除完了",
        description: "トピックが削除されました",
      });
      
      onTopicDeleted(); // リストを更新
    } catch (error) {
      console.error("Failed to delete topic:", error);
      toast({
        title: "削除エラー",
        description: "トピックの削除に失敗しました。もう一度お試しください。",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <div className="mt-4 flex justify-end">
        <Button
          variant="ghost"
          className="px-3 py-2 text-sm font-medium rounded-md flex items-center bg-red-50 text-red-700 hover:bg-red-100"
          disabled={isDeleting}
          onClick={() => setShowDeleteDialog(true)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          削除
        </Button>
      </div>
      
      {/* 削除確認ダイアログ */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-red-600">
              <AlertTriangle className="h-5 w-5 mr-2" />
              トピックを削除しますか？
            </AlertDialogTitle>
            <AlertDialogDescription>
              このトピックを完全に削除します。この操作は取り消せません。関連するコメントやいいねもすべて削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>キャンセル</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteTopic}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? '削除中...' : '削除する'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AdminControls;

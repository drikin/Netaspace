import React, { useState, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Trash2, AlertTriangle, Star } from "lucide-react";
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
  currentStatus: string;
  onStatusChange: () => void;
}

const AdminControls: React.FC<AdminControlsProps> = ({
  topicId,
  currentStatus,
  onStatusChange,
}) => {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    if (isUpdating) return;

    // 現在のステータスと同じボタンをクリックした場合は保留に戻す
    const finalStatus = currentStatus === newStatus ? "pending" : newStatus;

    setIsUpdating(true);
    try {
      await apiRequest("PATCH", `/api/topics/${topicId}/status`, {
        status: finalStatus,
      });

      const statusDisplayName = {
        pending: "保留",
        featured: "採用"
      }[finalStatus] || finalStatus;

      toast({
        title: "ステータス変更完了",
        description: `トピックのステータスを「${statusDisplayName}」に変更しました`,
      });

      onStatusChange();
    } catch (error) {
      console.error("Failed to update topic status:", error);
      toast({
        title: "ステータス変更エラー",
        description: "もう一度お試しください",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
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
      
      onStatusChange(); // リストを更新
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

  const getButtonClassName = (status: string) => {
    const baseClass = "px-3 py-2 text-sm font-medium rounded-md flex items-center";
    
    if (currentStatus === status) {
      if (status === "featured") {
        return `${baseClass} bg-blue-100 text-blue-800`;
      }
    }
    
    return `${baseClass} bg-gray-100 text-gray-800 hover:bg-gray-200`;
  };

  return (
    <>
      <div className="mt-4 flex justify-between items-center">
        <div className="flex gap-2">
          <Button
            variant="ghost"
            className={getButtonClassName("featured")}
            disabled={isUpdating}
            onClick={() => handleStatusChange("featured")}
          >
            <Star className="h-4 w-4 mr-2" />
            採用
          </Button>
        </div>
        
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
              このトピックを完全に削除します。この操作は取り消せません。関連するコメントや聞きたい投票もすべて削除されます。
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

// Memoize AdminControls to prevent unnecessary re-renders
export default React.memo(AdminControls, (prevProps, nextProps) => {
  return (
    prevProps.topicId === nextProps.topicId &&
    prevProps.currentStatus === nextProps.currentStatus
  );
});

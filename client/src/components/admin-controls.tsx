import React, { useState, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Trash2, AlertTriangle, Star } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

  return (
    <>
      <div className="flex gap-1 justify-end">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`h-6 w-6 p-0 rounded-full transition-colors ${
                currentStatus === "featured"
                  ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              disabled={isUpdating}
              onClick={() => handleStatusChange("featured")}
            >
              <Star className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{currentStatus === "featured" ? "採用を取り消す" : "採用する"}</p>
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              disabled={isDeleting}
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>削除</p>
          </TooltipContent>
        </Tooltip>
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

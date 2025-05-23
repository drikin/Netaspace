import React, { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Check, X, Star, Trash2, AlertTriangle } from "lucide-react";
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

    setIsUpdating(true);
    try {
      await apiRequest("PATCH", `/api/topics/${topicId}/status`, {
        status: newStatus,
      });

      toast({
        title: "ステータス変更完了",
        description: `トピックのステータスを「${newStatus}」に変更しました`,
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
    const baseClass = "px-2 py-1 text-xs font-medium rounded-md flex items-center";
    
    if (currentStatus === status) {
      switch (status) {
        case "approved":
          return `${baseClass} bg-green-100 text-green-800`;
        case "rejected":
          return `${baseClass} bg-red-100 text-red-800`;
        case "featured":
          return `${baseClass} bg-blue-100 text-blue-800`;
        default:
          return `${baseClass} bg-gray-100 text-gray-800`;
      }
    }
    
    return `${baseClass} bg-gray-100 text-gray-800 hover:bg-gray-200`;
  };

  return (
    <>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="ghost"
          className={getButtonClassName("approved")}
          disabled={isUpdating}
          onClick={() => handleStatusChange("approved")}
        >
          <Check className="h-3 w-3 mr-1" />
          承認
        </Button>
        <Button
          variant="ghost"
          className={getButtonClassName("rejected")}
          disabled={isUpdating}
          onClick={() => handleStatusChange("rejected")}
        >
          <X className="h-3 w-3 mr-1" />
          非採用
        </Button>
        <Button
          variant="ghost"
          className={getButtonClassName("featured")}
          disabled={isUpdating}
          onClick={() => handleStatusChange("featured")}
        >
          <Star className="h-3 w-3 mr-1" />
          採用
        </Button>
        
        <Button
          variant="ghost"
          className="px-2 py-1 text-xs font-medium rounded-md flex items-center bg-red-50 text-red-700 hover:bg-red-100"
          disabled={isDeleting}
          onClick={() => setShowDeleteDialog(true)}
        >
          <Trash2 className="h-3 w-3 mr-1" />
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

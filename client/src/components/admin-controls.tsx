import React, { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Check, X, Star } from "lucide-react";

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

  const handleStatusChange = async (newStatus: string) => {
    if (isUpdating) return;

    setIsUpdating(true);
    try {
      await apiRequest("PATCH", `/api/topics/${topicId}/status`, {
        status: newStatus,
      });

      toast({
        title: "Status updated",
        description: `Topic has been marked as ${newStatus}`,
      });

      onStatusChange();
    } catch (error) {
      console.error("Failed to update topic status:", error);
      toast({
        title: "Error updating status",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
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
    <div className="mt-4 flex space-x-2">
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
    </div>
  );
};

export default AdminControls;

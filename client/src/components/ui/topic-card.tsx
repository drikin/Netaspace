import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import CommentsList from "./comments-list";
import CommentForm from "./comment-form";
import AdminControls from "../admin-controls";
import { useFingerprint } from "@/hooks/use-fingerprint";
import { TopicWithCommentsAndStars } from "@shared/schema";

interface TopicCardProps {
  topic: TopicWithCommentsAndStars;
  isAdmin?: boolean;
  refetchTopics: () => void;
}

const TopicCard: React.FC<TopicCardProps> = ({
  topic,
  isAdmin = false,
  refetchTopics,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fingerprint = useFingerprint();
  const [isStarring, setIsStarring] = useState(false);
  const [starsCount, setStarsCount] = useState(topic.starsCount);
  const [hasStarred, setHasStarred] = useState(topic.hasStarred || false);

  const handleStarClick = async () => {
    if (hasStarred || isStarring || !fingerprint) return;

    setIsStarring(true);
    try {
      const response = await apiRequest("POST", `/api/topics/${topic.id}/star`, {
        fingerprint,
      });

      const data = await response.json();

      setStarsCount(data.starsCount);
      setHasStarred(true);
      toast({
        title: "Topic starred!",
        description: "Thanks for your feedback.",
      });
    } catch (error) {
      console.error("Failed to star topic:", error);
      toast({
        title: "Could not star topic",
        description: "You may have already starred this topic.",
        variant: "destructive",
      });
    } finally {
      setIsStarring(false);
    }
  };

  const getStatusBadge = () => {
    if (!topic.status || topic.status === "pending") {
      return (
        <span className="status-badge pending ml-2">未確認</span>
      );
    } else if (topic.status === "approved") {
      return (
        <span className="status-badge approved ml-2">承認</span>
      );
    } else if (topic.status === "featured") {
      return (
        <span className="status-badge featured ml-2">採用</span>
      );
    } else if (topic.status === "rejected") {
      return (
        <span className="status-badge rejected ml-2">非採用</span>
      );
    }
    return null;
  };

  const formatDate = (dateString: Date) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start">
          {/* Topic content */}
          <div className="flex-1">
            <div className="flex items-center">
              <h2 className="text-xl font-semibold text-gray-900">{topic.title}</h2>
              {getStatusBadge()}
            </div>
            <div className="mt-1">
              <a
                href={topic.url}
                className="text-primary hover:text-primary-700 text-sm flex items-center"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Link className="mr-1 h-4 w-4" />
                {topic.url}
              </a>
            </div>
            <div className="mt-3 text-gray-700">
              <p>{topic.description}</p>
            </div>
            <div className="mt-4 flex items-center text-sm text-gray-500">
              <span className="mr-4 flex items-center">
                <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                投稿者: {topic.submitter}
              </span>
              <span className="flex items-center">
                <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formatDate(topic.createdAt)}
              </span>
            </div>
          </div>

          {/* Star button */}
          <button
            className={`star-button ml-4 ${hasStarred ? "starred" : ""} ${isStarring ? "opacity-50 cursor-not-allowed" : ""}`}
            onClick={handleStarClick}
            disabled={isStarring || hasStarred}
            aria-label={hasStarred ? "Already starred" : "Star this topic"}
          >
            <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill={hasStarred ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <span className="text-xs mt-1">{starsCount}</span>
          </button>
        </div>

        {/* Admin controls */}
        {isAdmin && (
          <AdminControls
            topicId={topic.id}
            currentStatus={topic.status}
            onStatusChange={refetchTopics}
          />
        )}

        {/* Comments section */}
        <div className="mt-6 border-t border-gray-100 pt-4">
          <h3 className="text-sm font-medium text-gray-900">
            コメント ({topic.comments?.length || 0})
          </h3>
          <CommentsList
            topicId={topic.id}
            comments={topic.comments || []}
          />

          {/* Comment form */}
          <CommentForm
            topicId={topic.id}
            onCommentAdded={refetchTopics}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default TopicCard;

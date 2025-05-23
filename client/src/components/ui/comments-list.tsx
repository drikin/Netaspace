import React from "react";
import { Comment } from "@shared/schema";

interface CommentsListProps {
  topicId: number;
  comments: Comment[];
}

const CommentsList: React.FC<CommentsListProps> = ({ topicId, comments }) => {
  if (!comments || comments.length === 0) {
    return (
      <div className="mt-2 space-y-0">
        <div className="py-3 text-sm text-gray-500 italic">
          まだコメントはありません。最初のコメントを投稿しましょう！
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-0">
      {comments.map((comment, index) => (
        <div 
          key={comment.id} 
          className={`py-3 ${index < comments.length - 1 ? 'border-b border-gray-100' : ''}`}
        >
          <div className="font-medium text-sm text-gray-800">{comment.name}</div>
          <div className="text-sm text-gray-600 mt-1">{comment.content}</div>
        </div>
      ))}
    </div>
  );
};

export default CommentsList;

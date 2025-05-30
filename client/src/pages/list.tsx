import { useQuery } from "@tanstack/react-query";
import { TopicWithCommentsAndStars } from "@shared/schema";
import { ExternalLink, Star } from "lucide-react";
import { useFingerprint } from "@/hooks/use-fingerprint";

export default function List() {
  const fingerprint = useFingerprint();

  const { data: activeWeek, isLoading: isLoadingWeek } = useQuery({
    queryKey: ["/api/weeks/active"],
    enabled: !!fingerprint,
  });

  const { data: weekWithTopics, isLoading: isLoadingTopics } = useQuery({
    queryKey: ["/api/weeks/active/topics"],
    enabled: !!activeWeek?.id && !!fingerprint,
  });

  const topics = weekWithTopics?.topics || [];

  if (isLoadingWeek || isLoadingTopics) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="bg-gray-200 h-16 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!topics || topics.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">ネタがありません</h2>
          <p className="text-gray-600">まだネタが投稿されていません。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">ネタ一覧</h1>
        <p className="text-gray-600">タイトルとURLの一覧表示</p>
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="divide-y divide-gray-200">
          {topics.map((topic: TopicWithCommentsAndStars) => (
            <div key={topic.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-medium text-gray-900 mb-2 truncate">
                    {topic.title}
                  </h3>
                  
                  {topic.url && (
                    <div className="flex items-center text-sm text-gray-500 mb-2">
                      <ExternalLink className="h-4 w-4 mr-1 flex-shrink-0" />
                      <a 
                        href={topic.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:text-blue-600 truncate"
                      >
                        {topic.url}
                      </a>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span className="flex items-center">
                      <Star className="h-4 w-4 mr-1" />
                      {topic.starsCount}
                    </span>
                    <span>{topic.comments?.length || 0} コメント</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      topic.status === 'approved' ? 'bg-green-100 text-green-800' :
                      topic.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {topic.status === 'approved' ? '承認済み' :
                       topic.status === 'rejected' ? '却下' : '審査中'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
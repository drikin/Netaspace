import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TopicCard from "@/components/ui/topic-card";
import { useFingerprint } from "@/hooks/use-fingerprint";
import { formatDateRange } from "@/lib/date-utils";
import { Week } from "@shared/schema";

const Archive: React.FC = () => {
  const fingerprint = useFingerprint();
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);

  // Fetch all weeks
  const { data: weeks, isLoading: isLoadingWeeks } = useQuery({
    queryKey: ["/api/weeks"],
  });

  // Fetch selected week data with topics when a week is selected
  const { data: selectedWeek, refetch: refetchSelectedWeek } = useQuery({
    queryKey: ["/api/weeks", selectedWeekId, fingerprint],
    enabled: !!selectedWeekId && !!fingerprint,
  });

  // Check if user is authenticated and is admin
  const { data: auth } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  const isAdmin = auth?.user?.isAdmin;

  // Select the first week if none is selected and weeks are loaded
  React.useEffect(() => {
    if (weeks && weeks.length > 0 && !selectedWeekId) {
      setSelectedWeekId(weeks[0].id);
    }
  }, [weeks, selectedWeekId]);

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 sm:px-0 mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">アーカイブ</h1>
        <p className="mt-1 text-sm text-gray-600">
          過去の週のネタ一覧を閲覧できます
        </p>
      </div>

      {isLoadingWeeks ? (
        // Loading state for weeks
        <Card>
          <CardContent className="p-6">
            <div className="h-12 bg-gray-200 rounded w-full animate-pulse"></div>
          </CardContent>
        </Card>
      ) : !weeks || weeks.length === 0 ? (
        // Empty state
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-500">アーカイブされた週はありません</p>
          </CardContent>
        </Card>
      ) : (
        // Weeks and topics
        <div>
          <Tabs
            value={selectedWeekId?.toString() || ""}
            onValueChange={(value) => setSelectedWeekId(parseInt(value))}
            className="w-full"
          >
            <TabsList className="mb-6 w-full h-auto flex flex-wrap">
              {weeks.map((week: Week) => (
                <TabsTrigger
                  key={week.id}
                  value={week.id.toString()}
                  className="py-2 px-4 m-1"
                >
                  {formatDateRange(week.startDate, week.endDate)}
                  {week.isActive && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                      現在
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {weeks.map((week: Week) => (
              <TabsContent key={week.id} value={week.id.toString()}>
                {selectedWeek && selectedWeek.id === week.id ? (
                  <div className="space-y-6">
                    {selectedWeek.topics && selectedWeek.topics.length > 0 ? (
                      selectedWeek.topics.map((topic) => (
                        <TopicCard
                          key={topic.id}
                          topic={topic}
                          isAdmin={isAdmin}
                          refetchTopics={refetchSelectedWeek}
                        />
                      ))
                    ) : (
                      <Card>
                        <CardContent className="p-6 text-center">
                          <p className="text-gray-500">
                            この週にはトピックがありません
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="bg-white rounded-lg shadow overflow-hidden p-6 animate-pulse"
                      >
                        <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
                        <div className="h-16 bg-gray-200 rounded w-full"></div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default Archive;

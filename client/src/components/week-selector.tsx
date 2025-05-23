import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { PlusIcon } from "lucide-react";
import { Week } from "@shared/schema";
import { formatDateRange } from "@/lib/date-utils";

interface WeekSelectorProps {
  week: Week | null;
  isLoading?: boolean;
}

const WeekSelector: React.FC<WeekSelectorProps> = ({ week, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="px-4 sm:px-0 mb-6 flex justify-between items-center">
        <div>
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-5 w-32 mt-1 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-0 mb-6 flex justify-between items-center">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">今週のネタ候補</h1>
        {week ? (
          <p className="mt-1 text-sm text-gray-600">
            {formatDateRange(week.startDate, week.endDate)}
          </p>
        ) : (
          <p className="mt-1 text-sm text-gray-600">
            アクティブな週がありません
          </p>
        )}
      </div>
      <Link href="/submit">
        <Button
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          ネタを投稿
        </Button>
      </Link>
    </div>
  );
};

export default WeekSelector;

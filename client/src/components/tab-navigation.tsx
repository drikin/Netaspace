import React, { useState } from "react";

interface TabNavigationProps {
  onTabChange: (tab: string) => void;
  activeTab: string;
}

const TabNavigation: React.FC<TabNavigationProps> = ({ onTabChange, activeTab }) => {
  const tabs = [
    { id: "all", label: "すべて" },
    { id: "featured", label: "採用済み" },
    { id: "pending", label: "未確認" },
  ];

  return (
    <div className="px-4 sm:px-0 mb-4 border-b border-gray-200">
      <div className="flex -mb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`${
              activeTab === tab.id
                ? "border-primary text-primary-700"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            } mr-8 py-4 px-1 border-b-2 font-medium text-sm`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TabNavigation;

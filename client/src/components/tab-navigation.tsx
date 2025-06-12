import React, { useState } from "react";

interface TabNavigationProps {
  onTabChange: (tab: string) => void;
  activeTab: string;
  isAdmin?: boolean;
  isAuthenticated?: boolean;
}

const TabNavigation: React.FC<TabNavigationProps> = ({ onTabChange, activeTab, isAdmin = false, isAuthenticated = false }) => {
  const publicTabs = [
    { id: "all", label: "すべて" },
  ];
  
  const authenticatedTabs = [
    { id: "featured", label: "採用" },
  ];
  
  const adminTabs = [
    { id: "performance", label: "パフォーマンス" },
  ];
  
  let tabs = publicTabs;
  if (isAuthenticated) {
    tabs = [...publicTabs, ...authenticatedTabs];
  }
  if (isAdmin) {
    tabs = [...tabs, ...adminTabs];
  }

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

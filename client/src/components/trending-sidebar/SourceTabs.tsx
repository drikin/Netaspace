import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Source {
  id: string;
  name: string;
  icon?: string;
}

interface SourceTabsProps {
  sources: Source[];
  selectedSource: string;
  onSourceChange: (sourceId: string) => void;
}

const SourceTabs: React.FC<SourceTabsProps> = ({ sources, selectedSource, onSourceChange }) => {
  const allSources = [
    { id: 'all', name: 'すべて', icon: '📱' },
    ...sources
  ];

  return (
    <div className="flex gap-1 overflow-x-auto pb-2">
      {allSources.map((source) => (
        <Button
          key={source.id}
          variant={selectedSource === source.id ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onSourceChange(source.id)}
          className={cn(
            'h-7 px-3 text-xs font-medium whitespace-nowrap',
            selectedSource === source.id && 'shadow-sm'
          )}
        >
          {source.icon && <span className="mr-1">{source.icon}</span>}
          {source.name}
        </Button>
      ))}
    </div>
  );
};

export default SourceTabs;
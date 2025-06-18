import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Sparkles, Layout, Zap, X, Globe, Settings, Smartphone, Palette, Container, BookOpen } from 'lucide-react';
import { APP_VERSION } from '@shared/version';
import { releaseNotes, getUnreadReleases } from '@/lib/release-notes';

interface ReleaseNotesDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReleaseNotesDialog({ isOpen, onClose }: ReleaseNotesDialogProps) {
  // Get the latest release note
  const latestRelease = releaseNotes.find(note => note.version === APP_VERSION);
  
  // Feature icon mapping
  const getFeatureIcon = (feature: string) => {
    if (feature.includes('📱') || feature.includes('モバイル')) return Smartphone;
    if (feature.includes('🎨') || feature.includes('クリーン') || feature.includes('デザイン')) return Palette;
    if (feature.includes('🐳') || feature.includes('Docker')) return Container;
    if (feature.includes('📚') || feature.includes('ガイドライン')) return BookOpen;
    if (feature.includes('🔧') || feature.includes('⚡')) return Zap;
    return Settings;
  };

  // Feature background color mapping
  const getFeatureStyle = (feature: string, index: number) => {
    const styles = [
      { bg: 'bg-gradient-to-r from-pink-50 to-orange-50', border: 'border-pink-200', iconBg: 'bg-gradient-to-r from-pink-500 to-orange-500' },
      { bg: 'bg-purple-50', border: 'border-purple-200', iconBg: 'bg-purple-500' },
      { bg: 'bg-blue-50', border: 'border-blue-200', iconBg: 'bg-blue-500' },
      { bg: 'bg-green-50', border: 'border-green-200', iconBg: 'bg-green-500' },
      { bg: 'bg-indigo-50', border: 'border-indigo-200', iconBg: 'bg-indigo-500' },
      { bg: 'bg-yellow-50', border: 'border-yellow-200', iconBg: 'bg-yellow-500' },
    ];
    return styles[index % styles.length];
  };

  if (!latestRelease) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="bg-gradient-to-r from-pink-500 to-orange-500 p-2 rounded-full">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                新機能のお知らせ
              </DialogTitle>
              <Badge variant="secondary" className="mt-1">
                v{APP_VERSION}
              </Badge>
            </div>
          </div>
          <DialogDescription>
            {latestRelease.description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* New Features */}
          <div className="space-y-3">
            {latestRelease.features.map((feature, index) => {
              const IconComponent = getFeatureIcon(feature);
              const style = getFeatureStyle(feature, index);
              
              // Extract emoji and title from feature string
              const match = feature.match(/^([\p{Emoji_Presentation}\p{Extended_Pictographic}]*)\s*(.+?)(\s+\((.+)\))?$/u);
              const emoji = match?.[1] || '';
              const title = match?.[2] || feature;
              const description = match?.[4] || '';

              return (
                <div key={index} className={`flex items-start space-x-3 p-3 ${style.bg} rounded-lg border ${style.border}`}>
                  <div className={`${style.iconBg} p-1 rounded-full mt-0.5`}>
                    <IconComponent className="h-3 w-3 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm text-gray-900">
                      {feature}
                    </h4>
                    {description && (
                      <p className="text-xs text-gray-600 mt-1">
                        {description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100">
          <Button 
            variant="outline" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="flex items-center space-x-1"
          >
            <span>確認しました</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function useReleaseNotification() {
  const [showDialog, setShowDialog] = useState(false);
  
  useEffect(() => {
    try {
      const lastSeenVersion = localStorage.getItem('lastSeenVersion');
      
      if (lastSeenVersion !== APP_VERSION) {
        // Show notification after a short delay for better UX
        const timer = setTimeout(() => {
          setShowDialog(true);
        }, 2000);
        return () => clearTimeout(timer);
      }
    } catch (error) {
      console.error('Error in useReleaseNotification:', error);
    }
  }, []);

  const handleClose = () => {
    try {
      setShowDialog(false);
      localStorage.setItem('lastSeenVersion', APP_VERSION);
    } catch (error) {
      console.error('Error closing dialog:', error);
    }
  };

  return {
    showDialog,
    handleClose
  };
}
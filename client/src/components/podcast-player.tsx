import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Shuffle, 
  Repeat,
  Volume2,
  Podcast
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PodcastEpisode {
  id: string;
  title: string;
  description: string;
  pubDate: string;
  audioUrl: string;
  duration: number;
  episodeNumber: string;
}

type PlayMode = 'single' | 'continuous' | 'random';

export const PodcastPlayer: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Player state
  const [currentEpisode, setCurrentEpisode] = useState<PodcastEpisode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playMode, setPlayMode] = useState<PlayMode>('single');
  const [playedEpisodes, setPlayedEpisodes] = useState<Set<string>>(new Set());
  
  // Fetch episodes
  const { data: episodes = [], isLoading } = useQuery<PodcastEpisode[]>({
    queryKey: ['/api/podcast/episodes'],
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
  
  // Auto-select latest episode when episodes load
  useEffect(() => {
    if (episodes.length > 0 && !currentEpisode) {
      setCurrentEpisode(episodes[0]); // First episode is the latest
    }
  }, [episodes, currentEpisode]);
  
  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Play/Pause
  const togglePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };
  
  // Play specific episode
  const playEpisode = (episode: PodcastEpisode) => {
    setCurrentEpisode(episode);
    setIsPlaying(true);
    setPlayedEpisodes(prev => new Set(prev).add(episode.id));
  };
  
  // Next episode
  const playNext = useCallback(() => {
    if (!episodes.length) return;
    
    const currentIndex = currentEpisode ? episodes.findIndex(ep => ep.id === currentEpisode.id) : -1;
    
    if (playMode === 'random') {
      // Find unplayed episodes
      const unplayed = episodes.filter(ep => !playedEpisodes.has(ep.id));
      if (unplayed.length === 0) {
        // All played, reset and play random
        setPlayedEpisodes(new Set());
        const randomIndex = Math.floor(Math.random() * episodes.length);
        playEpisode(episodes[randomIndex]);
      } else {
        // Play random unplayed
        const randomIndex = Math.floor(Math.random() * unplayed.length);
        playEpisode(unplayed[randomIndex]);
      }
    } else {
      // For continuous or single mode
      let nextIndex: number;
      if (currentIndex === -1) {
        // No episode selected, start from first
        nextIndex = 0;
      } else {
        // Get next episode
        nextIndex = (currentIndex + 1) % episodes.length;
      }
      
      playEpisode(episodes[nextIndex]);
    }
  }, [episodes, currentEpisode, playMode, playedEpisodes]);
  
  // Previous episode
  const playPrevious = () => {
    if (!episodes.length) return;
    
    const currentIndex = episodes.findIndex(ep => ep.id === currentEpisode?.id);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : episodes.length - 1;
    playEpisode(episodes[prevIndex]);
  };
  
  // Handle audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration || 0);
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      if (playMode !== 'single') {
        playNext();
      }
    };
    
    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };
    
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [playNext, playMode]);
  
  // Update audio source
  useEffect(() => {
    if (!audioRef.current || !currentEpisode) return;
    
    audioRef.current.src = currentEpisode.audioUrl;
    audioRef.current.load();
    
    if (isPlaying) {
      audioRef.current.play().catch(console.error);
    }
  }, [currentEpisode, isPlaying]);
  
  // Cycle play modes
  const cyclePlayMode = () => {
    const modes: PlayMode[] = ['single', 'continuous', 'random'];
    const currentIndex = modes.indexOf(playMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setPlayMode(modes[nextIndex]);
  };
  
  // Seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };
  
  // Volume
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      setVolume(newVolume);
    }
  };
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4 w-64 xl:w-72 2xl:w-80">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-10 bg-gray-200 rounded mb-2"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden w-64 xl:w-72 2xl:w-80">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4">
        <div className="flex items-center gap-2">
          <Podcast className="w-5 h-5" />
          <h3 className="font-semibold">Backspace.fm ポッドキャスト</h3>
        </div>
      </div>
      
      <div className="p-4">
          {/* Current Episode */}
          {currentEpisode && (
            <div className="mb-4">
              <h4 className="font-medium text-sm mb-1 truncate">
                {currentEpisode.title}
              </h4>
              <div className="text-xs text-gray-500">
                {new Date(currentEpisode.pubDate).toLocaleDateString('ja-JP')}
              </div>
            </div>
          )}
          
          {/* Player Controls */}
          <div className="mb-4">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Button
                size="sm"
                variant="ghost"
                onClick={playPrevious}
                disabled={!episodes.length}
              >
                <SkipBack className="w-4 h-4" />
              </Button>
              
              <Button
                size="sm"
                onClick={togglePlayPause}
                disabled={!currentEpisode}
                className="w-12 h-12 rounded-full"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" />
                )}
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={playNext}
                disabled={!episodes.length}
              >
                <SkipForward className="w-4 h-4" />
              </Button>
              
              <Button
                size="sm"
                variant={playMode === 'random' ? 'default' : 'ghost'}
                onClick={cyclePlayMode}
                title={`再生モード: ${playMode === 'single' ? '単独' : playMode === 'continuous' ? '連続' : 'ランダム'}`}
              >
                {playMode === 'random' ? (
                  <Shuffle className="w-4 h-4" />
                ) : (
                  <Repeat className={cn(
                    "w-4 h-4",
                    playMode === 'continuous' && "text-purple-600"
                  )} />
                )}
              </Button>
            </div>
            
            {/* Progress Bar */}
            {currentEpisode && (
              <div className="mb-3">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            )}
            
            {/* Volume Control */}
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-gray-500" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                className="w-20 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
          
          {/* Episode List */}
          <div className="border-t pt-3">
            <h4 className="text-sm font-medium mb-2">エピソード一覧</h4>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {episodes.map(episode => (
                <div
                  key={episode.id}
                  className={cn(
                    "p-2 rounded cursor-pointer transition-colors text-sm",
                    currentEpisode?.id === episode.id
                      ? "bg-purple-100 text-purple-700"
                      : "hover:bg-gray-100"
                  )}
                  onClick={() => playEpisode(episode)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {episode.title}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(episode.pubDate).toLocaleDateString('ja-JP')}
                      </div>
                    </div>
                    <Play className="w-3 h-3 ml-2 flex-shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      
      {/* Hidden audio element */}
      <audio ref={audioRef} />
      
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          background: #9333ea;
          border-radius: 50%;
          cursor: pointer;
        }
        
        .slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          background: #9333ea;
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
};
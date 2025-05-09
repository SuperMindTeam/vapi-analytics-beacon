
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatDuration } from '@/utils/formatters';

interface AudioPlayerProps {
  audioUrl: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUrl }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  
  // Generate waveform bars for visualization
  const waveformBars = Array.from({ length: 40 }, (_, i) => {
    // Create random heights for visual effect
    const height = Math.max(20, Math.floor(Math.random() * 80));
    return { height };
  });

  useEffect(() => {
    // Create audio element
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    
    // Add event listeners
    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
    });
    
    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
    });
    
    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });
    
    audio.addEventListener('error', () => {
      toast.error("Failed to load audio recording");
      setIsPlaying(false);
    });
    
    // Cleanup function
    return () => {
      if (audio) {
        audio.pause();
        audio.src = '';
        audio.removeEventListener('loadedmetadata', () => {});
        audio.removeEventListener('timeupdate', () => {});
        audio.removeEventListener('ended', () => {});
        audio.removeEventListener('error', () => {});
      }
    };
  }, [audioUrl]);

  // Toggle play/pause
  const togglePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(error => {
        console.error("Error playing audio:", error);
        toast.error("Failed to play audio");
      });
      setIsPlaying(true);
    }
  };

  // Toggle mute
  const toggleMute = () => {
    if (!audioRef.current) return;
    
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // Handle waveform click to jump to position
  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !waveformRef.current) return;
    
    const waveformRect = waveformRef.current.getBoundingClientRect();
    const clickPosition = (e.clientX - waveformRect.left) / waveformRect.width;
    const newTime = clickPosition * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    
    if (!isPlaying) {
      togglePlayPause();
    }
  };

  // Format time (mm:ss)
  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-4 border-b bg-gray-50">
      <div className="flex flex-col">
        {/* Waveform visualization - clickable */}
        <div 
          ref={waveformRef}
          onClick={handleWaveformClick} 
          className="relative h-16 mb-2 flex items-center cursor-pointer"
          title="Click to seek"
        >
          {/* Static waveform bars */}
          <div className="absolute inset-0 flex items-center justify-between px-2">
            {waveformBars.map((bar, index) => {
              // Calculate if this bar is part of the progress
              const barPosition = index / waveformBars.length;
              const progress = duration > 0 ? currentTime / duration : 0;
              const isActive = barPosition < progress;
              
              return (
                <div
                  key={index}
                  className={`w-1.5 rounded-full ${
                    isActive ? 'bg-primary' : 'bg-gray-300'
                  }`}
                  style={{ height: `${bar.height}%` }}
                />
              );
            })}
          </div>
        </div>
        
        {/* Controls and time */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button 
              onClick={togglePlayPause}
              variant="outline" 
              size="sm"
              className="flex items-center gap-1"
            >
              {isPlaying ? 
                <><Pause className="h-4 w-4" /> Pause</> : 
                <><Play className="h-4 w-4" /> Play</>
              }
            </Button>
            
            <Button
              onClick={toggleMute}
              variant="ghost"
              size="sm"
              className="flex items-center"
            >
              {isMuted ? 
                <VolumeX className="h-4 w-4" /> : 
                <Volume2 className="h-4 w-4" />
              }
            </Button>
          </div>
          
          <div className="text-sm font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;

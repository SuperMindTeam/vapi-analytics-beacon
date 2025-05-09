
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, AudioWaveform } from 'lucide-react';
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
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  // Format time (mm:ss)
  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-4 border-b bg-black text-white">
      <div className="flex flex-col">
        {/* Waveform visualization */}
        <div className="relative h-10 mb-2">
          <AudioWaveform className="w-full h-full text-gray-500" />
          {/* Overlay progress bar */}
          <div 
            className="absolute top-0 left-0 h-full bg-black opacity-50"
            style={{ 
              width: `${duration ? (currentTime / duration) * 100 : 0}%`,
            }}
          ></div>
        </div>
        
        {/* Controls and time */}
        <div className="flex items-center justify-between">
          <Button 
            onClick={togglePlayPause}
            variant="outline" 
            size="sm"
            className="text-white border-white hover:bg-gray-800 flex items-center gap-1"
          >
            {isPlaying ? 
              <><Pause className="h-4 w-4" /> Pause</> : 
              <><Play className="h-4 w-4" /> Play Recording</>
            }
          </Button>
          <div className="text-sm text-white">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;

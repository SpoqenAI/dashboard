'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';

interface DemoVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVideoEvent?: (event: string, data?: any) => void;
}

// PERFORMANCE: Memoized feature data to prevent re-creation
const demoFeatures = [
  { time: 5, icon: '👋', label: 'AI Greeting' },
  { time: 15, icon: '❓', label: 'Lead Qualification' },
  { time: 30, icon: '💬', label: 'Objection Handling' },
  { time: 45, icon: '🔗', label: 'Webhook Integration' },
  { time: 60, icon: '📧', label: 'Email Summary' },
] as const;

export const DemoVideoModal = memo(({ isOpen, onClose, onVideoEvent }: DemoVideoModalProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // PERFORMANCE: Memoized callbacks to prevent re-renders
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const currentTime = video.currentTime;
    setCurrentTime(currentTime);
    setProgress((currentTime / video.duration) * 100);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
  }, []);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    onVideoEvent?.('demo_video_played', { timestamp: Date.now() });
  }, [onVideoEvent]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    const video = videoRef.current;
    if (video) {
      onVideoEvent?.('demo_video_paused', { currentTime: video.currentTime });
    }
  }, [onVideoEvent]);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    const video = videoRef.current;
    if (video) {
      onVideoEvent?.('demo_video_completed', { 
        duration: video.duration,
        completionRate: 100 
      });
    }
  }, [onVideoEvent]);

  // PERFORMANCE: Fixed memory leak with proper event listener cleanup
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isOpen) return;

    // Add event listeners
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    // CRITICAL: Cleanup function to prevent memory leaks
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, [isOpen, handleTimeUpdate, handleLoadedMetadata, handlePlay, handlePause, handleEnded]);

  // PERFORMANCE: Memoized control handlers
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * video.duration;
  }, []);

  const seekToTime = useCallback((time: number) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = time;
    }
  }, []);

  // PERFORMANCE: Memoized time formatter
  const formatTime = useCallback((time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Get current feature based on video time
  const currentFeature = demoFeatures.find((feature, index) => {
    const nextFeature = demoFeatures[index + 1];
    return currentTime >= feature.time && (!nextFeature || currentTime < nextFeature.time);
  }) || demoFeatures[0];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full bg-card/95 backdrop-blur-glass border border-white/20">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">
              Spoqen AI Receptionist Demo
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Video Player */}
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              poster="/demo-thumbnail.jpg"
              preload="metadata"
              playsInline
              muted={isMuted}
            >
              {/* Placeholder - In real implementation, add actual demo video */}
              <source src="/spoqen-demo.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            
            {/* Video Overlay for Demo Purposes */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 flex items-center justify-center">
              <div className="text-center text-white space-y-4">
                <div className="text-6xl">📞</div>
                <h3 className="text-2xl font-bold">AI Receptionist Demo</h3>
                <p className="text-lg opacity-90">See how Spoqen handles real customer calls</p>
                <Button 
                  size="lg" 
                  variant="neon" 
                  onClick={togglePlay}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Play Demo Video
                </Button>
              </div>
            </div>

            {/* Video Controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="space-y-2">
                {/* Progress Bar */}
                <div 
                  className="w-full h-2 bg-white/20 rounded-full cursor-pointer"
                  onClick={handleProgressClick}
                >
                  <div 
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                
                {/* Controls */}
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center space-x-3">
                    <Button variant="ghost" size="sm" onClick={togglePlay}>
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={toggleMute}>
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </Button>
                    <span className="text-sm">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>
                  
                  <Button variant="ghost" size="sm">
                    <Maximize className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Current Feature Highlight */}
          <div className="flex items-center justify-center space-x-2">
            <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
              <span className="mr-2">{currentFeature.icon}</span>
              {currentFeature.label}
            </Badge>
          </div>

          {/* Demo Features Timeline */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {demoFeatures.map((feature, index) => (
              <div 
                key={index}
                className={`p-3 rounded-lg border text-center cursor-pointer transition-all ${
                  currentTime >= feature.time 
                    ? 'bg-primary/20 border-primary/30 text-primary' 
                    : 'bg-card/20 border-white/10 text-muted-foreground hover:bg-card/30'
                }`}
                onClick={() => seekToTime(feature.time)}
              >
                <div className="text-2xl mb-1">{feature.icon}</div>
                <div className="text-xs font-medium">{feature.label}</div>
                <div className="text-xs opacity-75">{formatTime(feature.time)}</div>
              </div>
            ))}
          </div>

          {/* CTA Section */}
          <div className="text-center space-y-4 pt-4 border-t border-white/10">
            <h3 className="text-lg font-semibold">Ready to see this in action for your business?</h3>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="neon" size="lg" asChild>
                <a href="/signup">Start Free Trial</a>
              </Button>
              <Button variant="outline" size="lg">
                Schedule Live Demo
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

DemoVideoModal.displayName = 'DemoVideoModal'; 
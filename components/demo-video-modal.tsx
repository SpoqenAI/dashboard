'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';

interface DemoVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVideoEvent?: (event: string, data?: any) => void;
  posterSrc?: string;
  videoSrc?: string;
}

// PERFORMANCE: Memoized feature data to prevent re-creation
const demoFeatures = [
  { time: 5, icon: '👋', label: 'AI Greeting' },
  { time: 15, icon: '❓', label: 'Lead Qualification' },
  { time: 30, icon: '💬', label: 'Objection Handling' },
  { time: 45, icon: '🔗', label: 'Webhook Integration' },
  { time: 60, icon: '📧', label: 'Email Summary' },
] as const;

export const DemoVideoModal = memo(
  ({ isOpen, onClose, onVideoEvent, posterSrc = '', videoSrc = '' }: DemoVideoModalProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [progress, setProgress] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [videoError, setVideoError] = useState(false);

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
          completionRate: 100,
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
    }, [
      isOpen,
      handleTimeUpdate,
      handleLoadedMetadata,
      handlePlay,
      handlePause,
      handleEnded,
    ]);

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

    const handleProgressClick = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        const video = videoRef.current;
        if (!video) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        video.currentTime = pos * video.duration;
      },
      []
    );

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
    const currentFeature =
      demoFeatures.find((feature, index) => {
        const nextFeature = demoFeatures[index + 1];
        return (
          currentTime >= feature.time &&
          (!nextFeature || currentTime < nextFeature.time)
        );
      }) || demoFeatures[0];

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-full max-w-4xl border border-white/20 bg-card/95 backdrop-blur-glass">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold">
                Spoqen AI Receptionist Demo
              </DialogTitle>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Video Player */}
            <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
              {videoError ? (
                <div className="flex h-full w-full items-center justify-center bg-black text-white">
                  <p>Sorry, the demo video could not be loaded.</p>
                </div>
              ) : (
                <>
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                    poster={posterSrc}
                preload="metadata"
                playsInline
                muted={isMuted}
                    aria-describedby="demo-video-description"
                    onError={() => setVideoError(true)}
              >
                    <source src={videoSrc} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
                  {/* Visually hidden description for screen readers */}
                  <span id="demo-video-description" className="sr-only">
                    This video demonstrates the Spoqen AI Receptionist handling real customer calls, showcasing features such as call answering, customer interaction, and automated responses. The video provides an overview of how the AI system works in a business environment.
                  </span>
                </>
              )}

              {/* Video Overlay for Demo Purposes */}
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/60 via-transparent to-black/30">
                <div className="space-y-4 text-center text-white">
                  <div className="text-6xl">📞</div>
                  <h3 className="text-2xl font-bold">AI Receptionist Demo</h3>
                  <p className="text-lg opacity-90">
                    See how Spoqen handles real customer calls
                  </p>
                  <Button
                    size="lg"
                    variant="neon"
                    onClick={togglePlay}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Play className="mr-2 h-5 w-5" />
                    Play Demo Video
                  </Button>
                </div>
              </div>

              {/* Video Controls */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <div className="space-y-2">
                  {/* Progress Bar */}
                  <div
                    className="h-2 w-full cursor-pointer rounded-full bg-white/20"
                    onClick={handleProgressClick}
                  >
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-between text-white">
                    <div className="flex items-center space-x-3">
                      <Button variant="ghost" size="sm" onClick={togglePlay}>
                        {isPlaying ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={toggleMute}>
                        {isMuted ? (
                          <VolumeX className="h-4 w-4" />
                        ) : (
                          <Volume2 className="h-4 w-4" />
                        )}
                      </Button>
                      <span className="text-sm">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                    </div>

                    <Button variant="ghost" size="sm">
                      <Maximize className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Feature Highlight */}
            <div className="flex items-center justify-center space-x-2">
              <Badge
                variant="secondary"
                className="border-primary/30 bg-primary/20 text-primary"
              >
                <span className="mr-2">{currentFeature.icon}</span>
                {currentFeature.label}
              </Badge>
            </div>

            {/* Demo Features Timeline */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              {demoFeatures.map((feature, index) => (
                <div
                  key={index}
                  className={`cursor-pointer rounded-lg border p-3 text-center transition-all ${
                    currentTime >= feature.time
                      ? 'border-primary/30 bg-primary/20 text-primary'
                      : 'border-white/10 bg-card/20 text-muted-foreground hover:bg-card/30'
                  }`}
                  onClick={() => seekToTime(feature.time)}
                >
                  <div className="mb-1 text-2xl">{feature.icon}</div>
                  <div className="text-xs font-medium">{feature.label}</div>
                  <div className="text-xs opacity-75">
                    {formatTime(feature.time)}
                  </div>
                </div>
              ))}
            </div>

            {/* CTA Section */}
            <div className="space-y-4 border-t border-white/10 pt-4 text-center">
              <h3 className="text-lg font-semibold">
                Ready to see this in action for your business?
              </h3>
              <div className="flex flex-col justify-center gap-3 sm:flex-row">
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
  }
);

DemoVideoModal.displayName = 'DemoVideoModal';

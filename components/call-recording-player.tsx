'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Play,
  Pause,
  Volume2,
  Download,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger';

interface CallRecordingPlayerProps {
  callId: string;
  className?: string;
}

export function CallRecordingPlayer({
  callId,
  className,
}: CallRecordingPlayerProps) {
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Store handler refs to ensure stable references for add/removeEventListener
  const handleLoadedMetadataRef = useRef<(() => void) | undefined>(undefined);
  const handleTimeUpdateRef = useRef<(() => void) | undefined>(undefined);
  const handleEndedRef = useRef<(() => void) | undefined>(undefined);
  const handleErrorRef = useRef<((e: Event) => void) | undefined>(undefined);

  // Fetch recording URL
  useEffect(() => {
    const fetchRecording = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(
          `/api/vapi/call-recording?callId=${callId}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch recording');
        }

        if (data.recordingUrl) {
          setRecordingUrl(data.recordingUrl);
        } else {
          setError(data.message || 'No recording available for this call');
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load recording';
        setError(errorMessage);
        logger.error(
          'RECORDING_PLAYER',
          'Failed to fetch recording',
          err as Error,
          { callId }
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (callId) {
      fetchRecording();
    }
  }, [callId]);

  // Initialize audio element when recording URL is available
  useEffect(() => {
    if (recordingUrl && !audio) {
      const audioElement = new Audio(recordingUrl);

      handleLoadedMetadataRef.current = () => {
        setDuration(audioElement.duration);
      };
      handleTimeUpdateRef.current = () => {
        setCurrentTime(audioElement.currentTime);
      };
      handleEndedRef.current = () => {
        setIsPlaying(false);
      };
      handleErrorRef.current = (e: Event) => {
        setError('Failed to load audio file');
        logger.error(
          'RECORDING_PLAYER',
          'Audio load error',
          new Error('Audio load failed'),
          { callId, recordingUrl }
        );
      };

      audioElement.addEventListener(
        'loadedmetadata',
        handleLoadedMetadataRef.current!
      );
      audioElement.addEventListener('timeupdate', handleTimeUpdateRef.current!);
      audioElement.addEventListener('ended', handleEndedRef.current!);
      audioElement.addEventListener('error', handleErrorRef.current!);

      setAudio(audioElement);
    }

    return () => {
      if (audio) {
        audio.pause();
        // Remove the same handlers that were added
        if (handleLoadedMetadataRef.current)
          audio.removeEventListener(
            'loadedmetadata',
            handleLoadedMetadataRef.current
          );
        if (handleTimeUpdateRef.current)
          audio.removeEventListener('timeupdate', handleTimeUpdateRef.current);
        if (handleEndedRef.current)
          audio.removeEventListener('ended', handleEndedRef.current);
        if (handleErrorRef.current)
          audio.removeEventListener('error', handleErrorRef.current);
      }
    };
  }, [recordingUrl, audio, callId]);

  const togglePlayPause = () => {
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(err => {
          setError('Failed to play audio');
          logger.error('RECORDING_PLAYER', 'Audio play error', err, { callId });
        });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audio) return;
    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const downloadRecording = () => {
    if (!recordingUrl) return;

    const link = document.createElement('a');
    link.href = recordingUrl;
    link.download = `call-recording-${callId}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Download Started',
      description: 'The call recording download has started.',
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Call Recording
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2 text-sm text-muted-foreground">
              Loading recording...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Call Recording
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-center">
            <div>
              <AlertCircle className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!recordingUrl) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          Call Recording
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Audio Controls */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={togglePlayPause}
              className="flex items-center gap-2"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isPlaying ? 'Pause' : 'Play'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={downloadRecording}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTime / duration) * 100}%, #e5e7eb ${(currentTime / duration) * 100}%, #e5e7eb 100%)`,
              }}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

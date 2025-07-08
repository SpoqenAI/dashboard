'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, User, Bot, Clock } from 'lucide-react';

interface TranscriptMessage {
  role: 'user' | 'assistant' | 'system';
  message: string;
  time?: number;
}

interface CallTranscriptViewerProps {
  transcript: string;
  className?: string;
}

export function CallTranscriptViewer({
  transcript,
  className,
}: CallTranscriptViewerProps) {
  // Parse the transcript and filter out system messages
  const parseTranscript = (rawTranscript: string): TranscriptMessage[] => {
    try {
      // Try to parse as JSON first (structured format)
      const parsed = JSON.parse(rawTranscript);

      if (Array.isArray(parsed)) {
        // Filter out system messages and return only user/assistant conversation
        return parsed.filter(
          (msg: TranscriptMessage) =>
            msg.role === 'user' || msg.role === 'assistant'
        );
      }

      // If it's an object with transcript property
      if (parsed.transcript && Array.isArray(parsed.transcript)) {
        return parsed.transcript.filter(
          (msg: TranscriptMessage) =>
            msg.role === 'user' || msg.role === 'assistant'
        );
      }

      // If it's not structured, fall back to text parsing
      return parseTextTranscript(rawTranscript);
    } catch (error) {
      // If JSON parsing fails, try to parse as text
      return parseTextTranscript(rawTranscript);
    }
  };

  // Parse text-based transcript formats
  const parseTextTranscript = (text: string): TranscriptMessage[] => {
    // First, remove the system prompt section
    let cleanedText = text;

    // Find and remove system prompt (everything from "system:" until the first "bot:" or "user:")
    const systemPromptRegex =
      /system:\s*[\s\S]*?(?=(?:bot:|user:|assistant:|caller:))/i;
    cleanedText = cleanedText.replace(systemPromptRegex, '');

    const lines = cleanedText.split('\n').filter(line => line.trim());
    const messages: TranscriptMessage[] = [];

    for (const line of lines) {
      // Parse user messages
      if (
        line.toLowerCase().startsWith('user:') ||
        line.toLowerCase().startsWith('caller:')
      ) {
        messages.push({
          role: 'user',
          message: line.replace(/^(user:|caller:)/i, '').trim(),
        });
      }
      // Parse assistant/bot messages
      else if (
        line.toLowerCase().startsWith('bot:') ||
        line.toLowerCase().startsWith('assistant:') ||
        line.toLowerCase().startsWith('ai:')
      ) {
        messages.push({
          role: 'assistant',
          message: line.replace(/^(bot:|assistant:|ai:)/i, '').trim(),
        });
      }
      // If no prefix but has content, treat as continuation of previous message
      else if (line.trim() && messages.length > 0) {
        messages[messages.length - 1].message += ' ' + line.trim();
      }
    }

    return messages;
  };

  const formatTime = (seconds?: number): string => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const messages = parseTranscript(transcript);

  if (messages.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg text-foreground">
            Call Transcript
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <MessageSquare className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No conversation transcript available
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg text-foreground">
          <MessageSquare className="h-5 w-5" />
          Call Transcript ({messages.length} messages)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-96 space-y-4 overflow-y-auto">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${
                message.role === 'assistant' ? 'justify-start' : 'justify-end'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                    <Bot className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
              )}

              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'assistant'
                    ? 'bg-blue-50 text-blue-900'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <Badge
                    variant={
                      message.role === 'assistant' ? 'default' : 'secondary'
                    }
                    className="text-xs"
                  >
                    {message.role === 'assistant' ? (
                      <>
                        <Bot className="mr-1 h-3 w-3" />
                        Bot
                      </>
                    ) : (
                      <>
                        <User className="mr-1 h-3 w-3" />
                        Caller
                      </>
                    )}
                  </Badge>
                  {message.time && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatTime(message.time)}
                    </span>
                  )}
                </div>
                <p className="text-sm leading-relaxed">{message.message}</p>
              </div>

              {message.role === 'user' && (
                <div className="flex-shrink-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

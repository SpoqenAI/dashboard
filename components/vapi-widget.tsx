'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';

interface VapiWidgetProps {
  apiKey: string;
  assistantId: string;
  config?: Record<string, unknown>;
  inline?: boolean; // if true, render inline without fixed positioning
}

// Dynamically load the Vapi SDK on the client – avoids SSR issues.
let vapiSdkPromise: Promise<any> | null = null;
const loadVapiSdk = () => {
  if (!vapiSdkPromise) {
    vapiSdkPromise = import('@vapi-ai/web');
  }
  return vapiSdkPromise;
};

function VapiWidgetInner({
  apiKey,
  assistantId,
  config,
  inline = false,
}: VapiWidgetProps) {
  const [VapiClient, setVapiClient] = useState<any>(null);
  const vapiRef = useRef<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  // We intentionally avoid live transcript state to minimize re-renders

  // Load SDK once on mount
  useEffect(() => {
    let cancelled = false;

    loadVapiSdk().then(mod => {
      if (!cancelled) {
        setVapiClient(() => mod.default);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Instantiate Vapi when SDK ready
  useEffect(() => {
    if (!VapiClient) return;

    const instance = new VapiClient(apiKey, config);
    vapiRef.current = instance;

    // Define handlers
    const handleCallStart = () => setIsConnected(true);
    const handleCallEnd = () => {
      setIsConnected(false);
      setIsSpeaking(false);
    };
    const handleSpeechStart = () => setIsSpeaking(true);
    const handleSpeechEnd = () => setIsSpeaking(false);
    const handleError = (err: any) => console.error('Vapi error:', err);

    // Attach
    instance.on('call-start', handleCallStart);
    instance.on('call-end', handleCallEnd);
    instance.on('speech-start', handleSpeechStart);
    instance.on('speech-end', handleSpeechEnd);
    instance.on('error', handleError);

    // Aggressive cleanup – stop calls when tab hidden or on unmount
    const handleVisibilityChange = () => {
      if (document.hidden && instance) {
        instance.stop();
      }
    };
    const handleBeforeUnload = () => {
      if (instance) {
        instance.stop();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (instance) {
        instance.off('call-start', handleCallStart);
        instance.off('call-end', handleCallEnd);
        instance.off('speech-start', handleSpeechStart);
        instance.off('speech-end', handleSpeechEnd);
        instance.off('error', handleError);
        instance.stop();
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
    // Note: we intentionally exclude `config` from deps to avoid recreating the
    // Vapi instance on every render when callers pass an inline object.
  }, [VapiClient, apiKey]);

  const startCall = useCallback(() => {
    vapiRef.current?.start(assistantId);
  }, [assistantId]);

  const endCall = useCallback(() => {
    if (vapiRef.current) {
      vapiRef.current.stop();
    }
  }, []);

  // SDK not yet ready – render nothing
  if (!VapiClient) return null;

  return (
    <div
      className={`font-sans ${
        inline
          ? 'flex w-full justify-center'
          : 'fixed bottom-6 right-6 z-[1000]'
      }`}
    >
      {!isConnected ? (
        <button
          onClick={startCall}
          aria-label="Start a voice conversation with your AI assistant"
          className="rounded-full bg-teal-600 px-6 py-4 text-base font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl focus:outline-none"
        >
          🎤 Talk to Assistant
        </button>
      ) : (
        <div className="w-80 rounded-xl border border-gray-200 bg-white p-5 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`h-3 w-3 rounded-full ${isSpeaking ? 'animate-pulse bg-red-500' : 'bg-teal-600'}`}
              />
              <span className="font-semibold text-gray-800">
                {isSpeaking ? 'Assistant Speaking…' : 'Listening…'}
              </span>
            </div>
            <button
              onClick={endCall}
              aria-label="End the current voice call with your AI assistant"
              className="rounded-md bg-red-500 px-3 py-1 text-xs text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
            >
              End Call
            </button>
          </div>
          {/* Transcript UI removed for performance */}
        </div>
      )}
    </div>
  );
}

export default React.memo(VapiWidgetInner);

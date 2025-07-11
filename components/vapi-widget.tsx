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

    // Event listeners
    instance.on('call-start', () =>
      setIsConnected(prev => (prev ? prev : true))
    );
    instance.on('call-end', () => {
      setIsConnected(prev => (prev ? false : prev));
      setIsSpeaking(false);
    });
    instance.on('speech-start', () =>
      setIsSpeaking(prev => (prev ? prev : true))
    );
    instance.on('speech-end', () =>
      setIsSpeaking(prev => (prev ? false : prev))
    );
    // Skip live transcript updates for performance (they fire very frequently)
    instance.on('error', (err: any) => console.error('Vapi error:', err));

    // Aggressive cleanup – stop calls when tab hidden or on unmount
    const handleVisibilityChange = () => {
      if (document.hidden) {
        instance.stop();
      }
    };
    const handleBeforeUnload = () => {
      instance.stop();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      instance.stop();
    };
    // Note: we intentionally exclude `config` from deps to avoid recreating the
    // Vapi instance on every render when callers pass an inline object.
  }, [VapiClient, apiKey]);

  const startCall = useCallback(() => {
    vapiRef.current?.start(assistantId);
  }, [assistantId]);

  const endCall = useCallback(() => {
    vapiRef.current?.stop();
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
              className="rounded-md bg-red-500 px-3 py-1 text-xs text-white hover:bg-red-600"
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

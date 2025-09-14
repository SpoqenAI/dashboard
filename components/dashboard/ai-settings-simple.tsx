'use client';
import { memo, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { DEEPGRAM_VOICES } from '@/lib/vapi/voices';
import {
  Bot,
  Save,
  RefreshCw,
  Settings,
  Wand2,
  CheckCircle,
  Info,
  Upload,
} from 'lucide-react';
import { useUserSettings } from '@/hooks/use-user-settings';
import { toast } from '@/components/ui/use-toast';
import * as Sentry from '@sentry/nextjs';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

// Helper to replace agent name placeholder when available (no generic fallback)
function replaceAgentName(text: string, agentName?: string) {
  if (!text) return text;
  if (!agentName || agentName.trim().length === 0) return text;
  return text.replace(/{{AGENT_NAME}}/g, agentName.trim());
}
import { inferMimeFromFilename, isAllowedMime } from '@/lib/file-validation';
import dynamic from 'next/dynamic';
import rawPlan from '@/supabase/functions/_shared/vapi-assistant.plan.json';
import rawDefaults from '@/supabase/functions/_shared/vapi-assistant.defaults.json';
import type { Plan } from '@/types/plan';
import {
  stripTerminationPolicy,
  TERMINATION_POLICY_SENTINEL,
} from '@/lib/vapi/termination-policy';
const VapiWidget = dynamic(() => import('@/components/vapi-widget'), {
  ssr: false,
});

const { logger } = Sentry;

interface AISettingsTabProps {
  isUserFree: boolean;
}

interface AIAssistantData {
  id: string;
  name: string;
  firstMessage?: string;
  model?: {
    messages?: Array<{
      role: string;
      content: string;
    }>;
  };
}

export const AISettingsTab = memo(({ isUserFree }: AISettingsTabProps) => {
  const {
    settings,
    profile,
    saving,
    updateAIReceptionistSettings,
    getAIReceptionistSettings,
    assistantData,
    assistantLoading,
    refreshAssistantData,
    fetchAssistantData,
  } = useUserSettings();

  // Initialize local state - start empty and let useEffect populate with real data
  const [firstMessage, setFirstMessage] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [voiceId, setVoiceId] = useState('');
  const [isSavingLocal, setIsSavingLocal] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingSystem, setIsUpdatingSystem] = useState(false);
  const [isFetchingKnowledge, setIsFetchingKnowledge] = useState(false);
  const [isMutatingKnowledge, setIsMutatingKnowledge] = useState(false);
  const [knowledgeFiles, setKnowledgeFiles] = useState<
    Array<{
      id: string;
      name?: string;
      size?: number;
    }>
  >([]);
  const [selectedFilesToUpload, setSelectedFilesToUpload] = useState<File[]>(
    []
  );
  const [knowledgeToolId, setKnowledgeToolId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {}
  );
  const [isUploading, setIsUploading] = useState(false);
  const [removingFileIds, setRemovingFileIds] = useState<Set<string>>(
    new Set()
  );
  // Refresh confirmation state
  const [isRefreshDialogOpen, setIsRefreshDialogOpen] = useState(false);
  const [refreshConfirmStep, setRefreshConfirmStep] = useState<1 | 2>(1);
  const [isRefreshingFromDialog, setIsRefreshingFromDialog] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Prevent stale assistantData from overwriting freshly saved values
  const skipHydrateRef = useRef(false);

  // Merge helper to accumulate selected files across multiple picks/drops
  const mergeUniqueFiles = useCallback((prev: File[], next: File[]) => {
    const seen = new Set(
      prev.map(f => `${f.name}|${f.lastModified}|${f.size}`)
    );
    const merged = [...prev];
    for (const f of next) {
      const key = `${f.name}|${f.lastModified}|${f.size}`;
      if (!seen.has(key)) {
        merged.push(f);
        seen.add(key);
      }
    }
    return merged;
  }, []);

  // rAF-batched progress updates to avoid excessive re-renders
  const pendingProgressRef = useRef<Record<string, number>>({});
  const rafIdRef = useRef<number | null>(null);
  const flushProgressUpdates = useCallback(() => {
    setUploadProgress(prev => ({ ...prev, ...pendingProgressRef.current }));
    pendingProgressRef.current = {};
    rafIdRef.current = null;
  }, []);
  const scheduleProgressFlush = useCallback(() => {
    if (rafIdRef.current == null) {
      rafIdRef.current = requestAnimationFrame(flushProgressUpdates);
    }
  }, [flushProgressUpdates]);
  useEffect(() => {
    return () => {
      if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  // Unique key for tracking per-file progress and UI items
  const getFileKey = (file: File) =>
    `${file.name}-${file.lastModified}-${file.size}`;

  // Feature detection for streaming request bodies in fetch (memoized once per session)
  const streamingUploadSupported = useMemo(() => {
    try {
      if (
        typeof ReadableStream !== 'function' ||
        typeof Request !== 'function'
      ) {
        return false;
      }
      // Some browsers (Safari, Firefox) don't support Request with a ReadableStream body
      // This construction will throw if unsupported
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rs: any = new ReadableStream();
      new Request('/api/_probe', { method: 'POST', body: rs });
      return true;
    } catch {
      return false;
    }
  }, []);

  // Character limits (memoized constants)
  const MAX_FIRST_MESSAGE_LENGTH = useMemo(() => 1000, []);
  const MAX_PROMPT_LENGTH = useMemo(() => 10000, []);

  // Default message constants to avoid duplication
  const DEFAULT_FIRST_MESSAGE = useMemo(
    () =>
      'Hi, you’ve reached {{AGENT_NAME}}’s real-estate office. This is Luna. How can I help you today?',
    []
  );
  // Default is the General Receptionist prompt (single source of truth)
  const DEFAULT_SYSTEM_PROMPT = useMemo(
    () => `Who are you?
You're Luna, the receptionist for {{AGENT_NAME}}.

Your job:
Answer calls, greet callers warmly, collect their name, contact information, reason for calling, and preferred callback times. You cannot schedule appointments or provide property valuations.

If the caller requests information you don’t have, politely explain you will pass the request to {{AGENT_NAME}} and they will follow up.

Knowledge Files:
• If Knowledge Files are available, prefer them when relevant.
• If you don’t have the requested info, record the question and assure a prompt callback.

Finish each call by summarizing captured details and assuring the caller of a prompt callback.`,
    []
  );

  // Separate constant for the General Sales template to avoid diverging defaults
  const GENERAL_SALES_PROMPT = useMemo(
    () => `Who are you?
You're Luna, {{AGENT_NAME}}'s real-estate assistant. You’re warm, professional, and efficient. You interact only by voice—never mention screens, links, or buttons.

Your job:
When {{AGENT_NAME}} can’t answer, greet the caller, learn whether they’re buying or selling, and record details so {{AGENT_NAME}} can follow up. You DO NOT schedule appointments. Instead, offer to note their preferred times and promise a quick callback.

Buyer intake (if they’re buying): areas, price range, beds/baths, must-haves, financing status, specific MLS IDs, timeline, contact info.
Seller intake (if they’re selling): property address & type, occupancy, timeline to sell, upgrades, goals, contact info.

Valuations:
If asked for a price estimate, DO NOT provide one. Say you’ll have {{AGENT_NAME}} prepare a market analysis and follow up.

• If Knowledge Files (Service Areas, Active Listings, etc.) are available, prefer them when relevant.
• If you don’t have the requested info, say you’ll note the question and {{AGENT_NAME}} will follow up.

Finish every call by summarizing captured details and assuring the caller of a prompt callback.`,
    []
  );

  // Canonical analysis plan and version
  const {
    version: STANDARD_ANALYSIS_PLAN_VERSION,
    plan: STANDARD_ANALYSIS_PLAN,
  } = rawPlan as Plan;

  // Canonical model defaults (kept in sync with provisioning)
  interface ModelDefaults {
    provider?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    emotionRecognitionEnabled?: boolean;
  }

  const DEFAULTS: ModelDefaults = (() => {
    const unknownDefaults: unknown = rawDefaults;
    if (
      typeof unknownDefaults === 'object' &&
      unknownDefaults !== null &&
      'model' in unknownDefaults
    ) {
      const modelVal = (unknownDefaults as { model?: unknown }).model;
      if (typeof modelVal === 'object' && modelVal !== null) {
        const maybe = modelVal as Partial<ModelDefaults>;
        const safe: ModelDefaults = {};
        if (typeof maybe.provider === 'string') safe.provider = maybe.provider;
        if (typeof maybe.model === 'string') safe.model = maybe.model;
        if (typeof maybe.temperature === 'number')
          safe.temperature = maybe.temperature;
        if (typeof maybe.maxTokens === 'number')
          safe.maxTokens = maybe.maxTokens;
        if (typeof maybe.emotionRecognitionEnabled === 'boolean')
          safe.emotionRecognitionEnabled = maybe.emotionRecognitionEnabled;
        return safe;
      }
    }
    return {} as ModelDefaults;
  })();

  // Utility: deep sort object keys for stable JSON comparison
  const deepSort = useCallback((value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.map(v => deepSort(v));
    }
    if (value && typeof value === 'object') {
      const sortedKeys = Object.keys(value).sort();
      const result: Record<string, unknown> = {};
      for (const key of sortedKeys) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result[key] = deepSort((value as any)[key]);
      }
      return result;
    }
    return value;
  }, []);

  // Determine if assistant needs system updates
  // Criteria:
  // 1) Analysis plan missing/out-of-date or structurally different
  // 2) Default endCall tool missing
  // 3) Termination policy sentinel missing in system prompt
  const shouldShowPullSystemUpdates = useMemo(() => {
    if (!assistantData?.id) return false;

    const assistantPlan = (assistantData as { analysisPlan?: unknown } | null)
      ?.analysisPlan;
    const assistantVersion = (
      assistantData as { metadata?: { analysisPlanVersion?: string } } | null
    )?.metadata?.analysisPlanVersion;

    // Plan/version checks
    let needsPlanUpdate = false;
    if (!assistantPlan) needsPlanUpdate = true;
    if (
      !assistantVersion ||
      assistantVersion !== STANDARD_ANALYSIS_PLAN_VERSION
    ) {
      needsPlanUpdate = true;
    }
    if (!needsPlanUpdate) {
      try {
        const a = JSON.stringify(deepSort(assistantPlan));
        const b = JSON.stringify(deepSort(STANDARD_ANALYSIS_PLAN));
        if (a !== b) needsPlanUpdate = true;
      } catch {
        // If comparison fails for any reason, be conservative
        needsPlanUpdate = true;
      }
    }

    // Tool check: require default endCall tool
    const tools = (assistantData as any)?.model?.tools;
    const hasEndCallTool = Array.isArray(tools)
      ? tools.some((t: any) => t?.type === 'endCall')
      : false;
    const needsEndCallTool = !hasEndCallTool;

    // Termination policy sentinel check in system prompt
    const sysMsg = (assistantData as any)?.model?.messages?.find(
      (m: any) => m?.role === 'system'
    )?.content;
    const hasTerminationPolicy =
      typeof sysMsg === 'string' &&
      sysMsg.includes(TERMINATION_POLICY_SENTINEL);
    const needsTerminationPolicy = !hasTerminationPolicy;

    // Model drift checks: provider/model, temperature, maxTokens
    // Guard against empty DEFAULTS (when rawDefaults is missing) to avoid false positives
    const model = (assistantData as any)?.model || {};
    const hasDefaults = Object.keys(DEFAULTS).length > 0;
    const needsModelProvider =
      hasDefaults && DEFAULTS.provider !== undefined
        ? model?.provider !== DEFAULTS.provider
        : false;
    const needsModelName =
      hasDefaults && DEFAULTS.model !== undefined
        ? model?.model !== DEFAULTS.model
        : false;
    const needsTemperature =
      hasDefaults && typeof DEFAULTS.temperature === 'number'
        ? model?.temperature !== DEFAULTS.temperature
        : false;
    const needsMaxTokens =
      hasDefaults && typeof DEFAULTS.maxTokens === 'number'
        ? model?.maxTokens !== DEFAULTS.maxTokens
        : false;

    return (
      needsPlanUpdate ||
      needsEndCallTool ||
      needsTerminationPolicy ||
      needsModelProvider ||
      needsModelName ||
      needsTemperature ||
      needsMaxTokens
    );
  }, [
    assistantData?.id,
    (assistantData as { analysisPlan?: unknown } | null)?.analysisPlan,
    (assistantData as { metadata?: { analysisPlanVersion?: string } } | null)
      ?.metadata?.analysisPlanVersion,
    (assistantData as any)?.model?.tools,
    (assistantData as any)?.model?.messages,
    (assistantData as any)?.model?.provider,
    (assistantData as any)?.model?.model,
    (assistantData as any)?.model?.temperature,
    (assistantData as any)?.model?.maxTokens,
    STANDARD_ANALYSIS_PLAN_VERSION,
    STANDARD_ANALYSIS_PLAN,
    DEFAULTS,
    deepSort,
  ]);

  // Debounced values for performance optimization
  const debouncedFirstMessage = useDebouncedValue(firstMessage, 300);
  const debouncedSystemPrompt = useDebouncedValue(systemPrompt, 300);

  // Memoized original values for comparison
  const originalValues = useMemo(() => {
    if (!assistantData) {
      return {
        firstMessage: DEFAULT_FIRST_MESSAGE,
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        voiceId: '',
      };
    }

    return {
      firstMessage: assistantData.firstMessage || DEFAULT_FIRST_MESSAGE,
      systemPrompt: stripTerminationPolicy(
        assistantData.model?.messages?.find((msg: any) => msg.role === 'system')
          ?.content || DEFAULT_SYSTEM_PROMPT
      ),
      voiceId: assistantData.voice?.voiceId || '',
    };
  }, [
    assistantData,
    DEFAULT_FIRST_MESSAGE,
    DEFAULT_SYSTEM_PROMPT,
    stripTerminationPolicy,
  ]);

  // Memoized unsaved changes detection
  const hasUnsavedChanges = useMemo(() => {
    if (isLoading || !hasInitialized) return false;
    const normalize = (v: string) => v.replace(/\r\n/g, '\n').trim();
    const firstMessageChanged =
      normalize(debouncedFirstMessage) !==
      normalize(originalValues.firstMessage);
    const systemPromptChanged =
      normalize(debouncedSystemPrompt) !==
      normalize(originalValues.systemPrompt);
    const voiceChanged = voiceId !== originalValues.voiceId;
    return firstMessageChanged || systemPromptChanged || voiceChanged;
  }, [
    debouncedFirstMessage,
    debouncedSystemPrompt,
    voiceId,
    originalValues,
    isLoading,
    hasInitialized,
  ]);

  // Memoized validation
  const validation = useMemo(() => {
    // Don't validate until initialized
    if (!hasInitialized) {
      return {
        firstMessageValid: true,
        systemPromptValid: true,
        isFormValid: false,
      };
    }

    return {
      firstMessageValid:
        debouncedFirstMessage.trim().length > 0 &&
        debouncedFirstMessage.length <= MAX_FIRST_MESSAGE_LENGTH,
      systemPromptValid:
        debouncedSystemPrompt.trim().length > 0 &&
        debouncedSystemPrompt.length <= MAX_PROMPT_LENGTH,
      isFormValid:
        debouncedFirstMessage.trim().length > 0 &&
        debouncedFirstMessage.length <= MAX_FIRST_MESSAGE_LENGTH &&
        debouncedSystemPrompt.trim().length > 0 &&
        debouncedSystemPrompt.length <= MAX_PROMPT_LENGTH,
    };
  }, [
    debouncedFirstMessage,
    debouncedSystemPrompt,
    MAX_FIRST_MESSAGE_LENGTH,
    MAX_PROMPT_LENGTH,
    hasInitialized,
  ]);

  // Memoized templates for performance
  const promptTemplates = useMemo(
    () => [
      {
        title: 'General Sales',
        description: 'Handles buyers and sellers',
        prompt: GENERAL_SALES_PROMPT,
      },
      {
        title: 'Listing Specialist',
        description: 'Focuses on home-seller leads only',
        prompt: `Who are you?
 You're Luna, {{AGENT_NAME}}'s listing assistant.
 
 Your job:
 Focus exclusively on home-seller leads. You do NOT handle buyers or renters unless forwarding them. You cannot schedule appointments; instead, offer to note preferred callback times.
 
 Seller intake checklist:
 • Property address and type
 • Occupancy status
 • Timeline to list
 • Recent upgrades or renovations
 • Goals or questions
 • Name, phone, email, best callback times
 
 Valuations:
 If the caller asks for a price estimate, DO NOT provide one. Say: “{{AGENT_NAME}} prepares those personally. Let me take your property details and they’ll follow up.”
 
 Knowledge Files:
 • If Knowledge Files (Service Areas, Active Listings, etc.) are available, prefer them when relevant.
 • If you don’t have the requested info, say you’ll note the question and {{AGENT_NAME}} will follow up shortly.
 
 Finish each call by summarizing captured details and assuring the caller of a prompt callback.`,
      },
      {
        title: 'Rental Specialist',
        description: 'Handles rental inquiries only',
        prompt: `Who are you?
 You're Luna, {{AGENT_NAME}}'s rental assistant.
 
 Your job:
 Handle rental inquiries only. You cannot schedule showings; instead, offer to record preferred times for a callback.
 
 Rental intake checklist:
 • Budget
 • Move-in date and lease length
 • Bedrooms, pets, must-haves
 • Desired areas or specific vacancy addresses
 • Name, phone, email, best callback times
 
 If callers ask about buying or selling, politely explain that {{AGENT_NAME}} focuses on rentals and can connect them with a colleague.
 
 Knowledge Files:
 • If Knowledge Files (Rental Criteria, Vacancy List, Service Areas) are available, prefer them when relevant.
 • If you don’t have the requested info, say you’ll note the question and {{AGENT_NAME}} will follow up shortly.
 
 Finish each call by summarizing captured details and assuring the caller of a prompt callback.`,
      },
      {
        title: 'General Receptionist',
        description: 'Simple message-taking assistant',
        prompt: DEFAULT_SYSTEM_PROMPT,
      },
    ],
    [DEFAULT_SYSTEM_PROMPT, GENERAL_SALES_PROMPT]
  );

  // Initialize data when assistant data is available or settings are loaded
  useEffect(() => {
    // Don't update local state while saving to prevent flashing of old data
    if (isSavingLocal) return;
    if (skipHydrateRef.current) return;

    if (assistantData) {
      // We have assistant data - use it
      const newFirstMessage =
        assistantData.firstMessage || DEFAULT_FIRST_MESSAGE;
      const systemMessage = assistantData.model?.messages?.find(
        (msg: any) => msg.role === 'system'
      );
      const newSystemPrompt = stripTerminationPolicy(
        systemMessage?.content || DEFAULT_SYSTEM_PROMPT
      );
      const newVoice = assistantData.voice?.voiceId || '';

      setFirstMessage(newFirstMessage);
      setSystemPrompt(newSystemPrompt);
      setVoiceId(newVoice);
      setIsLoading(false);
      setHasInitialized(true);
    } else if (settings && !hasInitialized) {
      // Settings are loaded but no assistant data yet
      const hasVapiId = Boolean(settings.vapi_assistant_id);

      if (!hasVapiId) {
        // No VAPI assistant configured - use fallback values immediately
        const aiSettings = getAIReceptionistSettings();
        const name = aiSettings.yourName?.trim();
        if (name && name.length > 0) {
          setFirstMessage(replaceAgentName(DEFAULT_FIRST_MESSAGE, name));
          setSystemPrompt(replaceAgentName(DEFAULT_SYSTEM_PROMPT, name));
          setIsLoading(false);
          setHasInitialized(true);
        } else {
          // Wait for profile to load to avoid showing placeholders
          setIsLoading(true);
        }
        setVoiceId(aiSettings.voiceId || '');
      } else if (!assistantLoading) {
        // We have VAPI ID but no data and not currently loading - trigger fetch
        setHasInitialized(true); // Prevent multiple fetch attempts
        fetchAssistantData()
          .then((data: any) => {
            if (data) {
              // Data will be handled by the assistantData branch above
              return;
            }

            // No data available after fetch, use fallbacks
            const aiSettings = getAIReceptionistSettings();
            const name = aiSettings.yourName?.trim();
            if (name && name.length > 0) {
              setFirstMessage(replaceAgentName(DEFAULT_FIRST_MESSAGE, name));
              setSystemPrompt(replaceAgentName(DEFAULT_SYSTEM_PROMPT, name));
              setIsLoading(false);
            } else {
              setIsLoading(true);
            }
            setVoiceId(aiSettings.voiceId || '');
          })
          .catch(() => {
            // Failed to fetch, use fallbacks
            const aiSettings = getAIReceptionistSettings();
            const name = aiSettings.yourName?.trim();
            if (name && name.length > 0) {
              setFirstMessage(replaceAgentName(DEFAULT_FIRST_MESSAGE, name));
              setSystemPrompt(replaceAgentName(DEFAULT_SYSTEM_PROMPT, name));
              setIsLoading(false);
            } else {
              setIsLoading(true);
            }
            setVoiceId(aiSettings.voiceId || '');
          });
      } else if (assistantLoading) {
        // Currently loading assistant data - keep loading state
        setIsLoading(true);
      }
    }
  }, [
    assistantData,
    settings,
    assistantLoading,
    getAIReceptionistSettings,
    isSavingLocal,
    hasInitialized,
    fetchAssistantData,
    DEFAULT_FIRST_MESSAGE,
    DEFAULT_SYSTEM_PROMPT,
  ]);

  // Load knowledge files for assistant
  useEffect(() => {
    const controller = new AbortController();
    const loadKnowledge = async () => {
      if (!assistantData?.id && !settings?.vapi_assistant_id) return;
      const aId = assistantData?.id || settings?.vapi_assistant_id;
      if (!aId) return;
      try {
        setIsFetchingKnowledge(true);
        const res = await fetch(
          `/api/vapi/assistant/knowledge?assistantId=${aId}`,
          {
            method: 'GET',
            signal: controller.signal,
          }
        );
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          const errorMessage =
            text || `Failed to load knowledge (status ${res.status})`;
          throw new Error(errorMessage);
        }
        const json = await res.json();
        setKnowledgeToolId(json.toolId || null);
        setKnowledgeFiles(Array.isArray(json.files) ? json.files : []);
      } catch (error) {
        // Ignore user-initiated aborts
        if ((error as any)?.name === 'AbortError') return;
        logger.fmt`level=${'error'} event=${'AI_KNOWLEDGE_LOAD'} message=${'Failed to load assistant knowledge'} errorMessage=${
          error instanceof Error ? error.message : String(error)
        } stack=${error instanceof Error ? error.stack || '' : ''}`;
        toast({
          title: 'Error loading knowledge',
          description:
            error instanceof Error
              ? error.message
              : 'Unable to load knowledge files. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsFetchingKnowledge(false);
      }
    };
    loadKnowledge();
    return () => {
      controller.abort();
    };
  }, [assistantData?.id, settings?.vapi_assistant_id]);

  // Don't reset initialization state on unmount - let cached data persist

  // Handle save (memoized for performance)
  const handleSave = useCallback(async () => {
    try {
      setIsSavingLocal(true);
      skipHydrateRef.current = true;
      // Use memoized validation
      if (!validation.isFormValid) {
        if (!validation.firstMessageValid) {
          toast({
            title: 'Validation Error',
            description: firstMessage.trim()
              ? `First message must be ${MAX_FIRST_MESSAGE_LENGTH} characters or less`
              : 'First message is required',
            variant: 'destructive',
          });
        } else if (!validation.systemPromptValid) {
          toast({
            title: 'Validation Error',
            description: systemPrompt.trim()
              ? `System prompt must be ${MAX_PROMPT_LENGTH} characters or less`
              : 'System prompt is required',
            variant: 'destructive',
          });
        }
        return;
      }

      // Update first message via direct VAPI API call first (more critical)
      if (assistantData?.id) {
        const payload: Record<string, any> = {
          assistantId: assistantData.id,
          firstMessage: firstMessage.trim(),
        };
        if (voiceId !== originalValues.voiceId) {
          payload.voiceId = voiceId;
        }

        const response = await fetch('/api/vapi/assistant/update', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error('Failed to update first message');
        }
      }

      // Update system prompt via existing settings (preserve existing assistant name)
      const aiSettingsPayload: any = {
        aiAssistantName: assistantData?.name || 'AI Assistant', // Preserve the actual assistant name
        yourName: profile?.full_name || '',
        businessName: profile?.business_name || '',
        greetingScript: stripTerminationPolicy(systemPrompt).trim(),
      };
      if (voiceId !== originalValues.voiceId) {
        aiSettingsPayload.voiceId = voiceId;
      }

      await updateAIReceptionistSettings(aiSettingsPayload);

      // Refresh data to get latest from VAPI and update local state
      // Both API operations are complete at this point since they were properly awaited
      const refreshedData = await refreshAssistantData();

      // Update local state with fresh data to prevent old values from flashing
      if (refreshedData) {
        const newFirstMessage =
          refreshedData.firstMessage || firstMessage.trim();
        const systemMessage = refreshedData.model?.messages?.find(
          (msg: any) => msg.role === 'system'
        );
        const newSystemPrompt = stripTerminationPolicy(
          systemMessage?.content || systemPrompt.trim()
        );

        setFirstMessage(newFirstMessage);
        setSystemPrompt(newSystemPrompt);
      }

      toast({
        title: 'Settings saved!',
        description: 'Your AI assistant has been updated successfully.',
        duration: 3000,
      });
    } catch (error) {
      logger.fmt`level=${'error'} event=${'AI_SETTINGS_SAVE'} message=${'Failed to save assistant settings'} errorMessage=${
        error instanceof Error ? error.message : String(error)
      } stack=${error instanceof Error ? error.stack || '' : ''}`;
      toast({
        title: 'Error saving settings',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingLocal(false);
      // Allow hydration again after the next tick to ensure state is settled
      setTimeout(() => {
        skipHydrateRef.current = false;
      }, 0);
    }
  }, [
    validation.isFormValid,
    validation.firstMessageValid,
    validation.systemPromptValid,
    firstMessage,
    systemPrompt,
    MAX_FIRST_MESSAGE_LENGTH,
    MAX_PROMPT_LENGTH,
    assistantData?.id,
    updateAIReceptionistSettings,
    profile?.full_name,
    profile?.business_name,
    refreshAssistantData,
    voiceId,
    originalValues.voiceId,
  ]);

  // Handle refresh (memoized for performance)
  const handleRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      let updatedFromDirectFetch = false;

      // Try a direct, uncached fetch to ensure we have the latest assistant
      try {
        const res = await fetch(`/api/vapi/assistant/info?t=${Date.now()}`, {
          method: 'GET',
          cache: 'no-store',
        });
        if (res.ok) {
          const json = await res.json();
          const assistant = json?.assistant;
          if (assistant) {
            const newFirstMessage =
              assistant.firstMessage || DEFAULT_FIRST_MESSAGE;
            const systemMessage = assistant.model?.messages?.find(
              (msg: any) => msg.role === 'system'
            );
            const newSystemPrompt = stripTerminationPolicy(
              systemMessage?.content || DEFAULT_SYSTEM_PROMPT
            );
            const newVoice = assistant.voice?.voiceId || '';

            setFirstMessage(newFirstMessage);
            setSystemPrompt(newSystemPrompt);
            setVoiceId(newVoice);
            updatedFromDirectFetch = true;
          }
        }
      } catch {
        // ignore direct fetch errors; fallback to hook refresh below
      }

      // Always reconcile local UI with canonical store data to avoid drift
      const refreshedData = await refreshAssistantData();
      let updatedFromHook = false;
      if (refreshedData) {
        const newFirstMessage =
          refreshedData.firstMessage || DEFAULT_FIRST_MESSAGE;
        const systemMessage = refreshedData.model?.messages?.find(
          (msg: any) => msg.role === 'system'
        );
        const newSystemPrompt = stripTerminationPolicy(
          systemMessage?.content || DEFAULT_SYSTEM_PROMPT
        );
        const newVoice = refreshedData.voice?.voiceId || '';

        setFirstMessage(newFirstMessage);
        setSystemPrompt(newSystemPrompt);
        setVoiceId(newVoice);
        updatedFromHook = true;
      }

      if (updatedFromDirectFetch || updatedFromHook) {
        toast({
          title: 'Settings refreshed',
          description: 'Loaded latest settings from your AI assistant.',
        });
      } else {
        toast({
          title: 'Refresh failed',
          description:
            'Could not load the latest assistant settings. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshAssistantData, DEFAULT_FIRST_MESSAGE, DEFAULT_SYSTEM_PROMPT]);

  // Click handler that adds a two-step confirmation when there are unsaved changes
  const handleClickRefresh = useCallback(() => {
    if (hasUnsavedChanges) {
      setRefreshConfirmStep(1);
      setIsRefreshDialogOpen(true);
      return;
    }
    // No unsaved changes – refresh immediately
    void handleRefresh();
  }, [hasUnsavedChanges, handleRefresh]);

  // Handle system updates
  const handlePullSystemUpdates = useCallback(async () => {
    try {
      setIsUpdatingSystem(true);

      const response = await fetch('/api/vapi/assistant/fix-analysis-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to pull system updates');
      }

      toast({
        title: 'System updates applied!',
        description:
          'Your assistant now has the latest analysis capabilities and reasoning insights.',
        duration: 5000,
      });

      // Refresh assistant data to reflect changes
      await refreshAssistantData();
    } catch (error) {
      logger.fmt`level=${'error'} event=${'AI_SETTINGS_PULL_UPDATES'} message=${'Failed to pull system updates'} errorMessage=${
        error instanceof Error ? error.message : String(error)
      } stack=${error instanceof Error ? error.stack || '' : ''}`;
      toast({
        title: 'Error applying system updates',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to apply system updates. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingSystem(false);
    }
  }, [refreshAssistantData]);

  // Compute assistant and public key before any early returns to keep Hooks order stable
  const assistantId = assistantData?.id ?? settings?.vapi_assistant_id ?? null;
  const vapiPublicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY ?? '';

  // Extracted upload handler (declared before any conditional return)
  const handleUploadAndAttach = useCallback(async () => {
    if (!assistantId || selectedFilesToUpload.length === 0) return;
    try {
      setIsMutatingKnowledge(true);
      setIsUploading(true);
      setUploadProgress(
        Object.fromEntries(selectedFilesToUpload.map(f => [getFileKey(f), 0]))
      );
      const uploadedIds: string[] = [];
      const MAX_BYTES = 300 * 1024;

      const streamingSupported = streamingUploadSupported;
      const uploadPromises = selectedFilesToUpload.map(f => {
        return new Promise<string | null>(resolve => {
          // Per-file validation
          if (f.size === 0) {
            toast({
              title: 'Upload skipped',
              description: `${f.name} is empty and cannot be uploaded`,
              variant: 'destructive',
            });
            return resolve(null);
          }
          if (f.size > MAX_BYTES) {
            toast({
              title: 'File too large',
              description: `${f.name} exceeds 300KB limit`,
              variant: 'destructive',
            });
            return resolve(null);
          }
          const providedMime = f.type;
          const inferredMime = inferMimeFromFilename(f.name);
          const allowed =
            isAllowedMime(providedMime) || isAllowedMime(inferredMime);
          if (!allowed) {
            toast({
              title: 'Unsupported file type',
              description: `${f.name} is not a supported type. Allowed: .txt, .pdf, .docx, .doc, .csv, .md, .tsv, .yaml, .yml, .json, .xml, .log`,
              variant: 'destructive',
            });
            return resolve(null);
          }

          if (streamingSupported) {
            // Streamed multipart/form-data upload with fetch to enable progress updates
            const boundary = `----spoqenFormBoundary-${
              typeof crypto !== 'undefined' && 'randomUUID' in crypto
                ? crypto.randomUUID()
                : Math.random().toString(36).slice(2)
            }`;
            const encoder = new TextEncoder();
            const contentType = f.type || 'application/octet-stream';
            const escapedFilename = f.name.replace(/"/g, '%22');
            const prefix = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${escapedFilename}"\r\nContent-Type: ${contentType}\r\n\r\n`;
            const suffix = `\r\n--${boundary}--\r\n`;

            const fileStream = f.stream();
            let uploadedBytes = 0;
            const totalBytes = f.size;

            const bodyStream = new ReadableStream<Uint8Array>({
              start(controller) {
                controller.enqueue(encoder.encode(prefix));
                const reader = fileStream.getReader();
                const pump = (): any => {
                  return reader
                    .read()
                    .then(({ done, value }) => {
                      if (done) {
                        controller.enqueue(encoder.encode(suffix));
                        controller.close();
                        // Ensure 100% on completion
                        pendingProgressRef.current[getFileKey(f)] = 100;
                        scheduleProgressFlush();
                        return;
                      }
                      if (value) {
                        uploadedBytes += value.byteLength;
                        const percent = Math.max(
                          0,
                          Math.min(
                            100,
                            Math.round((uploadedBytes / totalBytes) * 100)
                          )
                        );
                        pendingProgressRef.current[getFileKey(f)] = percent;
                        scheduleProgressFlush();
                        controller.enqueue(value);
                      }
                      return pump();
                    })
                    .catch(err => {
                      controller.error(err);
                    });
                };
                pump();
              },
            });

            fetch('/api/vapi/files/upload', {
              method: 'POST',
              headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
              },
              body: bodyStream as any,
            })
              .then(async res => {
                if (!res.ok) {
                  const text = await res.text().catch(() => '');
                  toast({
                    title: 'Upload failed',
                    description: text || 'Upload failed',
                    variant: 'destructive',
                  });
                  return resolve(null);
                }
                const json = (await res.json().catch(() => ({}))) as any;
                return resolve(json?.id || null);
              })
              .catch(() => {
                toast({
                  title: 'Upload failed',
                  description: 'Network error during upload',
                  variant: 'destructive',
                });
                return resolve(null);
              });
          } else {
            // Fallback: standard FormData (no streaming/progress but widely supported)
            const formData = new FormData();
            formData.append('file', f, f.name);
            fetch('/api/vapi/files/upload', {
              method: 'POST',
              body: formData,
            })
              .then(async res => {
                if (!res.ok) {
                  const text = await res.text().catch(() => '');
                  toast({
                    title: 'Upload failed',
                    description: text || 'Upload failed',
                    variant: 'destructive',
                  });
                  return resolve(null);
                }
                const json = (await res.json().catch(() => ({}))) as any;
                // Set to 100% since we don't have progress
                pendingProgressRef.current[getFileKey(f)] = 100;
                scheduleProgressFlush();
                return resolve(json?.id || null);
              })
              .catch(() => {
                toast({
                  title: 'Upload failed',
                  description: 'Network error during upload',
                  variant: 'destructive',
                });
                return resolve(null);
              });
          }
        });
      });

      const results = await Promise.all(uploadPromises);
      for (const id of results) {
        if (id) uploadedIds.push(id);
      }

      const finalIds = Array.from(
        new Set([...(knowledgeFiles?.map(f => f.id) || []), ...uploadedIds])
      );

      const syncRes = await fetch('/api/vapi/assistant/knowledge/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assistantId, fileIds: finalIds }),
      });
      if (!syncRes.ok) {
        const text = await syncRes.text();
        toast({
          title: 'Sync failed',
          description: text,
          variant: 'destructive',
        });
      } else {
        const json = await syncRes.json();
        setKnowledgeToolId(json.toolId || null);
        // Refresh listing
        const listRes = await fetch(
          `/api/vapi/assistant/knowledge?assistantId=${assistantId}`
        );
        if (listRes.ok) {
          const data = await listRes.json();
          setKnowledgeFiles(data.files || []);
        }
        toast({
          title: 'Files attached',
          description: 'Assistant knowledge updated.',
        });
      }
    } finally {
      setIsMutatingKnowledge(false);
      setIsUploading(false);
      // Always reset progress and selected files after an upload attempt
      setUploadProgress({});
      setSelectedFilesToUpload([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [
    assistantId,
    selectedFilesToUpload,
    knowledgeFiles,
    scheduleProgressFlush,
  ]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI Assistant Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-32 w-full" />
              </div>
              <Skeleton className="h-10 w-24" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info alert for free users */}
      {isUserFree && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            You're on the free plan with full access to configure and test your
            AI assistant via the widget below. Upgrade to get a dedicated phone
            number for real incoming calls.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <Bot className="h-5 w-5" />
            <CardTitle className="truncate">
              AI Assistant Configuration
            </CardTitle>
            {assistantData && (
              <Badge variant="secondary" className="ml-2">
                <CheckCircle className="mr-1 h-3 w-3" />
                Connected
              </Badge>
            )}
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            {shouldShowPullSystemUpdates && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      assistantLoading ||
                      saving ||
                      isSavingLocal ||
                      isUpdatingSystem ||
                      !assistantData?.id
                    }
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Pull System Updates
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Pull System Updates</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-3">
                        <div>
                          This will update your AI assistant with the latest
                          Spoqen system improvements including:
                        </div>
                        <ul className="list-disc space-y-1 pl-6 text-sm">
                          <li>
                            <strong>Enhanced Call Analysis:</strong> Improved
                            sentiment detection and lead quality scoring
                          </li>
                          <li>
                            <strong>Reasoning Insights:</strong> AI will now
                            provide detailed explanations for its analysis
                            decisions
                          </li>
                          <li>
                            <strong>Better Data Extraction:</strong> More
                            accurate structured data from call transcripts
                          </li>
                          <li>
                            <strong>Optimized Prompts:</strong> Latest analysis
                            prompts for better performance
                          </li>
                        </ul>
                        <div className="text-sm text-muted-foreground">
                          <strong>Note:</strong> This will only update the
                          analysis capabilities. Your assistant's personality,
                          voice, and conversation settings will remain
                          unchanged.
                        </div>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handlePullSystemUpdates}
                      disabled={isUpdatingSystem}
                    >
                      {isUpdatingSystem ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        'Apply Updates'
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleClickRefresh}
              disabled={assistantLoading || saving || isRefreshing}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>

            {/* Two-step confirmation dialog for refresh (only used when there are unsaved changes) */}
            <AlertDialog
              open={isRefreshDialogOpen}
              onOpenChange={open => {
                setIsRefreshDialogOpen(open);
                if (!open) setRefreshConfirmStep(1);
              }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {refreshConfirmStep === 1
                      ? 'Unsaved changes detected'
                      : 'Confirm refresh and override'}
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-2 text-sm">
                      {refreshConfirmStep === 1 ? (
                        <>
                          <p>
                            You have unsaved changes to your assistant
                            configuration.
                          </p>
                          <p>
                            Refreshing will reload settings from the assistant
                            and override your pending edits.
                          </p>
                        </>
                      ) : (
                        <>
                          <p>
                            This will discard any unsaved changes and reload the
                            latest configuration from your assistant.
                          </p>
                          <p className="font-medium">
                            Are you sure you want to continue?
                          </p>
                        </>
                      )}
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  {refreshConfirmStep === 1 ? (
                    <>
                      <AlertDialogCancel
                        onClick={() => setIsRefreshDialogOpen(false)}
                      >
                        Cancel
                      </AlertDialogCancel>
                      <Button
                        onClick={() => setRefreshConfirmStep(2)}
                        disabled={assistantLoading || saving || isRefreshing}
                      >
                        Continue
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => setRefreshConfirmStep(1)}
                        disabled={assistantLoading || saving || isRefreshing}
                      >
                        Back
                      </Button>
                      <Button
                        onClick={async () => {
                          try {
                            setIsRefreshingFromDialog(true);
                            await handleRefresh();
                            setIsRefreshDialogOpen(false);
                            setRefreshConfirmStep(1);
                          } finally {
                            setIsRefreshingFromDialog(false);
                          }
                        }}
                        disabled={
                          assistantLoading ||
                          saving ||
                          isRefreshing ||
                          isRefreshingFromDialog
                        }
                        aria-busy={isRefreshingFromDialog ? true : undefined}
                      >
                        {isRefreshingFromDialog ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Refreshing...
                          </>
                        ) : (
                          'Refresh now'
                        )}
                      </Button>
                    </>
                  )}
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* First Message */}
          <div className="space-y-2">
            <Label htmlFor="first-message" className="text-sm font-medium">
              First Message
            </Label>
            <Input
              id="first-message"
              value={firstMessage}
              onChange={e => setFirstMessage(e.target.value)}
              placeholder="Enter the first message your assistant will say"
              maxLength={MAX_FIRST_MESSAGE_LENGTH}
              disabled={saving || isSavingLocal}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                This is the greeting your AI assistant will use when answering
                calls
              </span>
              <span
                className={`${firstMessage.length > MAX_FIRST_MESSAGE_LENGTH * 0.9 ? 'text-warning' : ''} ${firstMessage.length >= MAX_FIRST_MESSAGE_LENGTH ? 'text-destructive' : ''}`}
              >
                {firstMessage.length}/{MAX_FIRST_MESSAGE_LENGTH}
              </span>
            </div>
          </div>

          {/* System Prompt */}
          <div className="space-y-2">
            <Label htmlFor="system-prompt" className="text-sm font-medium">
              System Prompt
            </Label>
            <Textarea
              id="system-prompt"
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
              placeholder="Enter the instructions for how your AI assistant should behave and respond to callers..."
              className="min-h-48 w-full resize-y"
              maxLength={MAX_PROMPT_LENGTH}
              disabled={saving || isSavingLocal}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                Define your assistant's personality, knowledge, and conversation
                style
              </span>
              <span
                className={`${systemPrompt.length > MAX_PROMPT_LENGTH * 0.9 ? 'text-warning' : ''} ${systemPrompt.length >= MAX_PROMPT_LENGTH ? 'text-destructive' : ''}`}
              >
                {systemPrompt.length}/{MAX_PROMPT_LENGTH}
              </span>
            </div>
          </div>

          {/* Voice Selection */}
          <div className="space-y-2">
            <Label htmlFor="voice-select" className="text-sm font-medium">
              Voice
            </Label>
            <Select value={voiceId} onValueChange={setVoiceId}>
              <SelectTrigger id="voice-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEEPGRAM_VOICES.map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    <div className="flex w-full items-center justify-between">
                      <span className="flex-1">{v.label}</span>
                      <div className="ml-2 flex items-center gap-1">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            v.gender === 'Female'
                              ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/20 dark:text-pink-300'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                          }`}
                        >
                          {v.gender}
                        </span>
                        {v.id === 'luna' && (
                          <Badge variant="default" className="text-xs">
                            Recommended
                          </Badge>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Example prompts */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Wand2 className="h-4 w-4" />
              Quick Start Templates
            </Label>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {promptTemplates.map((template, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSystemPrompt(
                      replaceAgentName(
                        template.prompt,
                        profile?.full_name || ''
                      )
                    )
                  }
                  disabled={saving || isSavingLocal}
                  className="h-auto justify-start p-3 text-left"
                >
                  <div>
                    <div className="font-medium">{template.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {template.description}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-between border-t pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Settings className="h-4 w-4" />
              <span>
                {hasUnsavedChanges
                  ? 'You have unsaved changes'
                  : 'All changes saved'}
              </span>
            </div>
            <Button
              onClick={handleSave}
              disabled={saving || isSavingLocal || !hasUnsavedChanges}
              className="min-w-24"
            >
              {saving || isSavingLocal ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Knowledge (Files) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Knowledge (Files)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Upload files to provide context (e.g., schedules, resumes). Your
            assistant will use these documents when answering related questions.
            Max 300KB per file. Supported: .txt, .pdf, .docx, .doc, .csv, .md,
            .tsv, .yaml, .yml, .json, .xml, .log.
          </div>
          <div className="flex flex-col gap-3">
            {/* Drag & Drop Area */}
            <div
              className={`flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-6 text-center transition-colors ${
                isDragging
                  ? 'border-primary bg-muted/50'
                  : 'border-muted-foreground/30'
              }`}
              onDragEnter={e => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(true);
              }}
              onDragOver={e => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDragLeave={e => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
              }}
              onDrop={e => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
                const files = Array.from(e.dataTransfer.files || []);
                if (files.length > 0) {
                  setSelectedFilesToUpload(prev =>
                    mergeUniqueFiles(prev, files)
                  );
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              aria-label="Drag and drop files here or click to choose"
            >
              <Upload className="h-5 w-5 text-muted-foreground" />
              <div className="text-sm font-medium">Drag & drop files here</div>
              <div className="text-xs text-muted-foreground">
                or click to choose files (max 300KB each)
              </div>
            </div>

            {/* Hidden native file input; triggered by the button for clearer UX */}
            <Input
              ref={fileInputRef}
              className="hidden"
              type="file"
              multiple
              accept=".txt,.pdf,.doc,.docx,.csv,.md,.tsv,.yaml,.yml,.json,.xml,.log"
              onChange={e => {
                const files = Array.from(e.target.files || []);
                setSelectedFilesToUpload(prev => mergeUniqueFiles(prev, files));
                // Clear input value so re-selecting the same files fires change
                if (e.target) (e.target as HTMLInputElement).value = '';
              }}
              disabled={isFetchingKnowledge || saving || isSavingLocal}
            />
            <div className="flex items-center gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isFetchingKnowledge || saving || isSavingLocal}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" /> Choose Files
              </Button>
              {selectedFilesToUpload.length > 0 ? (
                <div className="flex flex-wrap gap-2" aria-live="polite">
                  {selectedFilesToUpload.map(f => (
                    <Badge
                      key={`${f.name}-${f.lastModified}-${f.size}`}
                      variant="secondary"
                      className="border-emerald-200 bg-emerald-100 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300"
                    >
                      {f.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No files selected
                </div>
              )}
            </div>
            <Button
              variant="default"
              size="sm"
              disabled={
                selectedFilesToUpload.length === 0 ||
                !assistantId ||
                isMutatingKnowledge ||
                isUploading
              }
              onClick={handleUploadAndAttach}
            >
              Upload & Attach
            </Button>

            {/* Upload progress list */}
            {isUploading && selectedFilesToUpload.length > 0 && (
              <div className="space-y-2">
                {selectedFilesToUpload.map(f => (
                  <div
                    key={`${f.name}-${f.lastModified}-${f.size}`}
                    className="flex items-center gap-3"
                  >
                    <div className="w-40 truncate text-sm text-muted-foreground">
                      {f.name}
                    </div>
                    <div className="flex-1">
                      <Progress value={uploadProgress[getFileKey(f)] || 0} />
                    </div>
                    <div className="w-12 text-right text-xs text-muted-foreground">
                      {(uploadProgress[getFileKey(f)] || 0).toString()}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Attached files</div>
            <div className="space-y-2">
              {isFetchingKnowledge && (
                <div className="text-sm text-muted-foreground">Loading...</div>
              )}
              {!isFetchingKnowledge && knowledgeFiles.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  No files attached yet.
                </div>
              )}
              {knowledgeFiles.map(file => (
                <div
                  key={file.id}
                  className="flex items-center justify-between rounded-md border p-2 text-sm"
                >
                  <div className="truncate">
                    <span className="font-medium">{file.name || file.id}</span>
                    {typeof file.size === 'number' && (
                      <span className="ml-2 text-muted-foreground">
                        {Math.ceil(file.size / 1024)} KB
                      </span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={removingFileIds.has(file.id)}
                    onClick={async () => {
                      if (!assistantId) return;
                      const removed = file;
                      // Per-item loading state
                      setRemovingFileIds(prev => new Set(prev).add(file.id));
                      setIsMutatingKnowledge(true);
                      // Optimistic UI removal
                      setKnowledgeFiles(prev =>
                        prev.filter(f => f.id !== file.id)
                      );
                      try {
                        // Delete from Vapi storage first (ownership check relies on metadata)
                        const deleteRes = await fetch(
                          `/api/vapi/files/${file.id}`,
                          { method: 'DELETE' }
                        );
                        // If deletion fails, revert optimistic removal and stop to prevent divergence
                        if (!deleteRes.ok) {
                          const text = await deleteRes.text();
                          setKnowledgeFiles(prev =>
                            [removed, ...prev].sort((a, b) =>
                              a.id > b.id ? 1 : -1
                            )
                          );
                          toast({
                            title: 'Delete failed',
                            description:
                              text || 'Unable to delete file from storage.',
                            variant: 'destructive',
                          });
                          return;
                        }
                        // Only detach after successful delete
                        const detachRes = await fetch(
                          '/api/vapi/assistant/knowledge/detach',
                          {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              assistantId,
                              fileId: file.id,
                            }),
                          }
                        );
                        if (!detachRes.ok) {
                          const text = await detachRes.text();
                          // Revert optimistic removal on failure
                          setKnowledgeFiles(prev =>
                            [removed, ...prev].sort((a, b) =>
                              a.id > b.id ? 1 : -1
                            )
                          );
                          toast({
                            title: 'Detach failed',
                            description: text,
                            variant: 'destructive',
                          });
                          return;
                        }
                        toast({ title: 'File removed' });
                        // Keep file chooser UI in sync
                        setSelectedFilesToUpload([]);
                        if (fileInputRef.current)
                          fileInputRef.current.value = '';
                      } catch (error) {
                        // Revert optimistic update on network error
                        setKnowledgeFiles(prev =>
                          [removed, ...prev].sort((a, b) =>
                            a.id > b.id ? 1 : -1
                          )
                        );
                        logger.fmt`level=${'error'} event=${'AI_KNOWLEDGE_DETACH'} message=${'Network error detaching file'} errorMessage=${
                          error instanceof Error ? error.message : String(error)
                        } stack=${error instanceof Error ? error.stack || '' : ''}`;
                        toast({
                          title: 'Remove failed',
                          description:
                            error instanceof Error
                              ? error.message
                              : 'A network error occurred while removing the file.',
                          variant: 'destructive',
                        });
                      } finally {
                        setRemovingFileIds(prev => {
                          const next = new Set(prev);
                          next.delete(file.id);
                          return next;
                        });
                        setIsMutatingKnowledge(false);
                      }
                    }}
                  >
                    {removingFileIds.has(file.id) ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      'Remove'
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      {assistantId && vapiPublicKey && (
        <VapiWidget apiKey={vapiPublicKey} assistantId={assistantId} inline />
      )}
    </div>
  );
});

AISettingsTab.displayName = 'AISettingsTab';

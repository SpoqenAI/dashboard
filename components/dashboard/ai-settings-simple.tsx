import { memo, useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';
import { useUserSettings } from '@/hooks/use-user-settings';
import { toast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import dynamic from 'next/dynamic';
const VapiWidget = dynamic(() => import('@/components/vapi-widget'), {
  ssr: false,
});

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

  // Character limits (memoized constants)
  const MAX_FIRST_MESSAGE_LENGTH = useMemo(() => 100, []);
  const MAX_PROMPT_LENGTH = useMemo(() => 5000, []);

  // Default message constants to avoid duplication
  const DEFAULT_FIRST_MESSAGE = useMemo(
    () => 'Hi, thank you for calling. How can I help you today?',
    []
  );
  const DEFAULT_SYSTEM_PROMPT = useMemo(
    () => 'Hello! Thank you for calling. How can I assist you today?',
    []
  );

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
      systemPrompt:
        assistantData.model?.messages?.find((msg: any) => msg.role === 'system')
          ?.content || DEFAULT_SYSTEM_PROMPT,
      voiceId: assistantData.voice?.voiceId || '',
    };
  }, [assistantData, DEFAULT_FIRST_MESSAGE, DEFAULT_SYSTEM_PROMPT]);

  // Memoized unsaved changes detection
  const hasUnsavedChanges = useMemo(() => {
    if (isLoading || !hasInitialized) return false;

    return (
      debouncedFirstMessage.trim() !== originalValues.firstMessage ||
      debouncedSystemPrompt.trim() !== originalValues.systemPrompt ||
      voiceId !== originalValues.voiceId
    );
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
        title: 'Professional Receptionist',
        description: 'Formal business tone',
        prompt:
          'You are a professional AI receptionist for a business. Be friendly, helpful, and concise. Always ask how you can assist the caller and be ready to take messages or transfer calls as needed. Maintain a warm but professional tone.',
      },
      {
        title: 'Friendly Assistant',
        description: 'Casual and approachable',
        prompt:
          'You are a friendly AI assistant representing our company. Be conversational, helpful, and enthusiastic about helping callers. Ask clarifying questions to understand their needs and provide relevant information about our services.',
      },
    ],
    []
  );

  // Initialize data when assistant data is available or settings are loaded
  useEffect(() => {
    // Don't update local state while saving to prevent flashing of old data
    if (isSavingLocal) return;

    if (assistantData) {
      // We have assistant data - use it
      const newFirstMessage =
        assistantData.firstMessage || DEFAULT_FIRST_MESSAGE;
      const systemMessage = assistantData.model?.messages?.find(
        (msg: any) => msg.role === 'system'
      );
      const newSystemPrompt = systemMessage?.content || DEFAULT_SYSTEM_PROMPT;
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
        setFirstMessage(DEFAULT_FIRST_MESSAGE);
        setSystemPrompt(aiSettings.greetingScript || DEFAULT_SYSTEM_PROMPT);
        setVoiceId(aiSettings.voiceId || '');
        setIsLoading(false);
        setHasInitialized(true);
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
            setFirstMessage(DEFAULT_FIRST_MESSAGE);
            setSystemPrompt(aiSettings.greetingScript || DEFAULT_SYSTEM_PROMPT);
            setVoiceId(aiSettings.voiceId || '');
            setIsLoading(false);
          })
          .catch(() => {
            // Failed to fetch, use fallbacks
            const aiSettings = getAIReceptionistSettings();
            setFirstMessage(DEFAULT_FIRST_MESSAGE);
            setSystemPrompt(aiSettings.greetingScript || DEFAULT_SYSTEM_PROMPT);
            setVoiceId(aiSettings.voiceId || '');
            setIsLoading(false);
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
    voiceId,
  ]);

  // Don't reset initialization state on unmount - let cached data persist

  // Handle save (memoized for performance)
  const handleSave = useCallback(async () => {
    try {
      setIsSavingLocal(true);
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
        greetingScript: systemPrompt.trim(),
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
        const newSystemPrompt = systemMessage?.content || systemPrompt.trim();

        setFirstMessage(newFirstMessage);
        setSystemPrompt(newSystemPrompt);
      }

      toast({
        title: 'Settings saved!',
        description: 'Your AI assistant has been updated successfully.',
        duration: 3000,
      });
    } catch (error) {
      logger.error(
        'AI_SETTINGS',
        'Failed to save assistant settings',
        error as Error
      );
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
  ]);

  // Handle refresh (memoized for performance)
  const handleRefresh = useCallback(async () => {
    try {
      setIsSavingLocal(true);
      const refreshedData = await refreshAssistantData();

      // Update local state with fresh data
      if (refreshedData) {
        const newFirstMessage =
          refreshedData.firstMessage || DEFAULT_FIRST_MESSAGE;
        const systemMessage = refreshedData.model?.messages?.find(
          (msg: any) => msg.role === 'system'
        );
        const newSystemPrompt = systemMessage?.content || DEFAULT_SYSTEM_PROMPT;
        const newVoice = refreshedData.voice?.voiceId || '';

        setFirstMessage(newFirstMessage);
        setSystemPrompt(newSystemPrompt);
        setVoiceId(newVoice);
      }

      toast({
        title: 'Settings refreshed',
        description: 'Loaded latest settings from your AI assistant.',
      });
    } finally {
      setIsSavingLocal(false);
    }
  }, [refreshAssistantData, DEFAULT_FIRST_MESSAGE, DEFAULT_SYSTEM_PROMPT]);

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

  const assistantId = assistantData?.id ?? settings?.vapi_assistant_id ?? null;
  const vapiPublicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY ?? '';

  return (
    <div className="space-y-6">
      {/* Info alert for free users */}
      {isUserFree && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            You're on the free plan. You can edit your AI assistant settings,
            but some advanced features may be limited.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            <CardTitle>AI Assistant Configuration</CardTitle>
            {assistantData && (
              <Badge variant="secondary" className="ml-2">
                <CheckCircle className="mr-1 h-3 w-3" />
                Connected
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={assistantLoading || saving || isSavingLocal}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${assistantLoading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
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
                    {v.label}
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
                  onClick={() => setSystemPrompt(template.prompt)}
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
      {assistantId && vapiPublicKey && (
        <VapiWidget apiKey={vapiPublicKey} assistantId={assistantId} inline />
      )}
    </div>
  );
});

AISettingsTab.displayName = 'AISettingsTab';

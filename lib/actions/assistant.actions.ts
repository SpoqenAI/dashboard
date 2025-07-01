'use server';

import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

// Function to create admin Supabase client using service role key for RLS bypass
function createSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing required Supabase environment variables for admin client'
    );
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

export async function provisionAssistant(userId: string): Promise<void> {
  logger.info('ASSISTANT_PROVISIONING', 'Starting provisioning workflow', {
    userId: logger.maskUserId(userId),
  });

  const supabase = createSupabaseAdmin();

  // 1. Fetch or Create Assistant & Idempotency Check
  // Get the most recent assistant record for the user (in case there are multiple)
  let { data: assistants, error: fetchError } = await supabase
    .from('assistants')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);

  let assistant = assistants?.[0] || null;

  // If no assistant exists, create one with default values
  if (fetchError || !assistant) {
    logger.info(
      'ASSISTANT_PROVISIONING',
      'No assistant found, creating default assistant',
      {
        userId: logger.maskUserId(userId),
      }
    );

    // Get user profile for default values
    const { data: profile } = await supabase
      .from('profiles')
      .select('business_name, first_name, last_name')
      .eq('id', userId)
      .single();

    const defaultBusinessName = profile?.business_name || 'My Business';
    const defaultAssistantName = 'Sarah';
    const defaultGreeting = `Hi, thanks for calling ${defaultBusinessName}! I'm ${defaultAssistantName}, the AI assistant. How can I help you today?`;

    const { data: newAssistant, error: createError } = await supabase
      .from('assistants')
      .insert({
        user_id: userId,
        business_name: defaultBusinessName,
        assistant_name: defaultAssistantName,
        greeting: defaultGreeting,
        status: 'draft',
      })
      .select('*')
      .single();

    if (createError) {
      // Handle unique constraint violation (race condition where another process created assistant)
      if (
        createError.code === '23505' &&
        createError.message?.includes('assistants_user_id_key')
      ) {
        logger.info(
          'ASSISTANT_PROVISIONING',
          'Assistant already exists (race condition detected), fetching existing assistant',
          {
            userId: logger.maskUserId(userId),
          }
        );

        // Fetch the existing assistant created by concurrent process
        const { data: existingAssistant, error: refetchError } = await supabase
          .from('assistants')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (refetchError || !existingAssistant) {
          const errorMessage = `Failed to fetch existing assistant after constraint violation for user ID: ${logger.maskUserId(userId)}`;
          logger.error(
            'ASSISTANT_PROVISIONING',
            errorMessage,
            refetchError instanceof Error
              ? refetchError
              : new Error(String(refetchError))
          );
          throw new Error(errorMessage);
        }

        assistant = existingAssistant;
        logger.info(
          'ASSISTANT_PROVISIONING',
          'Successfully retrieved existing assistant after race condition',
          {
            userId: logger.maskUserId(userId),
            assistantId: assistant.id,
          }
        );
      } else {
        // Other database errors
        const errorMessage = `Failed to create assistant for user ID: ${logger.maskUserId(userId)}`;
        logger.error(
          'ASSISTANT_PROVISIONING',
          errorMessage,
          createError instanceof Error
            ? createError
            : new Error(String(createError))
        );
        throw new Error(errorMessage);
      }
    } else if (!newAssistant) {
      const errorMessage = `Assistant creation returned no data for user ID: ${logger.maskUserId(userId)}`;
      logger.error(
        'ASSISTANT_PROVISIONING',
        errorMessage,
        new Error('No data returned from insert')
      );
      throw new Error(errorMessage);
    } else {
      assistant = newAssistant;
    }

    assistant = newAssistant;
    logger.info(
      'ASSISTANT_PROVISIONING',
      'Successfully created default assistant',
      {
        userId: logger.maskUserId(userId),
        assistantId: assistant.id,
      }
    );
  }

  // Idempotency check
  if (assistant.status === 'provisioning' || assistant.status === 'active') {
    logger.info(
      'ASSISTANT_PROVISIONING',
      'Idempotency check: Assistant already provisioning or active',
      {
        userId: logger.maskUserId(userId),
        assistantId: assistant.id,
        currentStatus: assistant.status,
      }
    );
    return;
  }

  // 2. Set 'provisioning' State (Acquire Lock)
  const { error: updateError } = await supabase
    .from('assistants')
    .update({
      status: 'provisioning',
      status_detail: 'Starting provisioning workflow...',
    })
    .eq('id', assistant.id);

  if (updateError) {
    const errorMessage = `Failed to acquire provisioning lock for assistant ${assistant.id}`;
    logger.error(
      'ASSISTANT_PROVISIONING',
      errorMessage,
      updateError instanceof Error
        ? updateError
        : new Error(String(updateError))
    );
    throw new Error(`${errorMessage}: ${updateError.message}`);
  }

  logger.info('ASSISTANT_PROVISIONING', 'Acquired provisioning lock', {
    assistantId: assistant.id,
    userId: logger.maskUserId(userId),
  });

  // 3. Main Provisioning Block
  try {
    // 3a. Twilio Provisioning
    logger.info(
      'ASSISTANT_PROVISIONING',
      'Starting Twilio phone number provisioning',
      {
        assistantId: assistant.id,
      }
    );

    await supabase
      .from('assistants')
      .update({ status_detail: 'Provisioning phone number from Twilio...' })
      .eq('id', assistant.id);

    // Validate Twilio credentials
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;

    if (!twilioAccountSid || !twilioAuthToken) {
      throw new Error(
        'Missing required Twilio environment variables (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)'
      );
    }

    // Detect test mode based on development environment
    const isTestMode = process.env.NODE_ENV === 'development';

    // Dynamic import to avoid loading Twilio in environments where it's not needed
    let twilioClient;
    try {
      const twilioModule = await import('twilio');
      twilioClient = twilioModule.default(twilioAccountSid, twilioAuthToken);
    } catch (error) {
      throw new Error(
        'Twilio module not found. Please install twilio package: npm install twilio'
      );
    }

    let twilioNumber;

    if (isTestMode) {
      // In test mode, use Twilio's magic phone number for successful provisioning
      // This won't create a real phone number or charge your account
      logger.info(
        'ASSISTANT_PROVISIONING',
        'Using Twilio test mode with magic phone number',
        {
          assistantId: assistant.id,
        }
      );

      twilioNumber = await twilioClient.incomingPhoneNumbers.create({
        phoneNumber: '+15005550006', // Magic number for successful test provisioning
        voiceUrl: 'http://demo.twilio.com/docs/voice.xml', // Demo TwiML URL for testing
      });
    } else {
      // Live mode - provision a real phone number
      const availableNumbers = await twilioClient
        .availablePhoneNumbers('US')
        .local.list({
          voiceEnabled: true,
          limit: 1,
        });

      if (availableNumbers.length === 0) {
        throw new Error(
          'No US voice-capable numbers are currently available from Twilio.'
        );
      }

      twilioNumber = await twilioClient.incomingPhoneNumbers.create({
        phoneNumber: availableNumbers[0].phoneNumber,
      });
    }

    logger.info(
      'ASSISTANT_PROVISIONING',
      'Successfully provisioned Twilio phone number',
      {
        assistantId: assistant.id,
        phoneNumber: twilioNumber.phoneNumber,
        twilioSid: twilioNumber.sid,
      }
    );

    // 3b. Vapi Assistant Creation
    logger.info('ASSISTANT_PROVISIONING', 'Starting Vapi assistant creation', {
      assistantId: assistant.id,
    });

    await supabase
      .from('assistants')
      .update({ status_detail: 'Creating AI assistant with Vapi...' })
      .eq('id', assistant.id);

    // Validate Vapi credentials
    const vapiApiKey = process.env.VAPI_PRIVATE_KEY;
    const vapiWebhookSecret = process.env.VAPI_WEBHOOK_SECRET;

    // Use enhanced URL detection with better fallbacks
    let appUrl =
      process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;

    // For development, try to auto-detect ngrok or use localhost fallback
    if (!appUrl && process.env.NODE_ENV === 'development') {
      // Check if we have any ngrok-related environment variables
      const ngrokUrl = Object.keys(process.env).find(
        key => key.includes('NGROK') && process.env[key]?.includes('ngrok')
      );

      if (ngrokUrl) {
        appUrl = process.env[ngrokUrl];
        logger.info(
          'ASSISTANT_PROVISIONING',
          'Auto-detected ngrok URL from environment',
          {
            assistantId: assistant.id,
            source: ngrokUrl,
            url: appUrl,
          }
        );
      } else {
        // Use localhost fallback for development
        const devPort = process.env.PORT || '3000';
        appUrl = `http://localhost:${devPort}`;
        logger.warn(
          'ASSISTANT_PROVISIONING',
          'Using localhost fallback for development. For production or ngrok testing, set NEXT_PUBLIC_APP_URL',
          {
            assistantId: assistant.id,
            fallbackUrl: appUrl,
          }
        );
      }
    }

    if (!vapiApiKey) {
      throw new Error('Missing required VAPI_PRIVATE_KEY environment variable');
    }

    if (!vapiWebhookSecret) {
      throw new Error(
        'Missing required VAPI_WEBHOOK_SECRET environment variable'
      );
    }

    if (!appUrl) {
      const errorMessage =
        process.env.NODE_ENV === 'production'
          ? 'Missing required NEXT_PUBLIC_APP_URL environment variable. This is required for production deployment.'
          : 'Missing required NEXT_PUBLIC_APP_URL environment variable. For ngrok testing, set NEXT_PUBLIC_APP_URL to your ngrok URL (e.g., https://abc123.ngrok-free.app)';

      throw new Error(errorMessage);
    }

    // Validate URL format
    try {
      new URL(appUrl);
    } catch (urlError) {
      throw new Error(
        `Invalid NEXT_PUBLIC_APP_URL format: ${appUrl}. Please provide a valid URL (e.g., https://yourdomain.com or https://abc123.ngrok-free.app)`
      );
    }

    // Create Vapi assistant using their API
    const vapiResponse = await fetch('https://api.vapi.ai/assistant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${vapiApiKey}`,
      },
      body: JSON.stringify({
        name: assistant.assistant_name || 'AI Assistant',
        model: {
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: assistant.greeting || 'Hello, how can I help you?',
            },
          ],
        },
        voice: {
          provider: 'azure',
          voiceId: 'andrew',
        },
        serverUrl: `${appUrl}/api/vapi-webhook`,
        serverUrlSecret: vapiWebhookSecret,
      }),
    });

    if (!vapiResponse.ok) {
      const errorText = await vapiResponse.text();
      throw new Error(
        `Vapi API request failed: ${vapiResponse.status} ${errorText}`
      );
    }

    const vapiAssistant = await vapiResponse.json();

    logger.info(
      'ASSISTANT_PROVISIONING',
      'Successfully created Vapi assistant',
      {
        assistantId: assistant.id,
        vapiAssistantId: vapiAssistant.id,
      }
    );

    // 3c. Final Database Update (Success)
    await supabase
      .from('assistants')
      .update({ status_detail: 'Finalizing setup...' })
      .eq('id', assistant.id);

    // Insert phone number record (idempotent)
    const { error: phoneInsertError } = await supabase
      .from('phone_numbers')
      .upsert(
        {
          assistant_id: assistant.id,
          provider: 'twilio',
          e164_number: twilioNumber.phoneNumber,
          provider_number_id: twilioNumber.sid,
          status: 'active',
        },
        {
          onConflict: 'e164_number', // ignore if number already exists
        }
      );

    if (phoneInsertError) {
      throw new Error(
        `Failed to insert phone number record: ${phoneInsertError.message}`
      );
    }

    // Update assistant to active status
    const { error: finalUpdateError } = await supabase
      .from('assistants')
      .update({
        status: 'active',
        vapi_assistant_id: vapiAssistant.id,
        status_detail: null,
      })
      .eq('id', assistant.id);

    if (finalUpdateError) {
      throw new Error(
        `Failed to finalize assistant status: ${finalUpdateError.message}`
      );
    }

    logger.info(
      'ASSISTANT_PROVISIONING',
      'Provisioning workflow completed successfully',
      {
        assistantId: assistant.id,
        userId: logger.maskUserId(userId),
        phoneNumber: twilioNumber.phoneNumber,
        vapiAssistantId: vapiAssistant.id,
      }
    );
  } catch (error: any) {
    // 4. Comprehensive Error Handling (Failure)
    const errorMessage = `Provisioning failed for assistant ${assistant.id}: ${error.message}`;

    logger.error(
      'ASSISTANT_PROVISIONING',
      errorMessage,
      error instanceof Error ? error : new Error(String(error)),
      {
        assistantId: assistant.id,
        userId: logger.maskUserId(userId),
      }
    );

    // Update assistant status to error with detailed message
    await supabase
      .from('assistants')
      .update({
        status: 'error',
        status_detail:
          error.message || 'Unknown error occurred during provisioning',
      })
      .eq('id', assistant.id);

    // Re-throw to let the calling webhook know about the failure
    throw new Error(errorMessage);
  }
}

export async function syncVapiAssistant(
  userId: string,
  assistantName: string,
  greeting: string
): Promise<void> {
  'use server';

  // Log the start of the sync so we can trace if the function is invoked at all
  logger.info('VAPI_SYNC', 'Starting assistant sync', {
    userId: logger.maskUserId(userId),
    assistantName,
  });

  try {
    // Skip if values empty (defensive no-op)
    if (!assistantName || !greeting) {
      logger.warn('VAPI_SYNC', 'assistantName or greeting empty – skipping', {
        assistantNameLength: assistantName?.length ?? 0,
        greetingLength: greeting?.length ?? 0,
      });
      return;
    }

    // Create admin client – wrap in try so missing env vars are caught locally
    let supabase;
    try {
      supabase = createSupabaseAdmin();
    } catch (envErr) {
      logger.error(
        'VAPI_SYNC',
        'Failed to create Supabase admin client',
        envErr as Error,
        {
          userId: logger.maskUserId(userId),
        }
      );
      return; // Early exit – nothing else to do without DB access
    }

    const { data: settingsRow } = await supabase
      .from('user_settings')
      .select('vapi_assistant_id')
      .eq('id', userId)
      .maybeSingle();

    if (!settingsRow || !settingsRow.vapi_assistant_id) {
      logger.warn('VAPI_SYNC', 'No Vapi assistant ID found; skipping sync', {
        userId: logger.maskUserId(userId),
      });
      return;
    }

    const apiKey = process.env.VAPI_PRIVATE_KEY;
    if (!apiKey) {
      logger.error('VAPI_SYNC', 'Missing VAPI_PRIVATE_KEY env var', undefined, {
        userId: logger.maskUserId(userId),
      });
      return;
    }

    // Call Vapi API
    const res = await fetch(
      `https://api.vapi.ai/assistant/${settingsRow.vapi_assistant_id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          name: assistantName,
          model: {
            messages: [
              {
                role: 'system',
                content: greeting,
              },
            ],
          },
        }),
      }
    );

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Vapi update failed ${res.status}: ${txt}`);
    }

    logger.info('VAPI_SYNC', 'Assistant updated on Vapi', {
      userId: logger.maskUserId(userId),
      assistantName,
    });
  } catch (err) {
    logger.error('VAPI_SYNC', 'Failed to sync assistant', err as Error, {
      userId: logger.maskUserId(userId),
    });
    // Swallow error so caller does not fail
  }
}

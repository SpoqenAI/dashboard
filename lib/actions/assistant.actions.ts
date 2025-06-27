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

    if (createError || !newAssistant) {
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
    const twilioModule = await import('twilio');
    const twilioClient = twilioModule.default(
      twilioAccountSid,
      twilioAuthToken
    );

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
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!vapiApiKey) {
      throw new Error('Missing required VAPI_PRIVATE_KEY environment variable');
    }

    if (!vapiWebhookSecret) {
      throw new Error(
        'Missing required VAPI_WEBHOOK_SECRET environment variable'
      );
    }

    if (!appUrl) {
      throw new Error(
        'Missing required NEXT_PUBLIC_APP_URL environment variable'
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

    // Insert phone number record
    const { error: phoneInsertError } = await supabase
      .from('phone_numbers')
      .insert({
        assistant_id: assistant.id,
        provider: 'twilio',
        e164_number: twilioNumber.phoneNumber,
        provider_number_id: twilioNumber.sid,
        status: 'active',
      });

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

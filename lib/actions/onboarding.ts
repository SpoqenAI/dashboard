'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { logger } from '@/lib/logger';

// Validate critical environment variables at module load time
const PADDLE_PRICE_ID = (() => {
  const priceId = process.env.NEXT_PUBLIC_PADDLE_PRICE_ID;
  if (!priceId) {
    throw new Error(
      'NEXT_PUBLIC_PADDLE_PRICE_ID environment variable is required but not configured. ' +
        'Please set this variable in your environment configuration.'
    );
  }
  return priceId;
})();

// Profile setup schema
const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  businessName: z.string().min(1, 'Business name is required').max(100),
  phone: z.string().min(10, 'Valid phone number is required'),
  brokerage: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
});

// Assistant setup schema
const assistantSchema = z.object({
  assistantName: z.string().min(1, 'Assistant name is required').max(25),
  businessName: z.string().min(1, 'Business name is required').max(100),
  greeting: z
    .string()
    .min(10, 'Greeting must be at least 10 characters')
    .max(500),
});

export async function updateProfileAction(prevState: any, formData: FormData) {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      errors: {
        _form: ['Not authenticated'],
      },
    };
  }

  // Validate form data
  const validatedFields = profileSchema.safeParse({
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    businessName: formData.get('businessName'),
    phone: formData.get('phone'),
    brokerage: formData.get('brokerage'),
    city: formData.get('city'),
    state: formData.get('state'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { firstName, lastName, businessName, phone, brokerage, city, state } =
    validatedFields.data;
  const fullName = `${firstName} ${lastName}`.trim();

  try {
    // Update the user's profile
    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        business_name: businessName,
        phone: phone,
        brokerage: brokerage || null,
        city: city || null,
        state: state || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      throw error;
    }

    revalidatePath('/onboarding');
    return {
      success: true,
      errors: {},
    };
  } catch (error) {
    logger.error(
      'ONBOARDING_ACTIONS',
      'Error updating user profile',
      error instanceof Error ? error : new Error(String(error)),
      { userId: logger.maskUserId(user.id) }
    );
    return {
      errors: {
        _form: ['Failed to update profile. Please try again.'],
      },
    };
  }
}

export async function createAssistantAction(
  prevState: any,
  formData: FormData
) {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      errors: {
        _form: ['Not authenticated'],
      },
    };
  }

  // Validate form data
  const validatedFields = assistantSchema.safeParse({
    assistantName: formData.get('assistantName'),
    businessName: formData.get('businessName'),
    greeting: formData.get('greeting'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { assistantName, businessName, greeting } = validatedFields.data;

  try {
    /* ------------------------------------------------------------------
       1) Create assistant in Vapi (or reuse existing)
    ------------------------------------------------------------------ */
    const vapiApiKey = process.env.VAPI_PRIVATE_KEY;
    const vapiWebhookSecret = process.env.VAPI_WEBHOOK_SECRET;
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;

    if (!vapiApiKey || !vapiWebhookSecret || !appUrl) {
      throw new Error('Missing required Vapi environment variables');
    }

    // Check if the user already has an assistant id stored
    const { data: settingsRow, error: fetchSettingsErr } = await supabase
      .from('user_settings')
      .select('vapi_assistant_id')
      .eq('id', user.id)
      .maybeSingle();

    if (fetchSettingsErr) throw fetchSettingsErr;

    let vapiAssistantId: string | null = settingsRow?.vapi_assistant_id ?? null;

    if (!vapiAssistantId) {
      // Create a new assistant via Vapi
      const vapiRes = await fetch('https://api.vapi.ai/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${vapiApiKey}`,
        },
        body: JSON.stringify({
          name: assistantName,
          model: {
            provider: 'openai',
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content: greeting,
              },
            ],
          },
          voice: {
            provider: 'azure',
            voiceId: 'andrew',
          },
          serverUrl: `${appUrl}/api/webhooks/vapi`,
          serverUrlSecret: vapiWebhookSecret,
        }),
      });

      if (!vapiRes.ok) {
        const txt = await vapiRes.text();
        logger.error(
          'ONBOARDING_ACTIONS',
          'Vapi create failed',
          new Error(txt),
          {
            status: vapiRes.status,
          }
        );
        throw new Error('Failed to create assistant on Vapi');
      }

      const vapiAssistant = (await vapiRes.json()) as { id: string };
      vapiAssistantId = vapiAssistant.id;

      // Persist assistant id in user_settings via admin client to bypass RLS
      const { createSupabaseAdmin } = await import('@/lib/supabase/admin');
      const adminClient = createSupabaseAdmin();
      const { error: storeErr } = await adminClient
        .from('user_settings')
        .update({ vapi_assistant_id: vapiAssistantId })
        .eq('id', user.id);

      if (storeErr) throw storeErr;
    } else {
      // Assistant already exists – patch its name & greeting to match latest form
      const patchRes = await fetch(
        `https://api.vapi.ai/assistant/${vapiAssistantId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${vapiApiKey}`,
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

      if (!patchRes.ok) {
        const txt = await patchRes.text();
        logger.error(
          'ONBOARDING_ACTIONS',
          'Vapi patch failed',
          new Error(txt),
          {
            status: patchRes.status,
          }
        );
        throw new Error('Failed to update assistant on Vapi');
      }
    }

    /* ------------------------------------------------------------------
       2) Update profile (first/last name, business name) same as before
    ------------------------------------------------------------------ */
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        business_name: businessName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (profileError) {
      // Log but don't fail - assistant creation is more important
      logger.warn(
        'ONBOARDING_ACTIONS',
        'Failed to sync business name to profile',
        { userId: logger.maskUserId(user.id), error: profileError }
      );
    }

    revalidatePath('/onboarding');
    return {
      success: true,
      errors: {},
    };
  } catch (error) {
    // Enhanced error logging with more details
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = {
      userId: logger.maskUserId(user.id),
      assistantName,
      businessName,
      errorType: error?.constructor?.name,
      errorCode: (error as any)?.code,
      errorDetails: (error as any)?.details,
    };

    logger.error(
      'ONBOARDING_ACTIONS',
      'Error creating AI assistant',
      error instanceof Error ? error : new Error(errorMessage),
      errorDetails
    );

    // Return user-friendly error message
    const userMessage = errorMessage.includes('Failed to')
      ? errorMessage
      : 'Failed to create assistant. Please try again.';

    return {
      errors: {
        _form: [userMessage],
      },
    };
  }
}

export async function createCheckoutSessionAction(formData: FormData): Promise<
  | {
      success: true;
      checkoutData: {
        priceId: string;
        customerEmail: string;
        customerName: string;
        userId: string;
      };
      errors?: undefined;
    }
  | {
      errors: {
        _form: string[];
      };
      success?: undefined;
      checkoutData?: undefined;
    }
> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      errors: {
        _form: ['Not authenticated'],
      },
    };
  }

  try {
    // Get user's profile for checkout
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return {
        errors: {
          _form: ['Profile not found'],
        },
      };
    }

    // Here you would typically call the Paddle API to create a checkout session
    // For now, we'll create a checkout URL with the required parameters
    // Note: PADDLE_PRICE_ID is validated at module load time, so it's guaranteed to exist

    // In a real implementation, you would create the checkout session server-side
    // and return the checkout URL. For now, we'll return the necessary data
    // for the client to handle the checkout.
    return {
      success: true,
      checkoutData: {
        priceId: PADDLE_PRICE_ID,
        customerEmail: profile.email,
        customerName: `${profile.first_name} ${profile.last_name}`.trim(),
        userId: user.id,
      },
    };
  } catch (error) {
    logger.error(
      'ONBOARDING_ACTIONS',
      'Error creating checkout session',
      error instanceof Error ? error : new Error(String(error)),
      { userId: logger.maskUserId(user.id) }
    );
    return {
      errors: {
        _form: ['Failed to create checkout session. Please try again.'],
      },
    };
  }
}

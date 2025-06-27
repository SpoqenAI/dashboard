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
    // First, check if user already has an assistant to decide between insert or update
    const { data: existingAssistant, error: checkError } = await supabase
      .from('assistants')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (checkError) {
      logger.error(
        'ONBOARDING_ACTIONS',
        'Error checking existing assistant',
        checkError,
        { userId: logger.maskUserId(user.id) }
      );
      throw new Error('Failed to check existing assistant data');
    }

    let assistantError;
    if (existingAssistant) {
      // Update existing assistant
      const { error } = await supabase
        .from('assistants')
        .update({
          business_name: businessName,
          assistant_name: assistantName,
          greeting: greeting,
          status: 'draft',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
      assistantError = error;
    } else {
      // Insert new assistant
      const { error } = await supabase
        .from('assistants')
        .insert({
          user_id: user.id,
          business_name: businessName,
          assistant_name: assistantName,
          greeting: greeting,
          status: 'draft',
        });
      assistantError = error;
    }

    if (assistantError) {
      logger.error(
        'ONBOARDING_ACTIONS',
        'Assistant database operation failed',
        assistantError,
        { 
          userId: logger.maskUserId(user.id),
          operation: existingAssistant ? 'update' : 'insert',
          errorCode: assistantError.code,
          errorMessage: assistantError.message
        }
      );
      throw new Error(`Failed to ${existingAssistant ? 'update' : 'create'} assistant: ${assistantError.message}`);
    }

    // Sync assistant data to user_settings table for dashboard consistency
    const { error: settingsError } = await supabase
      .from('user_settings')
      .upsert({
        id: user.id,
        assistant_name: assistantName,
        ai_greeting: greeting,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id'
      });

    if (settingsError) {
      // Log detailed error but don't fail - assistant creation is more important
      logger.warn(
        'ONBOARDING_ACTIONS',
        'Failed to sync assistant data to user_settings',
        { 
          userId: logger.maskUserId(user.id), 
          error: settingsError,
          errorCode: settingsError.code,
          errorMessage: settingsError.message
        }
      );
    }

    // Also update the business name in the profile if it has changed
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

import { getSupabaseClient } from './supabase/client';
import type { User } from '@supabase/supabase-js';
import { logger } from './logger';

/**
 * Profile Management Module
 *
 * This module handles user profile creation and management with atomic operations
 * to prevent race conditions. The key design principle is to use the database's
 * atomic upsert capabilities (ON CONFLICT clauses) rather than separate
 * check-then-create operations.
 *
 * Race Condition Prevention:
 * - ensureUserProfile() directly calls the stored procedure without checking existence first
 * - The create_full_profile stored procedure uses ON CONFLICT DO UPDATE clauses
 * - This eliminates the window where two parallel requests could both detect missing
 *   profiles and attempt creation, causing unique-key violations
 *
 * Key Functions:
 * - ensureUserProfile(): Main entry point, uses atomic upsert approach
 * - createUserProfile(): Calls the atomic stored procedure
 * - checkProfileExists(): Primarily for debugging/testing purposes
 */

export interface CreateProfileData {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phone?: string;
  avatarUrl?: string;
}

export interface CreateProfileResponse {
  success: boolean;
  user_id: string;
  profile: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
    business_name: string | null;
    bio: string | null;
    website: string | null;
    license_number: string | null;
    brokerage: string | null;
    city: string | null;
    state: string | null;
    created_at: string;
    updated_at: string;
    last_login: string;
  };
  settings: {
    id: string;
    ai_greeting?: string;
    assistant_name?: string;
    business_hours: string;
    email_notifications: boolean;
    sms_notifications: boolean;
    billing_notifications: boolean;
    marketing_emails: boolean;
    theme: string;
    timezone: string;
    language: string;
    created_at: string;
    updated_at: string;
  };
  subscription: {
    id: string;
    plan_type: string;
    status: string;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    current_period_start: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Creates a complete user profile with all related records atomically
 * Uses the create_full_profile stored procedure for transaction safety
 */
export async function createUserProfile(
  userData: CreateProfileData
): Promise<{ success: true; data: CreateProfileResponse }> {
  const supabase = getSupabaseClient();

  try {
    // Validate required fields
    if (!userData.id || !userData.email) {
      throw new Error('User ID and email are required');
    }

    // Validate email format
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(userData.email)) {
      throw new Error(`Invalid email format: ${userData.email}`);
    }

    // Validate phone number if provided
    if (userData.phone?.trim()) {
      const phoneRegex = /^[\+]?[0-9\(\)\-\s\.]{10,}$/;
      if (!phoneRegex.test(userData.phone)) {
        throw new Error(`Invalid phone number format: ${userData.phone}`);
      }
    }

    // Validate avatar URL if provided
    if (userData.avatarUrl?.trim()) {
      if (!userData.avatarUrl.match(/^https?:\/\/.*/)) {
        throw new Error(`Invalid avatar URL format: ${userData.avatarUrl}`);
      }
    }

    // Call the stored procedure for atomic profile creation
    const { data, error } = await supabase.rpc('create_full_profile', {
      p_user_id: userData.id,
      p_email: userData.email,
      p_first_name: userData.firstName || null,
      p_last_name: userData.lastName || null,
      p_full_name: userData.fullName || null,
      p_phone: userData.phone || null,
      p_avatar_url: userData.avatarUrl || null,
    });

    if (error) {
      logger.error('PROFILE', 'Profile creation error details', error, {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        userId: logger.maskUserId(userData.id),
      });
      throw new Error(`Failed to create profile: ${error.message}`);
    }

    if (!data || !data.success) {
      throw new Error(
        'Profile creation failed: Invalid response from stored procedure'
      );
    }

    logger.auth.info(
      `User profile creation completed for user ${logger.maskUserId(userData.id)}`,
      {
        profileCreated: !!data.profile,
        settingsCreated: !!data.settings,
        subscriptionCreated: !!data.subscription,
      }
    );

    return { success: true, data: data as CreateProfileResponse };
  } catch (error: any) {
    logger.error('PROFILE', 'Error creating user profile', error);
    throw error;
  }
}

/**
 * Creates profile from Supabase Auth user object
 * Extracts data from user metadata and creates profile
 */
export async function createProfileFromAuthUser(user: User) {
  // Guard against null/undefined email (common with some OAuth providers like Apple)
  if (!user.email) {
    throw new Error(
      `Cannot create profile: User email is required but was not provided by the authentication provider. User ID: ${logger.maskUserId(user.id)}`
    );
  }

  const metadata = user.user_metadata || {};

  // Extract names with fallbacks for different OAuth providers
  const firstName =
    metadata.first_name || metadata.given_name || metadata.name?.split(' ')[0];
  const lastName =
    metadata.last_name ||
    metadata.family_name ||
    metadata.name?.split(' ').slice(1).join(' ');
  const fullName =
    metadata.full_name ||
    metadata.name ||
    metadata.display_name ||
    (firstName && lastName
      ? `${firstName} ${lastName}`
      : firstName || lastName);

  const profileData: CreateProfileData = {
    id: user.id,
    email: user.email,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    fullName: fullName || undefined,
    phone: metadata.phone || undefined,
    avatarUrl: metadata.avatar_url || metadata.picture || undefined,
  };

  logger.auth.info(`Creating profile from auth user:`, {
    userId: logger.maskUserId(user.id),
    email: logger.maskEmail(user.email),
    hasFirstName: !!profileData.firstName,
    hasLastName: !!profileData.lastName,
    hasPhone: !!profileData.phone,
    provider: metadata.provider || 'email',
  });

  return await createUserProfile(profileData);
}

/**
 * Checks if a user profile exists
 * Throws errors for non-"not found" cases to prevent masking real issues
 *
 * Note: This function is primarily used for debugging and testing purposes.
 * The main application flow uses atomic upsert operations via ensureUserProfile()
 * to prevent race conditions.
 */
export async function checkProfileExists(userId: string): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .single();

  // If no error, profile exists
  if (!error) {
    return !!data;
  }

  // Check if this is a "row not found" error (PGRST116)
  // This is the expected error when a profile doesn't exist
  if (error.code === 'PGRST116') {
    return false;
  }

  // For any other error (network, permission, etc.), throw it
  // so calling functions can handle appropriately
  logger.error('PROFILE', 'Database error checking profile existence', error, {
    code: error.code,
    message: error.message,
    details: error.details,
    userId: logger.maskUserId(userId),
  });

  throw new Error(`Failed to check profile existence: ${error.message}`);
}

/**
 * Ensures a user has a complete profile setup
 * Uses atomic upsert operation to prevent race conditions
 * The stored procedure handles conflicts gracefully with ON CONFLICT clauses
 */
export async function ensureUserProfile(user: User) {
  try {
    // Directly attempt profile creation - the stored procedure handles
    // conflicts gracefully with ON CONFLICT DO UPDATE clauses
    // This eliminates the race condition from separate check-then-create operations
    logger.auth.info(
      `Ensuring profile exists for user ${logger.maskUserId(user.id)}`
    );
    await createProfileFromAuthUser(user);

    return { success: true };
  } catch (error: any) {
    // Log the error but check if it's a benign conflict error
    logger.error('PROFILE', 'Error ensuring user profile', error);

    // If the error indicates the profile already exists (which can happen
    // in race conditions), we can consider this a success
    if (
      error.message?.includes('duplicate key value violates unique constraint')
    ) {
      logger.auth.info(
        `Profile already exists for user ${logger.maskUserId(user.id)} - race condition handled gracefully`
      );
      return { success: true };
    }

    // For any other error, re-throw it
    throw error;
  }
}

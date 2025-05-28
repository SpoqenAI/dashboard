import { getSupabaseClient } from './supabase/client';
import type { User } from '@supabase/supabase-js';

export interface CreateProfileData {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phone?: string;
  avatarUrl?: string;
}

/**
 * Creates a complete user profile with all related records
 * This function replicates the behavior of the handle_new_user() database function
 */
export async function createUserProfile(userData: CreateProfileData) {
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
    if (userData.phone && userData.phone.trim()) {
      const phoneRegex = /^[\+]?[0-9\(\)\-\s\.]{10,}$/;
      if (!phoneRegex.test(userData.phone)) {
        throw new Error(`Invalid phone number format: ${userData.phone}`);
      }
    }

    // Validate avatar URL if provided
    if (userData.avatarUrl && userData.avatarUrl.trim()) {
      if (!userData.avatarUrl.match(/^https?:\/\/.*/)) {
        throw new Error(`Invalid avatar URL format: ${userData.avatarUrl}`);
      }
    }

    // Start transaction-like operations
    const operations = [];

    // 1. Create profile record
    const profileData = {
      id: userData.id,
      email: userData.email,
      first_name: userData.firstName?.trim() || null,
      last_name: userData.lastName?.trim() || null,
      full_name: userData.fullName?.trim() || null,
      phone: userData.phone?.trim() || null,
      avatar_url: userData.avatarUrl?.trim() || null,
      last_login: new Date().toISOString(),
    };

    const { data: profileResult, error: profileError } = await supabase
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' })
      .select()
      .single();

    if (profileError) {
      console.error('Profile upsert error details:', {
        code: profileError.code,
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
        userId: userData.id
      });
      throw new Error(`Failed to upsert profile: ${profileError.message}`);
    } else {
      console.log('Profile upserted successfully:', profileResult?.id);
    }

    // 2. Create user settings with defaults
    const { error: settingsError } = await supabase
      .from('user_settings')
      .upsert({ id: userData.id }, { onConflict: 'id' })
      .select()
      .single();

    if (settingsError) {
      throw new Error(`Failed to upsert user settings: ${settingsError.message}`);
    }

    // 3. Create user subscription with free plan
    const { error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .upsert({ 
        id: userData.id,
        plan_type: 'free',
        status: 'active'
      }, { onConflict: 'id' })
      .select()
      .single();

    if (subscriptionError) {
      throw new Error(`Failed to upsert user subscription: ${subscriptionError.message}`);
    }

    console.log(`User profile creation completed for user ${userData.id}`);
    return { success: true };

  } catch (error: any) {
    console.error('Error creating user profile:', error);
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
    throw new Error(`Cannot create profile: User email is required but was not provided by the authentication provider. User ID: ${user.id}`);
  }

  const metadata = user.user_metadata || {};
  
  // Extract names with fallbacks for different OAuth providers
  const firstName = metadata.first_name || metadata.given_name || metadata.name?.split(' ')[0];
  const lastName = metadata.last_name || metadata.family_name || metadata.name?.split(' ').slice(1).join(' ');
  const fullName = metadata.full_name || metadata.name || metadata.display_name || 
                   (firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName);
  
  const profileData: CreateProfileData = {
    id: user.id,
    email: user.email,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    fullName: fullName || undefined,
    phone: user.phone || metadata.phone || undefined,
    avatarUrl: metadata.avatar_url || metadata.picture || undefined,
  };

  console.log('Creating profile from auth user:', {
    userId: user.id,
    email: user.email,
    hasFirstName: !!profileData.firstName,
    hasLastName: !!profileData.lastName,
    hasPhone: !!profileData.phone,
    provider: metadata.provider || 'email'
  });

  return await createUserProfile(profileData);
}

/**
 * Checks if a user profile exists
 */
export async function checkProfileExists(userId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .single();

  return !error && !!data;
}

/**
 * Ensures a user has a complete profile setup
 * Creates missing profile if it doesn't exist
 */
export async function ensureUserProfile(user: User) {
  try {
    const profileExists = await checkProfileExists(user.id);
    
    if (!profileExists) {
      console.log(`Creating missing profile for user ${user.id}`);
      await createProfileFromAuthUser(user);
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('Error ensuring user profile:', error);
    throw error;
  }
} 
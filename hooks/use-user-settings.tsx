'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useAuth } from './use-auth';
import { updateUserEmail } from '@/lib/auth';
import { toast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger';

export interface UserSettings {
  id: string;
  ai_greeting: string;
  assistant_name: string;
  email_notifications: boolean;
  sms_notifications: boolean;
  billing_notifications: boolean;
  marketing_emails: boolean;
  theme: 'light' | 'dark' | 'system';
  timezone: string;
  language: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  business_name: string | null;
  email: string;
  phone: string | null;
  bio: string | null;
  website: string | null;
  license_number: string | null;
  brokerage: string | null;
  street_address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  formatted_address: string | null;
  avatar_url: string | null;
}

export interface AIReceptionistSettings {
  aiAssistantName: string;
  yourName: string;
  businessName: string;
  greetingScript: string;
}

export interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  businessName: string;
  bio: string;
  licenseNumber: string;
  brokerage: string;
  website: string;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  formattedAddress: string;
  assistantName: string;
}

export interface ProfileUpdateData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  businessName: string;
  bio: string;
  licenseNumber: string;
  brokerage: string;
  website: string;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  formattedAddress: string;
}

export function useUserSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  const supabase = getSupabaseClient();

  // Fetch user settings and profile
  const fetchUserData = useCallback(
    async (signal?: AbortSignal) => {
      if (!user) {
        setLoading(false);
        setDataLoaded(false);
        return;
      }

      // Check if already aborted before starting
      if (signal?.aborted) {
        return;
      }

      try {
        setError(null);
        setLoading(true);
        setDataLoaded(false);

        // Check abort signal before making requests
        if (signal?.aborted) {
          return;
        }

        // Fetch both settings and profile data in parallel
        const [settingsResponse, profileResponse] = await Promise.all([
          supabase.from('user_settings').select('*').eq('id', user.id).single(),
          supabase
            .from('profiles')
            .select(
              'id, first_name, last_name, full_name, business_name, email, phone, bio, website, license_number, brokerage, street_address, city, state, postal_code, country, formatted_address, avatar_url'
            )
            .eq('id', user.id)
            .single(),
        ]);

        // Check abort signal after requests complete
        if (signal?.aborted) {
          return;
        }

        const { data: settingsData, error: settingsError } = settingsResponse;
        const { data: profileData, error: profileError } = profileResponse;

        // Handle settings errors (ignore not found)
        if (settingsError && settingsError.code !== 'PGRST116') {
          throw settingsError;
        }

        // Handle profile errors (ignore not found)
        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }

        // If no settings exist, create default settings
        if (!settingsData) {
          // Check abort signal before creating new settings
          if (signal?.aborted) {
            return;
          }

          const { data: newSettings, error: createError } = await supabase
            .from('user_settings')
            .insert({
              id: user.id,
              ai_greeting:
                'Hello! Thank you for calling. How can I assist you today?',
              assistant_name: 'Ava',
            })
            .select()
            .single();

          if (createError) {
            throw createError;
          }

          // Final abort check before updating state
          if (signal?.aborted) {
            return;
          }

          setSettings(newSettings);
        } else {
          // Final abort check before updating state
          if (signal?.aborted) {
            return;
          }

          setSettings(settingsData);
        }

        // Final abort check before updating profile state
        if (signal?.aborted) {
          return;
        }

        setProfile(profileData);
        setDataLoaded(true);
      } catch (err: any) {
        // Don't update error state if request was aborted
        if (signal?.aborted) {
          return;
        }

        logger.error(
          'USER_SETTINGS',
          'Error fetching user data',
          err instanceof Error ? err : new Error(String(err)),
          {
            userId: logger.maskUserId(user?.id),
          }
        );
        setError(err.message);
        setDataLoaded(false);
        toast({
          title: 'Error loading settings',
          description: 'Failed to load your settings. Please try again.',
          variant: 'destructive',
        });
      } finally {
        // Only update loading state if not aborted
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [user, supabase]
  );

  // Update AI Receptionist settings
  const updateAIReceptionistSettings = async (
    newSettings: AIReceptionistSettings
  ) => {
    if (!user || !settings) {
      throw new Error('User not authenticated or settings not loaded');
    }

    setSaving(true);
    setError(null);

    try {
      // Prepare profile updates if name or business name changed
      const profileUpdates: Partial<UserProfile> = {};

      if (newSettings.yourName !== (profile?.full_name || '')) {
        profileUpdates.full_name = newSettings.yourName;
        // Try to split full name into first and last name
        const nameParts = newSettings.yourName.trim().split(' ');
        if (nameParts.length >= 2) {
          profileUpdates.first_name = nameParts[0];
          profileUpdates.last_name = nameParts.slice(1).join(' ');
        } else {
          profileUpdates.first_name = newSettings.yourName;
          profileUpdates.last_name = null;
        }
      }

      if (newSettings.businessName !== (profile?.business_name || '')) {
        profileUpdates.business_name = newSettings.businessName;
      }

      // Use stored procedure for atomic updates across both tables
      const { data: result, error } = await supabase.rpc('update_ai_settings', {
        p_user_id: user.id,
        p_assistant_name: newSettings.aiAssistantName,
        p_ai_greeting: newSettings.greetingScript,
        p_first_name:
          'first_name' in profileUpdates ? profileUpdates.first_name : null,
        p_last_name:
          'last_name' in profileUpdates ? profileUpdates.last_name : null,
        p_business_name:
          'business_name' in profileUpdates
            ? profileUpdates.business_name
            : null,
      });

      if (error) {
        throw error;
      }

      // Verify that the update operation returned data
      if (!result || !result.success) {
        throw new Error(
          'Settings update failed: No valid response from stored procedure'
        );
      }

      // Update local state with the returned data from the stored procedure
      if (result.settings) {
        setSettings(result.settings as UserSettings);
      }

      // Update profile state if profile was updated
      if (result.profile_updated && result.profile) {
        setProfile(result.profile as UserProfile);
      }

      toast({
        title: 'Settings saved!',
        description: 'Your AI Receptionist settings have been updated.',
      });
    } catch (err: any) {
      logger.error(
        'USER_SETTINGS',
        'Error updating AI settings',
        err instanceof Error ? err : new Error(String(err)),
        {
          userId: logger.maskUserId(user?.id),
          hasProfile: !!profile,
        }
      );
      setError(err.message);
      toast({
        title: 'Error saving settings',
        description: 'Failed to save your settings. Please try again.',
        variant: 'destructive',
      });
      throw err;
    } finally {
      setSaving(false);
    }
  };

  // Update user settings (notifications, theme, etc.)
  const updateUserSettings = async (settingsData: Partial<UserSettings>) => {
    if (!user || !settings) {
      throw new Error('User not authenticated or settings not loaded');
    }

    setSaving(true);
    setError(null);

    try {
      // Update user settings
      const { data: updatedSettings, error: settingsError } = await supabase
        .from('user_settings')
        .update(settingsData)
        .eq('id', user.id)
        .select()
        .single();

      if (settingsError) {
        throw settingsError;
      }

      // Verify that the update operation returned data
      if (!updatedSettings) {
        throw new Error(
          'Settings update failed: No data returned from database'
        );
      }

      // Update local state with the actual returned data from the database
      setSettings(updatedSettings as UserSettings);

      toast({
        title: 'Settings updated!',
        description: 'Your notification preferences have been saved.',
      });
    } catch (err: any) {
      logger.error(
        'USER_SETTINGS',
        'Error updating user settings',
        err instanceof Error ? err : new Error(String(err)),
        {
          userId: logger.maskUserId(user?.id),
          settingsKeys: Object.keys(settingsData),
        }
      );
      setError(err.message);
      toast({
        title: 'Error saving settings',
        description: 'Failed to save your settings. Please try again.',
        variant: 'destructive',
      });
      throw err;
    } finally {
      setSaving(false);
    }
  };

  // Update profile data
  const updateProfile = async (profileData: ProfileUpdateData) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    setSaving(true);
    setError(null);

    try {
      // Check if email is being changed
      const currentEmail = profile?.email || user.email;
      const newEmail = profileData.email.trim();
      const isEmailChanging = currentEmail !== newEmail;

      // If email is changing, we need to handle Supabase Auth email verification
      if (isEmailChanging) {
        // First, trigger Supabase Auth email update (this will send verification emails)
        const { data: authData, error: authError } =
          await updateUserEmail(newEmail);

        if (authError) {
          // Handle specific auth errors
          if (authError.message?.includes('email_address_not_authorized')) {
            throw new Error(
              'This email address is not authorized. Please use a different email.'
            );
          } else if (
            authError.message?.includes('email_change_token_already_sent')
          ) {
            throw new Error(
              'Email verification already sent. Please check your email and try again later.'
            );
          } else if (authError.message?.includes('same_email')) {
            throw new Error(
              'The new email address is the same as your current email.'
            );
          } else {
            throw new Error(`Email update failed: ${authError.message}`);
          }
        }

        // Show success message for email verification
        toast({
          title: 'Email Verification Required',
          description:
            'Please check both your current and new email addresses for verification links. Your email will be updated after verification.',
        });

        // Update profile data excluding email (email will be updated after verification)
        const { email: _, ...profileDataWithoutEmail } = profileData;
        const profileUpdates: Partial<UserProfile> = {
          first_name: profileDataWithoutEmail.firstName.trim() || null,
          last_name: profileDataWithoutEmail.lastName.trim() || null,
          full_name:
            `${profileDataWithoutEmail.firstName.trim()} ${profileDataWithoutEmail.lastName.trim()}`.trim() ||
            null,
          phone: profileDataWithoutEmail.phone.trim() || null,
          business_name: profileDataWithoutEmail.businessName.trim() || null,
          bio: profileDataWithoutEmail.bio.trim() || null,
          website: profileDataWithoutEmail.website.trim() || null,
          license_number: profileDataWithoutEmail.licenseNumber.trim() || null,
          brokerage: profileDataWithoutEmail.brokerage.trim() || null,
          street_address: profileDataWithoutEmail.streetAddress.trim() || null,
          city: profileDataWithoutEmail.city.trim() || null,
          state: profileDataWithoutEmail.state.trim() || null,
          postal_code: profileDataWithoutEmail.postalCode.trim() || null,
          country: profileDataWithoutEmail.country.trim() || null,
          formatted_address:
            profileDataWithoutEmail.formattedAddress.trim() || null,
        };

        // Update or insert profile without email
        const { data: updatedProfile, error: profileError } = await supabase
          .from('profiles')
          .upsert(
            {
              id: user.id,
              ...profileUpdates,
            },
            {
              onConflict: 'id',
            }
          )
          .select()
          .single();

        if (profileError) {
          throw profileError;
        }

        // Update local state with the returned data (keeping current email)
        if (updatedProfile) {
          setProfile(updatedProfile as UserProfile);
        }
      } else {
        // Email is not changing, proceed with normal profile update
        const profileUpdates: Partial<UserProfile> = {
          first_name: profileData.firstName.trim() || null,
          last_name: profileData.lastName.trim() || null,
          full_name:
            `${profileData.firstName.trim()} ${profileData.lastName.trim()}`.trim() ||
            null,
          email: profileData.email.trim(),
          phone: profileData.phone.trim() || null,
          business_name: profileData.businessName.trim() || null,
          bio: profileData.bio.trim() || null,
          website: profileData.website.trim() || null,
          license_number: profileData.licenseNumber.trim() || null,
          brokerage: profileData.brokerage.trim() || null,
          street_address: profileData.streetAddress.trim() || null,
          city: profileData.city.trim() || null,
          state: profileData.state.trim() || null,
          postal_code: profileData.postalCode.trim() || null,
          country: profileData.country.trim() || null,
          formatted_address: profileData.formattedAddress.trim() || null,
        };

        // Update or insert profile
        const { data: updatedProfile, error: profileError } = await supabase
          .from('profiles')
          .upsert(
            {
              id: user.id,
              ...profileUpdates,
            },
            {
              onConflict: 'id',
            }
          )
          .select()
          .single();

        if (profileError) {
          throw profileError;
        }

        // Verify that the upsert operation returned data
        if (!updatedProfile) {
          throw new Error(
            'Profile update failed: No data returned from database'
          );
        }

        // Update local state with the actual returned data from the database
        setProfile(updatedProfile as UserProfile);

        toast({
          title: 'Profile updated!',
          description: 'Your profile information has been saved.',
        });
      }
    } catch (err: any) {
      logger.error(
        'USER_SETTINGS',
        'Error updating profile',
        err instanceof Error ? err : new Error(String(err)),
        {
          userId: logger.maskUserId(user?.id),
        }
      );
      setError(err.message);
      toast({
        title: 'Error saving profile',
        description:
          err.message || 'Failed to save your profile. Please try again.',
        variant: 'destructive',
      });
      throw err;
    } finally {
      setSaving(false);
    }
  };

  // Update address information specifically
  const updateAddress = async (addressData: {
    street_address?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
    formatted_address?: string;
  }) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      setSaving(true);
      setError(null);

      const addressUpdates = {
        street_address: addressData.street_address?.trim() || null,
        city: addressData.city?.trim() || null,
        state: addressData.state?.trim() || null,
        postal_code: addressData.postal_code?.trim() || null,
        country: addressData.country?.trim() || null,
        formatted_address: addressData.formatted_address?.trim() || null,
      };

      const { data: updatedProfile, error: profileError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            ...addressUpdates,
          },
          {
            onConflict: 'id',
          }
        )
        .select()
        .single();

      if (profileError) {
        throw profileError;
      }

      if (updatedProfile) {
        setProfile(updatedProfile as UserProfile);
      }

      toast({
        title: 'Address updated!',
        description: 'Your address information has been saved.',
      });

      return updatedProfile;
    } catch (err: any) {
      logger.error(
        'USER_SETTINGS',
        'Error updating address',
        err instanceof Error ? err : new Error(String(err)),
        {
          userId: logger.maskUserId(user?.id),
        }
      );
      setError(err.message);
      toast({
        title: 'Error saving address',
        description:
          err.message || 'Failed to save your address. Please try again.',
        variant: 'destructive',
      });
      throw err;
    } finally {
      setSaving(false);
    }
  };

  // Get current profile data for form
  const getProfileFormData = useCallback((): ProfileFormData => {
    // Only return data if profile has been loaded
    if (!dataLoaded) {
      return {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        businessName: '',
        bio: '',
        licenseNumber: '',
        brokerage: '',
        website: '',
        streetAddress: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
        formattedAddress: '',
        assistantName: '',
      };
    }

    return {
      firstName: profile?.first_name || '',
      lastName: profile?.last_name || '',
      email: profile?.email || '',
      phone: profile?.phone || '',
      businessName: profile?.business_name || '',
      bio: profile?.bio || '',
      licenseNumber: profile?.license_number || '',
      brokerage: profile?.brokerage || '',
      website: profile?.website || '',
      streetAddress: (profile as any)?.street_address || '',
      city: profile?.city || '',
      state: profile?.state || '',
      postalCode: (profile as any)?.postal_code || '',
      country: (profile as any)?.country || 'United States',
      formattedAddress: (profile as any)?.formatted_address || '',
      assistantName: settings?.assistant_name || 'Ava',
    };
  }, [dataLoaded, profile, settings]);

  // Get current AI Receptionist settings
  const getAIReceptionistSettings = useCallback((): AIReceptionistSettings => {
    // Only return data if both settings and profile have been loaded
    if (!dataLoaded) {
      return {
        aiAssistantName: '',
        yourName: '',
        businessName: '',
        greetingScript: '',
      };
    }

    return {
      aiAssistantName: settings?.assistant_name || 'Ava',
      yourName: profile?.full_name || '',
      businessName: profile?.business_name || '',
      greetingScript:
        settings?.ai_greeting ||
        'Hello! Thank you for calling. How can I assist you today?',
    };
  }, [dataLoaded, settings, profile]);

  // Wrapper for manual refetch that doesn't use abort signal
  const refetch = useCallback(() => {
    return fetchUserData();
  }, [fetchUserData]);

  useEffect(() => {
    if (user) {
      const abortController = new AbortController();
      fetchUserData(abortController.signal);

      // Return cleanup function to abort ongoing requests
      return () => {
        abortController.abort();
      };
    } else {
      // Reset state when user logs out
      setSettings(null);
      setProfile(null);
      setDataLoaded(false);
      setLoading(false);
      setError(null);
    }
  }, [user, fetchUserData]);

  return {
    settings,
    profile,
    loading,
    saving,
    error,
    dataLoaded,
    userId: user?.id,
    updateAIReceptionistSettings,
    getAIReceptionistSettings,
    updateProfile,
    updateUserSettings,
    getProfileFormData,
    refetch,
    updateAddress,
  };
}

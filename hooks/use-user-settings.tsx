'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useAuth } from './use-auth';
import { toast } from '@/components/ui/use-toast';

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
  city: string | null;
  state: string | null;
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
  city: string;
  state: string;
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
  city: string;
  state: string;
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
  const fetchUserData = async () => {
    if (!user) {
      setLoading(false);
      setDataLoaded(false);
      return;
    }

    try {
      setError(null);
      setLoading(true);
      setDataLoaded(false);
      
      // Fetch both settings and profile data in parallel
      const [settingsResponse, profileResponse] = await Promise.all([
        supabase
          .from('user_settings')
          .select('*')
          .eq('id', user.id)
          .single(),
        supabase
          .from('profiles')
          .select('id, first_name, last_name, full_name, business_name, email, phone, bio, website, license_number, brokerage, city, state, avatar_url')
          .eq('id', user.id)
          .single()
      ]);

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
        const { data: newSettings, error: createError } = await supabase
          .from('user_settings')
          .insert({
            id: user.id,
            ai_greeting: 'Hello! Thank you for calling. How can I assist you today?',
            assistant_name: 'Ava',
          })
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        setSettings(newSettings);
      } else {
        setSettings(settingsData);
      }

      setProfile(profileData);
      setDataLoaded(true);
    } catch (err: any) {
      console.error('Error fetching user data:', err);
      setError(err.message);
      setDataLoaded(false);
      toast({
        title: 'Error loading settings',
        description: 'Failed to load your settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Update AI Receptionist settings
  const updateAIReceptionistSettings = async (newSettings: AIReceptionistSettings) => {
    if (!user || !settings) {
      throw new Error('User not authenticated or settings not loaded');
    }

    setSaving(true);
    setError(null);

    try {
      // Update user_settings table
      const { error: settingsError } = await supabase
        .from('user_settings')
        .update({
          assistant_name: newSettings.aiAssistantName,
          ai_greeting: newSettings.greetingScript,
        })
        .eq('id', user.id);

      if (settingsError) {
        throw settingsError;
      }

      // Update profiles table if name or business name changed
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

      if (Object.keys(profileUpdates).length > 0) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', user.id);

        if (profileError) {
          throw profileError;
        }
      }

      // Update local state
      setSettings(prev => prev ? {
        ...prev,
        assistant_name: newSettings.aiAssistantName,
        ai_greeting: newSettings.greetingScript,
      } : null);

      setProfile(prev => prev ? {
        ...prev,
        ...profileUpdates,
      } : null);

      toast({
        title: 'Settings saved!',
        description: 'Your AI Receptionist settings have been updated.',
      });

    } catch (err: any) {
      console.error('Error updating settings:', err);
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
      // Prepare profile updates
      const profileUpdates: Partial<UserProfile> = {
        first_name: profileData.firstName.trim() || null,
        last_name: profileData.lastName.trim() || null,
        full_name: `${profileData.firstName.trim()} ${profileData.lastName.trim()}`.trim() || null,
        email: profileData.email.trim(),
        phone: profileData.phone.trim() || null,
        business_name: profileData.businessName.trim() || null,
        bio: profileData.bio.trim() || null,
        website: profileData.website.trim() || null,
        license_number: profileData.licenseNumber.trim() || null,
        brokerage: profileData.brokerage.trim() || null,
        city: profileData.city.trim() || null,
        state: profileData.state.trim() || null,
      };

      // Update or insert profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            ...profileUpdates,
          },
          {
            onConflict: 'id',
          }
        );

      if (profileError) {
        throw profileError;
      }

      // Update local state
      setProfile(prev => prev ? {
        ...prev,
        ...profileUpdates,
      } : {
        id: user.id,
        ...profileUpdates,
        avatar_url: null,
      } as UserProfile);

      toast({
        title: 'Profile updated!',
        description: 'Your profile information has been saved.',
      });

    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message);
      toast({
        title: 'Error saving profile',
        description: 'Failed to save your profile. Please try again.',
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
        city: '',
        state: '',
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
      city: profile?.city || '',
      state: profile?.state || '',
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
      greetingScript: settings?.ai_greeting || 'Hello! Thank you for calling. How can I assist you today?',
    };
  }, [dataLoaded, settings, profile]);

  useEffect(() => {
    if (user) {
      fetchUserData();
    } else {
      // Reset state when user logs out
      setSettings(null);
      setProfile(null);
      setDataLoaded(false);
      setLoading(false);
      setError(null);
    }
  }, [user]);

  return {
    settings,
    profile,
    loading,
    saving,
    error,
    dataLoaded,
    updateAIReceptionistSettings,
    getAIReceptionistSettings,
    updateProfile,
    getProfileFormData,
    refetch: fetchUserData,
  };
} 
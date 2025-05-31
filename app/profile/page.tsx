'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DashboardHeader } from '@/components/dashboard-header';
import { DashboardShell } from '@/components/dashboard-shell';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Save, Loader2 } from 'lucide-react';
import { useUserSettings } from '@/hooks/use-user-settings';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger';

function ProfilePageContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const {
    profile,
    loading,
    saving,
    error,
    dataLoaded,
    updateProfile,
    getProfileFormData,
    getAIReceptionistSettings,
    updateAIReceptionistSettings,
    refetch,
  } = useUserSettings();

  // Define the form data type
  type FormData = {
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
  };

  // Form state
  const [formData, setFormData] = useState<FormData>({
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
  });

  // Form validation errors
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // Handle email verification success
  useEffect(() => {
    const emailUpdated = searchParams.get('email_updated');
    if (emailUpdated === 'true') {
      toast({
        title: 'Email Updated Successfully',
        description: 'Your email address has been verified and updated.',
      });

      // Refresh profile data to get the updated email
      refetch();

      // Clean up the URL parameter
      const url = new URL(window.location.href);
      url.searchParams.delete('email_updated');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams, refetch]);

  // Update form data when profile data is loaded
  useEffect(() => {
    if (dataLoaded) {
      const profileData = getProfileFormData();
      setFormData(profileData);
    }
  }, [dataLoaded, getProfileFormData]);

  // Handle form field changes
  const handleInputChange = (field: keyof FormData, value: string) => {
    let processedValue = value;

    // Format phone number as user types
    if (field === 'phone') {
      processedValue = formatPhoneNumber(value);
    }

    setFormData(prev => ({
      ...prev,
      [field]: processedValue,
    }));

    // Clear validation error for this field when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  // Phone number formatting function
  const formatPhoneNumber = (value: string): string => {
    // Remove all non-digit and non-plus characters
    const cleaned = value.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('+')) {
      const digits = cleaned.slice(1);
      const limitedDigits = digits.slice(0, 15);
      if (limitedDigits.length === 0) return '+';
      if (limitedDigits.length <= 4) return `+${limitedDigits}`;
      if (limitedDigits.length <= 7)
        return `+${limitedDigits.slice(0, limitedDigits.length - 3)} ${limitedDigits.slice(-3)}`;
      if (limitedDigits.length <= 10)
        return `+${limitedDigits.slice(0, limitedDigits.length - 7)} ${limitedDigits.slice(-7, -4)} ${limitedDigits.slice(-4)}`;
      return `+${limitedDigits.slice(0, limitedDigits.length - 10)} ${limitedDigits.slice(-10, -7)} ${limitedDigits.slice(-7, -4)} ${limitedDigits.slice(-4)}`;
    }
    const digits = cleaned;
    const limitedDigits = digits.slice(0, 10);
    if (limitedDigits.length === 0) return '';
    if (limitedDigits.length <= 3) return `(${limitedDigits}`;
    if (limitedDigits.length <= 6)
      return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3)}`;
    return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`;
  };

  // Email validation patterns
  const EMAIL_PATTERN =
    /^[a-zA-Z0-9]([a-zA-Z0-9._+-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/;

  // Email validation function
  const validateEmail = (value: string): string | null => {
    if (!value) return 'Email address is required';
    if (value.length > 254) return 'Please use a shorter email address';
    if (!EMAIL_PATTERN.test(value))
      return 'Please check your email format (e.g., name@example.com)';
    if (value.includes('..'))
      return 'Please remove consecutive dots from your email';
    if (value.startsWith('.') || value.endsWith('.'))
      return 'Email addresses cannot start or end with a dot';
    if (value.includes('@.') || value.includes('.@'))
      return 'Please check the format around the @ symbol';

    const parts = value.split('@');
    if (parts.length === 2) {
      const domain = parts[1];
      if (!domain.includes('.') || domain.split('.').pop()!.length < 2) {
        return 'Please include a valid domain (e.g., gmail.com)';
      }
    }

    return null;
  };

  // Phone number validation function
  const validatePhoneNumber = (value: string): string | null => {
    if (!value.trim()) return null;

    const digitsOnly = value.replace(/\D/g, '');
    const hasCountryCode = value.startsWith('+');

    if (hasCountryCode) {
      if (digitsOnly.length > 15)
        return 'International numbers cannot exceed 15 digits';
      if (digitsOnly.length >= 10) {
        const countryCodeLength = digitsOnly.length - 10;
        if (countryCodeLength > 4) return 'Please check your country code';
      }
      if (digitsOnly.length < 8)
        return 'Please enter a complete international number';
    } else {
      if (digitsOnly.length > 0 && digitsOnly.length < 10)
        return 'Please enter a complete 10-digit phone number';
      if (digitsOnly.length > 10)
        return 'US phone numbers should be exactly 10 digits';
      if (digitsOnly.length === 10) {
        const areaCode = digitsOnly.substring(0, 3);
        const exchange = digitsOnly.substring(3, 6);
        if (areaCode.startsWith('0') || areaCode.startsWith('1'))
          return 'Please enter a valid area code';
        if (exchange.startsWith('0') || exchange.startsWith('1'))
          return 'Please enter a valid exchange code';
        if (areaCode === '911' || exchange === '911')
          return 'Please use a different phone number';
        if (
          areaCode === '000' ||
          exchange === '000' ||
          (areaCode === '555' && exchange === '555')
        )
          return 'Please enter a valid phone number';
      }
    }

    return null;
  };

  // Form validation function
  const validateForm = () => {
    const errors: Record<string, string> = {};

    // Required field validations
    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }

    // Use the new email validation function
    const emailError = validateEmail(formData.email.trim());
    if (emailError) {
      errors.email = emailError;
    }

    if (!formData.assistantName.trim()) {
      errors.assistantName = 'Assistant name is required';
    }

    // Optional field validations
    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      errors.website = 'Website must start with http:// or https://';
    }

    // Use the new phone validation function
    const phoneError = validatePhoneNumber(formData.phone);
    if (phoneError) {
      errors.phone = phoneError;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form before submission
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors in the form before submitting.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Prepare update operations
      const { assistantName, ...profileData } = formData;
      const currentAISettings = getAIReceptionistSettings();

      // Create array of promises for concurrent execution
      const updatePromises = [updateProfile(profileData)];

      // Only update AI assistant settings if the name has changed
      if (formData.assistantName !== currentAISettings.aiAssistantName) {
        updatePromises.push(
          updateAIReceptionistSettings({
            ...currentAISettings,
            aiAssistantName: formData.assistantName,
          })
        );
      }

      // Execute all updates concurrently
      // Note: If email is being changed, updateProfile will:
      // 1. Trigger Supabase Auth email verification (sends emails to old & new addresses)
      // 2. Update profile data excluding email (email updated after verification)
      // 3. Show verification message to user
      // 4. Email will be updated in profile table via auth callback when verified
      await Promise.all(updatePromises);

      // Show success toast after all updates complete
      // (unless email verification is pending, in which case updateProfile shows its own message)
      const isEmailChanging =
        (profile?.email || user?.email) !== formData.email.trim();
      if (!isEmailChanging) {
        toast({
          title: 'Profile Updated',
          description: 'Your profile has been successfully updated.',
        });
      }
    } catch (error) {
      // Show error toast to inform users of failures
      toast({
        title: 'Update Failed',
        description: 'Failed to update your profile. Please try again.',
        variant: 'destructive',
      });
      logger.error('profile', 'Failed to save profile', error as Error);
    }
  };

  // Handle save changes button click (for backward compatibility)
  const handleSaveChanges = async () => {
    // Create a synthetic form event
    const syntheticEvent = {
      preventDefault: () => {},
    } as React.FormEvent;

    await handleFormSubmit(syntheticEvent);
  };

  // Generate user initials for avatar fallback
  const getUserInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    if (profile?.first_name) {
      return profile.first_name[0].toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  // Get display name for profile section
  const getDisplayName = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    if (profile?.full_name) {
      return profile.full_name;
    }
    if (profile?.first_name) {
      return profile.first_name;
    }
    return user?.email || 'User';
  };

  // Show loading state
  if (loading && !dataLoaded) {
    return (
      <div className="flex min-h-screen flex-col">
        <DashboardHeader />
        <DashboardShell>
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Loading profile...
              </p>
            </div>
          </div>
        </DashboardShell>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <DashboardShell>
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Profile</h2>
        </div>

        <div className="grid gap-6">
          {/* Profile Picture Section */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
              <CardDescription>
                Update your profile picture to personalize your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center space-x-4">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage
                    src={
                      profile?.avatar_url ||
                      user?.user_metadata?.avatar_url ||
                      '/placeholder.svg?height=80&width=80&query=person'
                    }
                    alt="Profile picture"
                  />
                  <AvatarFallback className="text-lg">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">{getDisplayName()}</p>
                <p className="text-sm text-muted-foreground">
                  JPG, PNG or GIF. Max size 2MB.
                </p>
                <Button variant="outline" size="sm">
                  Upload new picture
                </Button>
              </div>
            </CardContent>
          </Card>

          <form onSubmit={handleFormSubmit} className="contents">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Update your personal details and contact information.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={e =>
                        handleInputChange('firstName', e.target.value)
                      }
                      placeholder="Enter your first name"
                      className={
                        validationErrors.firstName ? 'border-red-500' : ''
                      }
                    />
                    {validationErrors.firstName && (
                      <p className="text-sm text-red-500">
                        {validationErrors.firstName}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={e =>
                        handleInputChange('lastName', e.target.value)
                      }
                      placeholder="Enter your last name"
                      className={
                        validationErrors.lastName ? 'border-red-500' : ''
                      }
                    />
                    {validationErrors.lastName && (
                      <p className="text-sm text-red-500">
                        {validationErrors.lastName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="text"
                    value={formData.email}
                    onChange={e => handleInputChange('email', e.target.value)}
                    placeholder="name@example.com"
                    className={validationErrors.email ? 'border-red-500' : ''}
                    maxLength={254}
                    inputMode="email"
                    autoComplete="email"
                  />
                  {validationErrors.email && (
                    <p className="text-sm text-red-500">
                      {validationErrors.email}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={e => handleInputChange('phone', e.target.value)}
                    placeholder="(555) 123-4567 or +1 555 123 4567"
                    className={validationErrors.phone ? 'border-red-500' : ''}
                  />
                  {validationErrors.phone && (
                    <p className="text-sm text-red-500">
                      {validationErrors.phone}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    value={formData.businessName}
                    onChange={e =>
                      handleInputChange('businessName', e.target.value)
                    }
                    placeholder="Enter your business name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell us about yourself and your real estate business..."
                    value={formData.bio}
                    onChange={e => handleInputChange('bio', e.target.value)}
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Business Information */}
            <Card>
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
                <CardDescription>
                  Manage your business details and professional information.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="licenseNumber">
                    Real Estate License Number
                  </Label>
                  <Input
                    id="licenseNumber"
                    value={formData.licenseNumber}
                    onChange={e =>
                      handleInputChange('licenseNumber', e.target.value)
                    }
                    placeholder="Enter your license number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brokerage">Brokerage</Label>
                  <Input
                    id="brokerage"
                    value={formData.brokerage}
                    onChange={e =>
                      handleInputChange('brokerage', e.target.value)
                    }
                    placeholder="Enter your brokerage name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://your-website.com"
                    value={formData.website}
                    onChange={e => handleInputChange('website', e.target.value)}
                    className={validationErrors.website ? 'border-red-500' : ''}
                  />
                  {validationErrors.website && (
                    <p className="text-sm text-red-500">
                      {validationErrors.website}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={e => handleInputChange('city', e.target.value)}
                      placeholder="Enter your city"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={e => handleInputChange('state', e.target.value)}
                      placeholder="Enter your state"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Assistant Information */}
            <Card>
              <CardHeader>
                <CardTitle>Assistant Information</CardTitle>
                <CardDescription>
                  Configure your AI assistant's details.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="assistantName">Assistant Name *</Label>
                  <Input
                    id="assistantName"
                    value={formData.assistantName}
                    onChange={e =>
                      handleInputChange('assistantName', e.target.value)
                    }
                    placeholder="Enter your assistant's name"
                    className={
                      validationErrors.assistantName ? 'border-red-500' : ''
                    }
                  />
                  {validationErrors.assistantName && (
                    <p className="text-sm text-red-500">
                      {validationErrors.assistantName}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Save Changes */}
            <div className="flex justify-end">
              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
          </form>
        </div>
      </DashboardShell>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProfilePageContent />
    </Suspense>
  );
}

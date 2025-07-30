'use client';

import { Suspense, useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { useQueryState } from 'nuqs';
import { Filter } from 'bad-words';
import { isEqual } from 'lodash-es';
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
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DashboardShell } from '@/components/dashboard-shell';
import { Bell, Shield, User } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { useUserSettings } from '@/hooks/use-user-settings';
import { useSubscription } from '@/hooks/use-subscription';
import { isActiveSubscription, formatSubscriptionDate } from '@/lib/paddle';
import { getSubscriptionTier } from '@/lib/paddle';
import dynamic from 'next/dynamic';
const PasswordStrengthBar = dynamic(
  () => import('react-password-strength-bar'),
  { ssr: false }
);
import { logger } from '@/lib/logger';

// Initialize content filter outside component to prevent recreation on every render
const contentFilter = new Filter();
contentFilter.addWords('scam', 'fraud', 'fake', 'illegal', 'drugs');

// Import pricing tiers from pricing page for consistency
const pricingTiers = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    priceIdMonthly: '',
    priceIdAnnual: '',
  },
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 10,
    annualPrice: 8,
    priceIdMonthly:
      process.env.NEXT_PUBLIC_PADDLE_STARTER_MONTHLY_PRICE_ID || '',
    priceIdAnnual: process.env.NEXT_PUBLIC_PADDLE_STARTER_ANNUAL_PRICE_ID || '',
  },
  {
    id: 'pro',
    name: 'Professional',
    monthlyPrice: 30,
    annualPrice: 24,
    priceIdMonthly: process.env.NEXT_PUBLIC_PADDLE_PRO_MONTHLY_PRICE_ID || '',
    priceIdAnnual: process.env.NEXT_PUBLIC_PADDLE_PRO_ANNUAL_PRICE_ID || '',
  },
  {
    id: 'business',
    name: 'Business',
    monthlyPrice: 0,
    annualPrice: 0,
    priceIdMonthly: '',
    priceIdAnnual: '',
  },
];

// Helper function to get tier information based on subscription
const getSubscriptionTierInfo = (subscription: any) => {
  const tier = getSubscriptionTier(subscription);
  const tierNames = {
    free: 'Free',
    starter: 'Starter',
    pro: 'Professional',
    business: 'Business',
  };
  const tierFeatures = {
    free: [
      'AI assistant setup only',
      'Basic greeting customization',
      'Community support',
      'No call handling (setup only)',
    ],
    starter: [
      'Up to 30 calls per month',
      'Basic analytics dashboard',
      'Call summaries & transcripts',
      'Email notifications',
      'Basic AI settings',
      'Email support',
    ],
    pro: [
      'Unlimited calls & minutes',
      'Advanced analytics dashboard',
      'Advanced lead qualification',
      'CRM integrations (Webhook API)',
      'Real-time SMS & email alerts',
      'Custom call scripts & greetings',
      'Priority support',
    ],
    business: [
      'Everything in Professional',
      'Multi-language support',
      'Custom AI training & fine-tuning',
      'Dedicated phone numbers',
      'Advanced integrations (Zapier, etc.)',
      'Custom reporting & analytics',
      'Dedicated account manager',
      'Phone & video support',
      'SLA guarantee',
    ],
  };
  return {
    name: tierNames[tier] || 'Professional',
    features: tierFeatures[tier] || tierFeatures.pro,
  };
};

// Helper function to get the correct price and billing period for a subscription
const getSubscriptionPriceInfo = (subscription: any) => {
  if (!subscription || subscription.tier_type === 'free') {
    return { price: 0, billingPeriod: 'free' };
  }

  // Find the tier that matches the subscription's price_id
  const tier = pricingTiers.find(
    t =>
      t.priceIdMonthly === subscription.price_id ||
      t.priceIdAnnual === subscription.price_id
  );

  if (!tier) {
    // Fallback to tier detection from paddle.ts
    const detectedTier = getSubscriptionTier(subscription);
    const fallbackTier = pricingTiers.find(t => t.id === detectedTier);
    if (fallbackTier) {
      return {
        price: fallbackTier.monthlyPrice,
        billingPeriod: 'monthly',
      };
    }
    return { price: 30, billingPeriod: 'monthly' }; // Default to Pro monthly
  }

  // Determine if it's monthly or annual based on price_id
  const isAnnual = tier.priceIdAnnual === subscription.price_id;

  return {
    price: isAnnual ? tier.annualPrice : tier.monthlyPrice,
    billingPeriod: isAnnual ? 'annual' : 'monthly',
  };
};

function SettingsContent() {
  // Replace useSearchParams with nuqs for tab parameter
  const [tab, setTab] = useQueryState('tab', {
    defaultValue: 'profile',
    clearOnDefault: true,
  });

  // Replace useSearchParams with nuqs for success parameter
  const [success, setSuccess] = useQueryState('success');

  const [confirmOpen, setConfirmOpen] = useState(false);

  // Get user settings and profile data
  const {
    loading,
    saving,
    dataLoaded,
    settings,
    updateProfile,
    updateUserSettings,
    getProfileFormData,
    profile,
  } = useUserSettings();

  // Get subscription data
  const {
    subscription,
    loading: subscriptionLoading,
    refetch: refetchSubscription,
  } = useSubscription();

  // Check for successful payment return
  useEffect(() => {
    if (success === 'true') {
      toast({
        title: 'Payment successful!',
        description: 'Your subscription has been updated successfully.',
      });

      // Trigger subscription refresh when returning from successful payment
      logger.info(
        'SETTINGS',
        'Triggering subscription refresh from success URL'
      );
      setTimeout(async () => {
        try {
          await refetchSubscription();
          logger.info(
            'SETTINGS',
            'Subscription refreshed after success URL return'
          );
        } catch (error) {
          logger.error(
            'SETTINGS',
            'Failed to refresh subscription after success URL',
            error instanceof Error ? error : new Error(String(error))
          );
        }
      }, 1000); // Give the page a moment to load

      // Clean up URL by removing success parameter (nuqs handles this declaratively)
      setSuccess(null);
    }
  }, [success, refetchSubscription, setSuccess]);

  // Form data state - initialized from Supabase data
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    emailNotifications: true,
    marketingEmails: true,
  });

  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>(
    {}
  );
  const [savedData, setSavedData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    emailNotifications: true,
    marketingEmails: true,
  });

  // Load profile data when available
  useEffect(() => {
    if (dataLoaded) {
      const profileData = getProfileFormData();
      const newFormData = {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        email: profileData.email,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        emailNotifications: settings?.email_notifications ?? true,
        marketingEmails: settings?.marketing_emails ?? true,
      };
      setFormData(newFormData);
      setSavedData(newFormData);
    }
  }, [dataLoaded, getProfileFormData, settings]);

  // Validation rules for each field
  const fieldLimits = {
    firstName: { maxLength: 50, minLength: 1 },
    lastName: { maxLength: 50, minLength: 1 },
    email: { maxLength: 254, minLength: 5 },
    currentPassword: { maxLength: 128, minLength: 0 },
    newPassword: { maxLength: 128, minLength: 0 },
    confirmPassword: { maxLength: 128, minLength: 0 },
  };

  // Regex patterns for field validation - extracted to prevent ReDoS attacks
  const VALIDATION_PATTERNS = {
    // Names: letters, single spaces (no consecutive), basic punctuation (limited)
    // Updated to support Unicode letters including accented and international characters
    NAME_PATTERN: /^[\p{L}](?:[\p{L}\s\-'.])*[\p{L}]$|^[\p{L}]$/u,

    // Email pattern supporting RFC-5322 compliant characters including '+' in local part
    // Allows letters, numbers, dots, underscores, hyphens, and plus signs in local part
    EMAIL_PATTERN:
      /^[a-zA-Z0-9]([a-zA-Z0-9._+-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/,
  };

  // Helper to remove spaces from email
  const removeSpaces = (value: string): string => value.replace(/\s/g, '');

  // Handle field blur (when user leaves the field) - for consistent UX with signup page
  const handleFieldBlur = (field: string) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));

    let valueToValidate = formData[field as keyof typeof formData];

    // Auto-trim name fields when user leaves the field
    if (field === 'firstName' || field === 'lastName') {
      const trimmedValue = (valueToValidate as string).trim();
      setFormData(prev => ({ ...prev, [field]: trimmedValue }));
      valueToValidate = trimmedValue;
    }

    const error = validateContent(field, valueToValidate as string);
    setValidationErrors(prev => ({ ...prev, [field]: error || '' }));
  };

  const validateContent = (field: string, value: string): string | null => {
    const limits = fieldLimits[field as keyof typeof fieldLimits];

    // Skip validation for empty optional fields
    if (!limits || (value.length === 0 && limits.minLength === 0)) {
      return null;
    }

    // Check length limits
    if (value.length < limits.minLength) {
      return `Minimum ${limits.minLength} characters required`;
    }
    if (value.length > limits.maxLength) {
      return `Maximum ${limits.maxLength} characters allowed`;
    }

    // Check for inappropriate content (only for text fields)
    if (['firstName', 'lastName'].includes(field)) {
      if (contentFilter.isProfane(value)) {
        return 'Please use professional, appropriate language';
      }
    }

    // Field-specific validation using extracted patterns
    switch (field) {
      case 'firstName':
      case 'lastName':
        if (!VALIDATION_PATTERNS.NAME_PATTERN.test(value)) {
          return 'Names should only contain letters, spaces, and basic punctuation';
        }
        break;

      case 'email': {
        // Check basic format first
        if (!VALIDATION_PATTERNS.EMAIL_PATTERN.test(value)) {
          return 'Please check your email format (e.g., name@example.com)';
        }

        // Additional email validation checks
        if (value.includes('..')) {
          return 'Please remove consecutive dots from your email';
        }

        if (value.startsWith('.') || value.endsWith('.')) {
          return 'Email addresses cannot start or end with a dot';
        }

        if (value.includes('@.') || value.includes('.@')) {
          return 'Please check the format around the @ symbol';
        }

        // Check for valid TLD (at least 2 characters)
        const parts = value.split('@');
        if (parts.length === 2) {
          const domain = parts[1];
          if (!domain.includes('.') || domain.split('.').pop()!.length < 2) {
            return 'Please include a valid domain (e.g., gmail.com)';
          }
        }
        break;
      }

      case 'newPassword': {
        if (!value) return null; // Optional field
        if (value.length < 8) return 'Please use at least 8 characters';
        if (value.length > 128)
          return 'Please keep password under 128 characters';
        if (!/[A-Z]/.test(value))
          return 'Please include at least one uppercase letter';
        if (!/[a-z]/.test(value))
          return 'Please include at least one lowercase letter';
        if (!/[0-9]/.test(value)) return 'Please include at least one number';
        if (!/[!@#$%^&*(),.?":{}|<>\[\]\\/\-_+=~`';]/.test(value))
          return 'Please include at least one special character (!@#$%^&* etc.)';
        return null;
      }
      case 'confirmPassword': {
        if (!value && !formData.newPassword) return null; // Both empty is OK
        if (!value && formData.newPassword) return 'This field is required';
        const passwordToCompare = formData.newPassword;
        if (value !== passwordToCompare)
          return 'Please make sure both passwords match';
        return null;
      }
    }

    return null;
  };

  const handleInputChange = (field: string, value: string) => {
    let processedValue = value;

    // Remove spaces from email field
    if (field === 'email') {
      processedValue = removeSpaces(value);
    }

    setFormData(prev => ({
      ...prev,
      [field]: processedValue,
    }));

    // Only show validation errors for fields that have been touched
    if (touchedFields[field]) {
      const error = validateContent(field, processedValue);
      setValidationErrors(prev => ({
        ...prev,
        [field]: error || '',
      }));
    }
  };

  // Helper to check if form data has changed
  const isFormChanged = !isEqual(formData, savedData);

  // Refactored save logic
  const doSave = async () => {
    setConfirmOpen(false);
    try {
      // Validate all fields before saving
      const errors: Record<string, string> = {};
      Object.entries(formData).forEach(([field, value]) => {
        if (typeof value === 'string') {
          const error = validateContent(field, value);
          if (error) {
            errors[field] = error;
          }
        }
      });
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        return;
      }

      // Prepare update operations
      const updatePromises = [];

      // Save profile data to Supabase
      updatePromises.push(
        updateProfile({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
        })
      );

      // Check if notification settings have changed and update if needed
      const currentEmailNotifications = settings?.email_notifications ?? true;
      const currentMarketingEmails = settings?.marketing_emails ?? true;

      if (
        formData.emailNotifications !== currentEmailNotifications ||
        formData.marketingEmails !== currentMarketingEmails
      ) {
        updatePromises.push(
          updateUserSettings({
            email_notifications: formData.emailNotifications,
            marketing_emails: formData.marketingEmails,
          })
        );
      }

      // Execute all updates concurrently
      await Promise.all(updatePromises);

      setSavedData({ ...formData });
    } catch (error) {
      logger.error(
        'SETTINGS',
        'Error saving settings',
        error instanceof Error ? error : new Error(String(error))
      );
      // Error toast is handled by the updateProfile and updateUserSettings functions
    }
  };

  // Cancel logic for General tab
  const handleCancel = () => {
    setFormData({ ...savedData });
    setValidationErrors({});
  };

  // Handle subscription upgrade via pricing page
  const handleUpgradePlan = () => {
    // Redirect to pricing page for comprehensive plan selection
    window.location.href = '/pricing';
  };

  // Handle subscription management
  const handleManageSubscription = async () => {
    if (!subscription) {
      toast({
        title: 'Error',
        description: 'No active subscription found.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const res = await fetch('/api/paddle/manage-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId: subscription.id }),
      });

      if (!res.ok) throw new Error('Failed to fetch management URL');

      const { url } = await res.json();
      if (!url) throw new Error('Management URL missing in response');

      window.open(url as string, '_blank');
    } catch (err) {
      logger.error(
        'SETTINGS',
        'Error opening subscription management page',
        err instanceof Error ? err : new Error(String(err))
      );
      toast({
        title: 'Unable to open management page',
        description:
          'Please try again later or contact support if the problem persists.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardShell>
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        </div>
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile">General</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>
          <TabsContent value="profile" className="space-y-4">
            {loading || !dataLoaded ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
                  <p className="text-muted-foreground">
                    Loading your profile...
                  </p>
                </div>
              </div>
            ) : (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  if (
                    !Object.values(validationErrors).some(error => error) &&
                    isFormChanged
                  ) {
                    setConfirmOpen(true);
                  }
                }}
                className="space-y-4"
              >
                {/* Profile Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Profile Information
                    </CardTitle>
                    <CardDescription>
                      Manage your personal information and account details.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Profile Picture */}
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <Avatar className="h-20 w-20">
                          {profile?.avatar_url ? (
                            <AvatarImage
                              src={profile.avatar_url}
                              alt="Profile picture"
                            />
                          ) : null}
                          <AvatarFallback className="text-lg">
                            {formData.firstName.charAt(0)}
                            {formData.lastName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <Button
                          size="sm"
                          variant="outline"
                          className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                        >
                          📷
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Profile Picture</p>
                        <p className="text-sm text-muted-foreground">
                          JPG, PNG or GIF. Max size 2MB.
                        </p>
                        <Button variant="outline" size="sm">
                          Upload new picture
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    {/* Basic Information */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="font-medium">First Name</label>
                        <input
                          type="text"
                          className={`w-full rounded-md border p-2 focus:border-black focus:outline-none focus:ring-1 focus:ring-black ${
                            validationErrors.firstName
                              ? 'border-red-500 bg-background'
                              : 'bg-background'
                          }`}
                          value={formData.firstName}
                          onChange={e =>
                            handleInputChange('firstName', e.target.value)
                          }
                          onBlur={() => handleFieldBlur('firstName')}
                          maxLength={50}
                        />
                        {validationErrors.firstName && (
                          <p className="text-sm text-red-500">
                            {validationErrors.firstName}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
                          {formData.firstName.length}/50 characters
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="font-medium">Last Name</label>
                        <input
                          type="text"
                          className={`w-full rounded-md border p-2 focus:border-black focus:outline-none focus:ring-1 focus:ring-black ${
                            validationErrors.lastName
                              ? 'border-red-500 bg-background'
                              : 'bg-background'
                          }`}
                          value={formData.lastName}
                          onChange={e =>
                            handleInputChange('lastName', e.target.value)
                          }
                          onBlur={() => handleFieldBlur('lastName')}
                          maxLength={50}
                        />
                        {validationErrors.lastName && (
                          <p className="text-sm text-red-500">
                            {validationErrors.lastName}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
                          {formData.lastName.length}/50 characters
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="text"
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={e =>
                          handleInputChange('email', e.target.value)
                        }
                        onBlur={() => handleFieldBlur('email')}
                        required
                        aria-invalid={!!validationErrors.email}
                        maxLength={254}
                        inputMode="email"
                        autoComplete="email"
                      />
                      {validationErrors.email && (
                        <p className="text-sm text-muted-foreground">
                          {validationErrors.email}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Notification Preferences */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      Notification Preferences
                    </CardTitle>
                    <CardDescription>
                      Configure how you want to receive notifications and
                      updates.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="email-notifications">
                          Email Notifications
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Receive notifications about new calls and messages via
                          email
                        </p>
                      </div>
                      <Switch
                        id="email-notifications"
                        checked={formData.emailNotifications}
                        onCheckedChange={checked =>
                          setFormData(prev => ({
                            ...prev,
                            emailNotifications: checked,
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="marketing-emails">
                          Marketing Emails
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Receive updates about new features and tips
                        </p>
                      </div>
                      <Switch
                        id="marketing-emails"
                        checked={formData.marketingEmails}
                        onCheckedChange={checked =>
                          setFormData(prev => ({
                            ...prev,
                            marketingEmails: checked,
                          }))
                        }
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Security Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Security Settings
                    </CardTitle>
                    <CardDescription>
                      Manage your password and security preferences.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        placeholder="Enter your current password"
                        value={formData.currentPassword}
                        onChange={e =>
                          handleInputChange('currentPassword', e.target.value)
                        }
                        onBlur={() => handleFieldBlur('currentPassword')}
                        aria-invalid={!!validationErrors.currentPassword}
                        maxLength={128}
                      />
                      {validationErrors.currentPassword && (
                        <p className="text-sm text-muted-foreground">
                          {validationErrors.currentPassword}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        placeholder="Create a new password"
                        value={formData.newPassword}
                        onChange={e =>
                          handleInputChange('newPassword', e.target.value)
                        }
                        onBlur={() => handleFieldBlur('newPassword')}
                        aria-invalid={!!validationErrors.newPassword}
                        maxLength={128}
                      />
                      <PasswordStrengthBar
                        password={formData.newPassword}
                        minLength={8}
                        scoreWords={[
                          'Too weak',
                          'Weak',
                          'Okay',
                          'Strong',
                          'Very strong',
                        ]}
                      />
                      {validationErrors.newPassword && (
                        <p className="text-sm text-muted-foreground">
                          {validationErrors.newPassword}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">
                        Confirm New Password
                      </Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirm your new password"
                        value={formData.confirmPassword}
                        onChange={e =>
                          handleInputChange('confirmPassword', e.target.value)
                        }
                        onBlur={() => handleFieldBlur('confirmPassword')}
                        aria-invalid={!!validationErrors.confirmPassword}
                        maxLength={128}
                      />
                      {validationErrors.confirmPassword && (
                        <p className="text-sm text-muted-foreground">
                          {validationErrors.confirmPassword}
                        </p>
                      )}
                    </div>

                    <Button variant="outline">Change Password</Button>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="two-factor">
                          Two-Factor Authentication
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Add an extra layer of security to your account
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        Enable 2FA
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Save Changes */}
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={!isFormChanged || saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      saving ||
                      Object.values(validationErrors).some(error => error) ||
                      !isFormChanged
                    }
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Save</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to save these changes to your
                          settings? This action will update your settings
                          immediately.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel asChild>
                          <Button
                            variant="outline"
                            onClick={() => setConfirmOpen(false)}
                          >
                            Cancel
                          </Button>
                        </AlertDialogCancel>
                        <AlertDialogAction asChild>
                          <Button onClick={doSave}>Confirm</Button>
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </form>
            )}
          </TabsContent>

          <TabsContent value="billing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Your Subscription</CardTitle>
                <CardDescription>
                  Upgrade, downgrade, or update payment details anytime.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {subscriptionLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="mx-auto mb-4 h-6 w-6 animate-spin rounded-full border-b-2 border-gray-900"></div>
                      <p className="text-sm text-muted-foreground">
                        Loading subscription...
                      </p>
                    </div>
                  </div>
                ) : subscription &&
                  isActiveSubscription(subscription) &&
                  subscription.tier_type !== 'free' ? (
                  // Active subscription
                  <div className="space-y-4">
                    <div className="rounded-lg border bg-gradient-to-r from-green-50 to-emerald-50 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-green-900">
                            {getSubscriptionTierInfo(subscription).name} Plan
                          </h3>
                          <p className="text-sm text-green-700">
                            {subscription.status === 'trialing'
                              ? 'Free Trial Active'
                              : 'Active Subscription'}
                          </p>
                        </div>
                        <div className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                          {subscription.status === 'trialing'
                            ? 'Trial'
                            : 'Active'}
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-sm font-medium text-green-900">
                            Billing Period
                          </p>
                          <p className="text-sm text-green-700">
                            {subscription.current_period_end_at
                              ? `Ends on ${formatSubscriptionDate(subscription.current_period_end_at)}`
                              : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-green-900">
                            Price
                          </p>
                          <p className="text-sm text-green-700">
                            {(() => {
                              const priceInfo =
                                getSubscriptionPriceInfo(subscription);
                              return priceInfo.billingPeriod === 'free'
                                ? 'Free'
                                : `$${priceInfo.price}/${priceInfo.billingPeriod === 'annual' ? 'year' : 'month'}`;
                            })()}
                          </p>
                        </div>
                      </div>

                      {subscription.cancel_at_period_end && (
                        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
                          <p className="text-sm font-medium text-amber-800">
                            ⚠️ Subscription will cancel at end of period
                          </p>
                          <p className="mt-1 text-xs text-amber-700">
                            You'll continue to have access until{' '}
                            {formatSubscriptionDate(
                              subscription.current_period_end_at
                            )}
                          </p>
                        </div>
                      )}

                      <div className="mt-6 flex flex-wrap gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleManageSubscription}
                          className="bg-white hover:bg-gray-50"
                        >
                          Manage Subscription
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleUpgradePlan}
                          className="bg-white hover:bg-gray-50"
                        >
                          Compare Plans
                        </Button>
                      </div>
                    </div>

                    {/* Current Plan Features */}
                    <div className="rounded-lg border p-4">
                      <h4 className="mb-3 font-medium">
                        Current Plan Features
                      </h4>
                      <div className="grid gap-2 text-sm text-muted-foreground">
                        {getSubscriptionTierInfo(subscription).features.map(
                          (feature, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2"
                            >
                              <div className="h-2 w-2 rounded-full bg-green-500"></div>
                              <span>{feature}</span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  // No active subscription
                  <div className="space-y-4">
                    <div className="rounded-lg border bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
                      <div className="text-center">
                        <h3 className="mb-2 text-lg font-semibold text-blue-900">
                          Free Plan
                        </h3>
                        <p className="mb-4 text-sm text-blue-700">
                          You're currently on the free plan with limited
                          features
                        </p>

                        {/* Free Plan Features */}
                        <div className="mb-6 text-left">
                          <h4 className="mb-3 font-medium text-blue-900">
                            Current Plan Includes:
                          </h4>
                          <div className="grid gap-2 text-sm text-blue-700">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                              <span>Up to 10 calls per month</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                              <span>Basic call summaries</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                              <span>Email notifications</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                              <span>Community support</span>
                            </div>
                          </div>
                        </div>

                        <Button
                          onClick={handleUpgradePlan}
                          size="lg"
                          className="w-full sm:w-auto"
                        >
                          Upgrade to Professional
                        </Button>
                      </div>
                    </div>

                    {/* Upgrade Benefits */}
                    <div className="rounded-lg border p-4">
                      <h4 className="mb-3 font-medium">
                        Unlock with Professional Plan
                      </h4>
                      <div className="grid gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-green-500"></div>
                          <span>Unlimited calls & minutes</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-green-500"></div>
                          <span>Advanced lead qualification</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-green-500"></div>
                          <span>CRM integrations (Webhook API)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-green-500"></div>
                          <span>Real-time SMS & email alerts</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-green-500"></div>
                          <span>Custom call scripts & greetings</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-green-500"></div>
                          <span>Advanced analytics dashboard</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-green-500"></div>
                          <span>Priority support</span>
                        </div>
                      </div>

                      <div className="mt-4 text-center">
                        <p className="mb-3 text-sm text-muted-foreground">
                          {(() => {
                            const priceInfo =
                              getSubscriptionPriceInfo(subscription);
                            if (priceInfo.billingPeriod === 'free') {
                              return (
                                <span className="font-semibold text-foreground">
                                  Free
                                </span>
                              );
                            }
                            return (
                              <>
                                Starting at{' '}
                                <span className="font-semibold text-foreground">
                                  ${priceInfo.price}/
                                  {priceInfo.billingPeriod === 'annual'
                                    ? 'month'
                                    : 'month'}
                                </span>{' '}
                                {priceInfo.billingPeriod === 'annual'
                                  ? '(billed annually)'
                                  : '(billed monthly)'}
                              </>
                            );
                          })()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ✓ 14-day free trial • ✓ No credit card required • ✓
                          Cancel anytime
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DashboardShell>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<div>Loading...</div>}>
        <SettingsContent />
      </Suspense>
    </ProtectedRoute>
  );
}

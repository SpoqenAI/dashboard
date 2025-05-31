'use client';

import { Suspense, useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { useSearchParams } from 'next/navigation';
import { Filter } from 'bad-words';
import { useMask } from '@react-input/mask';
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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DashboardHeader } from '@/components/dashboard-header';
import { DashboardShell } from '@/components/dashboard-shell';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { Camera, Bell, Shield, User } from 'lucide-react';
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
import {
  parsePhoneNumber,
  isValidPhoneNumber,
  formatIncompletePhoneNumber,
  AsYouType,
} from 'libphonenumber-js';
import PasswordStrengthBar from 'react-password-strength-bar';

function SettingsContent() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') || 'profile';

  const [confirmOpen, setConfirmOpen] = useState(false);

  // Get user settings and profile data
  const {
    loading,
    saving,
    error,
    dataLoaded,
    settings,
    updateProfile,
    updateUserSettings,
    getProfileFormData,
  } = useUserSettings();

  // Form data state - initialized from Supabase data
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    businessName: '',
    bio: '',
    licenseNumber: '',
    brokerage: '',
    website: '',
    businessAddress: '',
    city: '',
    state: '',
    zipcode: '',
    country: 'United States',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    emailNotifications: true,
    marketingEmails: true,
  });

  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [touchedFields, setTouchedFields] = useState<
    Record<string, boolean>
  >({});
  const [savedData, setSavedData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    businessName: '',
    bio: '',
    licenseNumber: '',
    brokerage: '',
    website: '',
    businessAddress: '',
    city: '',
    state: '',
    zipcode: '',
    country: 'United States',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    emailNotifications: true,
    marketingEmails: true,
  });

  // Password strength score state
  const [newPasswordScore, setNewPasswordScore] = useState(0);

  // Load profile data when available
  useEffect(() => {
    if (dataLoaded) {
      const profileData = getProfileFormData();
      const newFormData = {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        email: profileData.email,
        phone: profileData.phone,
        businessName: profileData.businessName,
        bio: profileData.bio,
        licenseNumber: profileData.licenseNumber,
        brokerage: profileData.brokerage,
        website: profileData.website,
        businessAddress: '', // Not stored in profile table
        city: profileData.city,
        state: profileData.state,
        zipcode: '', // Not stored in profile table
        country: 'United States',
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

  // Initialize content filter
  const filter = new Filter();

  // Add custom inappropriate words for business context
  filter.addWords('scam', 'fraud', 'fake', 'illegal', 'drugs');

  // Validation rules for each field
  const fieldLimits = {
    firstName: { maxLength: 50, minLength: 1 },
    lastName: { maxLength: 50, minLength: 1 },
    email: { maxLength: 254, minLength: 5 },
    phone: { maxLength: 20, minLength: 0 },
    businessName: { maxLength: 100, minLength: 0 },
    bio: { maxLength: 500, minLength: 0 },
    licenseNumber: { maxLength: 50, minLength: 0 },
    brokerage: { maxLength: 100, minLength: 0 },
    website: { maxLength: 254, minLength: 0 },
    businessAddress: { maxLength: 200, minLength: 0 },
    city: { maxLength: 50, minLength: 0 },
    state: { maxLength: 50, minLength: 0 },
    zipcode: { maxLength: 10, minLength: 0 },
    country: { maxLength: 50, minLength: 0 },
    currentPassword: { maxLength: 128, minLength: 0 },
    newPassword: { maxLength: 128, minLength: 0 },
    confirmPassword: { maxLength: 128, minLength: 0 },
  };

  // Regex patterns for field validation - extracted to prevent ReDoS attacks
  const VALIDATION_PATTERNS = {
    // Names: letters, single spaces (no consecutive), basic punctuation (limited)
    // Updated to support Unicode letters including accented and international characters
    NAME_PATTERN: /^[\p{L}](?:[\p{L}\s\-'.])*[\p{L}]$|^[\p{L}]$/u,

    // Business names: alphanumeric, single spaces, limited punctuation
    BUSINESS_NAME_PATTERN:
      /^(?:[A-Za-z0-9](?:[A-Za-z0-9\s\-'.&,()]*[A-Za-z0-9])?)$/,

    // Email pattern supporting RFC-5322 compliant characters including '+' in local part
    // Allows letters, numbers, dots, underscores, hyphens, and plus signs in local part
    EMAIL_PATTERN:
      /^[a-zA-Z0-9]([a-zA-Z0-9._+-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/,

    // Phone: simple pattern for input - only digits and plus signs allowed
    PHONE_INPUT_PATTERN: /^[\d+\s\-\(\)]*$/,

    // Website URL pattern - comprehensive validation
    URL_PATTERN:
      /^https?:\/\/(?:[-\w.])+(?:\:[0-9]+)?(?:\/(?:[\w\/_.])*(?:\?(?:[\w&=%.])*)?(?:\#(?:[\w.])*)?)?$/,

    // License number pattern - alphanumeric with common prefixes
    LICENSE_PATTERN: /^[A-Za-z]{0,4}[0-9A-Za-z]{3,}$/,

    // Zipcode patterns for different countries
    US_ZIPCODE_PATTERN: /^[0-9]{5}(-[0-9]{4})?$/,
    CANADA_POSTAL_PATTERN: /^[A-Za-z][0-9][A-Za-z]\s?[0-9][A-Za-z][0-9]$/,
    UK_POSTCODE_PATTERN:
      /^[A-Za-z]{1,2}[0-9Rr][0-9A-Za-z]?\s?[0-9][ABD-HJLNP-UW-Zabd-hjlnp-uw-z]{2}$/,
    GENERIC_ZIPCODE_PATTERN: /^[A-Za-z0-9\s\-]{3,10}$/,
  };

  // Email mask ref: allow local-part, @, domain, dot, TLD (simple version)
  // This mask is not strict RFC, but prevents spaces and most invalid chars
  const emailMaskRef = useMask({
    // Accepts up to 64 chars for local, 1 @, up to 255 for domain, dot, and 2-10 for TLD
    // The mask is loose, but blocks spaces and most symbols
    mask: '***************************************************************************************************************************************************************************************************************************************************************',
    replacement: { '*': /[a-zA-Z0-9._%+\-@]/ },
    showMask: false,
    // Optionally, you can add a validator here for stricter enforcement
  });

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
    if (
      [
        'firstName',
        'lastName',
        'businessName',
        'bio',
        'brokerage',
        'city',
        'state',
        'country',
      ].includes(field)
    ) {
      if (filter.isProfane(value)) {
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

      case 'businessName':
      case 'brokerage':
        if (value && !VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test(value)) {
          return 'Should only contain letters, numbers, spaces, and basic punctuation';
        }
        break;

      case 'city':
      case 'state':
      case 'country':
        if (value && !VALIDATION_PATTERNS.NAME_PATTERN.test(value)) {
          return 'Should only contain letters, spaces, and basic punctuation';
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

      case 'phone':
        if (value) {
          // Basic input pattern check - allow only valid characters during typing
          if (!VALIDATION_PATTERNS.PHONE_INPUT_PATTERN.test(value)) {
            return 'Phone number can only contain digits, spaces, hyphens, parentheses, and plus signs';
          }

          // Skip validation for very short inputs (user is still typing)
          const digitsOnly = value.replace(/\D/g, '');
          if (digitsOnly.length < 3) {
            return null; // Allow partial input
          }

          // For very short inputs during backspacing, be more lenient
          if (digitsOnly.length <= 3 && !value.includes('(')) {
            return null; // Allow partial input without formatting
          }

          // Use libphonenumber-js for validation
          try {
            // Try to parse the number
            const phoneNumber = parsePhoneNumber(value, 'US'); // Default to US, but will detect international

            // Check if it's a valid number
            if (!phoneNumber.isValid()) {
              // For incomplete numbers, provide helpful feedback
              if (digitsOnly.length < 7) {
                return 'Phone number appears incomplete';
              }
              return 'Please enter a valid phone number';
            }

            // Additional checks for business context
            const nationalNumber = phoneNumber.nationalNumber;

            // Check for emergency numbers
            if (nationalNumber === '911' || nationalNumber.includes('911')) {
              return 'Cannot use emergency service numbers';
            }

            // Check for obviously fake numbers (all same digits, etc.)
            if (/^(\d)\1+$/.test(nationalNumber)) {
              return 'Please enter a valid phone number';
            }
          } catch (error) {
            // If parsing fails, try to validate as international number
            if (value.startsWith('+')) {
              try {
                const intlNumber = parsePhoneNumber(value);
                if (!intlNumber.isValid()) {
                  return 'Please enter a valid international phone number';
                }
              } catch {
                return 'Please enter a valid international phone number';
              }
            } else {
              // For US numbers without country code
              if (digitsOnly.length === 10) {
                const areaCode = digitsOnly.substring(0, 3);
                const exchange = digitsOnly.substring(3, 6);

                // Basic US number validation
                if (areaCode.startsWith('0') || areaCode.startsWith('1')) {
                  return 'Invalid area code';
                }
                if (exchange.startsWith('0') || exchange.startsWith('1')) {
                  return 'Invalid exchange code';
                }
              } else if (digitsOnly.length > 3 && digitsOnly.length < 10) {
                return 'US phone number must be 10 digits';
              } else if (digitsOnly.length > 10) {
                return 'US phone number cannot exceed 10 digits';
              }
            }
          }
        }
        break;

      case 'website':
        if (value) {
          // Check basic URL format
          if (!VALIDATION_PATTERNS.URL_PATTERN.test(value)) {
            return 'Website must be a valid URL starting with http:// or https://';
          }

          // Additional URL validation checks
          try {
            const url = new URL(value);

            // Check for valid protocol
            if (!['http:', 'https:'].includes(url.protocol)) {
              return 'Website must use http:// or https://';
            }

            // Check for valid hostname
            if (!url.hostname || url.hostname.length < 3) {
              return 'Website must have a valid domain name';
            }

            // Check for valid TLD (at least 2 characters)
            const hostParts = url.hostname.split('.');
            if (
              hostParts.length < 2 ||
              hostParts[hostParts.length - 1].length < 2
            ) {
              return 'Website must have a valid domain extension';
            }

            // Check for localhost or IP addresses (not allowed for business websites)
            if (
              url.hostname === 'localhost' ||
              url.hostname.startsWith('127.') ||
              url.hostname.startsWith('192.168.') ||
              url.hostname.startsWith('10.') ||
              /^\d+\.\d+\.\d+\.\d+$/.test(url.hostname)
            ) {
              return 'Please enter a public website URL';
            }

            // Check for suspicious or inappropriate domains
            const suspiciousDomains = [
              'bit.ly',
              'tinyurl.com',
              'goo.gl',
              't.co',
            ];
            if (
              suspiciousDomains.some(domain => url.hostname.includes(domain))
            ) {
              return 'Please enter your direct business website URL';
            }
          } catch (error) {
            return 'Please enter a valid website URL';
          }
        }
        break;

      case 'licenseNumber':
        if (value) {
          // Check basic format
          if (!VALIDATION_PATTERNS.LICENSE_PATTERN.test(value)) {
            return 'License number should contain letters and numbers (e.g., RE123456789)';
          }

          // Check minimum length for meaningful license numbers
          if (value.length < 5) {
            return 'License number must be at least 5 characters';
          }

          // Check for obviously invalid patterns
          if (/^[0-9]+$/.test(value) && value.length < 8) {
            return 'License number appears too short for a valid license';
          }

          // Check for repeated characters (likely invalid)
          if (/(.)\1{4,}/.test(value)) {
            return 'License number cannot contain 5 or more repeated characters';
          }
        }
        break;

      case 'zipcode':
        if (value) {
          // Determine validation pattern based on country
          const country = formData.country.toLowerCase();
          let isValid = false;

          if (
            country.includes('united states') ||
            country.includes('usa') ||
            country === 'us'
          ) {
            isValid = VALIDATION_PATTERNS.US_ZIPCODE_PATTERN.test(value);
            if (!isValid) {
              return 'US ZIP code should be 5 digits or 5+4 format (e.g., 12345 or 12345-6789)';
            }
          } else if (country.includes('canada') || country === 'ca') {
            isValid = VALIDATION_PATTERNS.CANADA_POSTAL_PATTERN.test(value);
            if (!isValid) {
              return 'Canadian postal code should be in format A1A 1A1';
            }
          } else if (
            country.includes('united kingdom') ||
            country.includes('uk') ||
            country.includes('britain')
          ) {
            isValid = VALIDATION_PATTERNS.UK_POSTCODE_PATTERN.test(value);
            if (!isValid) {
              return 'UK postcode should be in valid format (e.g., SW1A 1AA)';
            }
          } else {
            // Generic validation for other countries
            isValid = VALIDATION_PATTERNS.GENERIC_ZIPCODE_PATTERN.test(value);
            if (!isValid) {
              return 'Postal code should contain only letters, numbers, spaces, and hyphens';
            }
          }

          // Additional checks for all postal codes
          if (value.length < 3) {
            return 'Postal code must be at least 3 characters';
          }

          // Check for obviously invalid patterns
          if (/^[0\s\-]+$/.test(value)) {
            return 'Please enter a valid postal code';
          }
        }
        break;

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

  // Zipcode formatting function based on country
  const formatZipcode = (value: string, country: string): string => {
    // Remove all non-alphanumeric characters except spaces and hyphens
    const cleaned = value.replace(/[^A-Za-z0-9\s\-]/g, '').toUpperCase();

    const countryLower = country.toLowerCase();

    if (
      countryLower.includes('united states') ||
      countryLower.includes('usa') ||
      countryLower === 'us'
    ) {
      // US ZIP code formatting
      const digits = cleaned.replace(/\D/g, '');
      if (digits.length <= 5) {
        return digits;
      } else if (digits.length >= 9) {
        // Only add hyphen if we have at least 9 digits (5 + 4 suffix)
        return `${digits.slice(0, 5)}-${digits.slice(5, 9)}`;
      } else {
        // For 6-8 digits, return without hyphen to avoid premature formatting
        return digits;
      }
    } else if (countryLower.includes('canada') || countryLower === 'ca') {
      // Canadian postal code formatting (A1A 1A1)
      const alphanumeric = cleaned.replace(/\s/g, '');
      if (alphanumeric.length <= 3) {
        return alphanumeric;
      } else if (alphanumeric.length <= 6) {
        return `${alphanumeric.slice(0, 3)} ${alphanumeric.slice(3)}`;
      }
      return `${alphanumeric.slice(0, 3)} ${alphanumeric.slice(3, 6)}`;
    } else if (
      countryLower.includes('united kingdom') ||
      countryLower.includes('uk') ||
      countryLower.includes('britain')
    ) {
      // UK postcode formatting - more complex, keep as entered but clean
      return cleaned.slice(0, 8);
    }

    // Generic formatting for other countries
    return cleaned.slice(0, 10);
  };

  // Phone formatting function using libphonenumber-js for better international support
  const formatPhoneNumber = (
    value: string,
    previousValue: string = ''
  ): string => {
    // Remove any characters that aren't allowed
    const cleaned = value.replace(/[^\d+\s\-\(\)]/g, '');

    // If empty, return empty
    if (!cleaned) return '';

    // Get just the digits for comparison
    const currentDigits = cleaned.replace(/\D/g, '');
    const previousDigits = previousValue.replace(/\D/g, '');

    // Check if user is backspacing
    const isBackspacing = currentDigits.length < previousDigits.length;

    // For international numbers (starting with +), use AsYouType
    if (cleaned.startsWith('+')) {
      try {
        const formatter = new AsYouType();
        return formatter.input(cleaned);
      } catch (error) {
        return cleaned;
      }
    }

    // For US numbers, use custom formatting that's more backspace-friendly
    if (currentDigits.length === 0) return '';

    // If backspacing and we have 3 or fewer digits, don't format
    if (isBackspacing && currentDigits.length <= 3) {
      return currentDigits;
    }

    // Apply US formatting based on digit count
    if (currentDigits.length <= 3) {
      return currentDigits;
    } else if (currentDigits.length <= 6) {
      return `(${currentDigits.slice(0, 3)}) ${currentDigits.slice(3)}`;
    } else {
      return `(${currentDigits.slice(0, 3)}) ${currentDigits.slice(3, 6)}-${currentDigits.slice(6, 10)}`;
    }
  };

  // License number mask configuration - flexible alphanumeric
  const licenseMaskRef = useMask({
    mask: '__________________________________________________',
    replacement: { _: /[A-Za-z0-9]/ },
    showMask: false,
  });

  const handleInputChange = (field: string, value: string) => {
    let processedValue = value;

    // Apply phone formatting
    if (field === 'phone') {
      processedValue = formatPhoneNumber(value, formData.phone);
    }

    // Apply zipcode formatting
    if (field === 'zipcode') {
      processedValue = formatZipcode(value, formData.country);
    }

    // Remove spaces from email and website fields
    if (field === 'email' || field === 'website') {
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

  const handleAddressSelect = (addressData: {
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  }) => {
    // Auto-fill the form fields when an address is selected
    setFormData(prev => ({
      ...prev,
      city: addressData.city || prev.city,
      state: addressData.state || prev.state,
      zipcode: addressData.postcode || prev.zipcode,
      country: addressData.country || prev.country,
    }));

    // Clear any existing validation errors for these fields
    setValidationErrors(prev => ({
      ...prev,
      city: '',
      state: '',
      zipcode: '',
      country: '',
    }));
  };

  const handleAddressInputChange = (value: string) => {
    // Update the business address field as user types
    setFormData(prev => ({
      ...prev,
      businessAddress: value,
    }));
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

      // Format phone number for storage using libphonenumber-js
      let formattedPhone = formData.phone;
      if (formData.phone) {
        try {
          const phoneNumber = parsePhoneNumber(formData.phone, 'US');
          if (phoneNumber.isValid()) {
            // Store in E.164 format for consistency
            formattedPhone = phoneNumber.format('E.164');
          }
        } catch (error) {
          // If parsing fails, keep the original value
          console.warn('Phone number formatting failed:', error);
        }
      }

      // Prepare update operations
      const updatePromises = [];

      // Save profile data to Supabase
      updatePromises.push(
        updateProfile({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formattedPhone,
          businessName: formData.businessName,
          bio: formData.bio,
          licenseNumber: formData.licenseNumber,
          brokerage: formData.brokerage,
          website: formData.website,
          city: formData.city,
          state: formData.state,
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
      console.error('Error saving settings:', error);
      // Error toast is handled by the updateProfile and updateUserSettings functions
    }
  };

  // Cancel logic for General tab
  const handleCancel = () => {
    setFormData({ ...savedData });
    setValidationErrors({});
    setNewPasswordScore(0);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <DashboardShell>
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        </div>
        <Tabs defaultValue={tab} className="space-y-4">
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
                          <AvatarImage
                            src="/placeholder.svg?height=80&width=80&query=person"
                            alt="Profile picture"
                          />
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
                          <Camera className="h-4 w-4" />
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
                        ref={emailMaskRef}
                      />
                      {validationErrors.email && (
                        <p className="text-sm text-muted-foreground">
                          {validationErrors.email}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="font-medium">Phone Number</label>
                      <input
                        type="tel"
                        className={`w-full rounded-md border p-2 focus:border-black focus:outline-none focus:ring-1 focus:ring-black ${
                          validationErrors.phone
                            ? 'border-red-500 bg-background'
                            : 'bg-background'
                        }`}
                        value={formData.phone}
                        onChange={e =>
                          handleInputChange('phone', e.target.value)
                        }
                        onBlur={() => handleFieldBlur('phone')}
                        placeholder="(555) 123-4567 or +1 555 123 4567"
                        autoComplete="tel"
                        maxLength={25}
                      />
                      {validationErrors.phone && (
                        <p className="text-sm text-red-500">
                          {validationErrors.phone}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        Enter your phone number. International numbers should
                        start with +
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="font-medium">Business Name</label>
                      <input
                        type="text"
                        className={`w-full rounded-md border p-2 focus:border-black focus:outline-none focus:ring-1 focus:ring-black ${
                          validationErrors.businessName
                            ? 'border-red-500 bg-background'
                            : 'bg-background'
                        }`}
                        value={formData.businessName}
                        onChange={e =>
                          handleInputChange('businessName', e.target.value)
                        }
                        onBlur={() => handleFieldBlur('businessName')}
                        maxLength={100}
                        placeholder="e.g., ABC Real Estate, Smith & Associates, etc."
                      />
                      {validationErrors.businessName && (
                        <p className="text-sm text-red-500">
                          {validationErrors.businessName}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        {formData.businessName.length}/100 characters
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="font-medium">Bio</label>
                      <textarea
                        className={`w-full resize-none rounded-md border p-2 focus:border-black focus:outline-none focus:ring-1 focus:ring-black ${
                          validationErrors.bio
                            ? 'border-red-500 bg-background'
                            : 'bg-background'
                        }`}
                        rows={3}
                        value={formData.bio}
                        onChange={e => handleInputChange('bio', e.target.value)}
                        onBlur={() => handleFieldBlur('bio')}
                        maxLength={500}
                        placeholder="Tell us about yourself and your real estate business..."
                      />
                      {validationErrors.bio && (
                        <p className="text-sm text-red-500">
                          {validationErrors.bio}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        {formData.bio.length}/500 characters
                      </p>
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
                        onChangeScore={setNewPasswordScore}
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

                {/* Business Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Business Information</CardTitle>
                    <CardDescription>
                      Professional details for your real estate business.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="font-medium">License Number</label>
                      <input
                        ref={licenseMaskRef}
                        type="text"
                        className={`w-full rounded-md border p-2 focus:border-black focus:outline-none focus:ring-1 focus:ring-black ${
                          validationErrors.licenseNumber
                            ? 'border-red-500 bg-background'
                            : 'bg-background'
                        }`}
                        value={formData.licenseNumber}
                        onChange={e =>
                          handleInputChange('licenseNumber', e.target.value)
                        }
                        onBlur={() => handleFieldBlur('licenseNumber')}
                        maxLength={50}
                        placeholder="e.g., RE123456789"
                        autoComplete="off"
                      />
                      {validationErrors.licenseNumber && (
                        <p className="text-sm text-red-500">
                          {validationErrors.licenseNumber}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        {formData.licenseNumber.length}/50 characters
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="font-medium">Brokerage</label>
                      <input
                        type="text"
                        className={`w-full rounded-md border p-2 focus:border-black focus:outline-none focus:ring-1 focus:ring-black ${
                          validationErrors.brokerage
                            ? 'border-red-500 bg-background'
                            : 'bg-background'
                        }`}
                        value={formData.brokerage}
                        onChange={e =>
                          handleInputChange('brokerage', e.target.value)
                        }
                        onBlur={() => handleFieldBlur('brokerage')}
                        maxLength={100}
                      />
                      {validationErrors.brokerage && (
                        <p className="text-sm text-red-500">
                          {validationErrors.brokerage}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        {formData.brokerage.length}/100 characters
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="font-medium">Website</label>
                      <input
                        type="text"
                        className={`w-full rounded-md border p-2 focus:border-black focus:outline-none focus:ring-1 focus:ring-black ${
                          validationErrors.website
                            ? 'border-red-500 bg-background'
                            : 'bg-background'
                        }`}
                        value={formData.website}
                        onChange={e =>
                          handleInputChange('website', e.target.value)
                        }
                        onBlur={() => handleFieldBlur('website')}
                        maxLength={254}
                        placeholder="https://your-website.com"
                        autoComplete="url"
                        inputMode="url"
                      />
                      {validationErrors.website && (
                        <p className="text-sm text-red-500">
                          {validationErrors.website}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        {formData.website.length}/254 characters
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="font-medium">Business Address</label>
                      <AddressAutocomplete
                        onPlaceSelect={handleAddressSelect}
                        onInputChange={handleAddressInputChange}
                        placeholder="Search for your business address..."
                        value={formData.businessAddress}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500">
                        Search and select your business address from the
                        suggestions.
                      </p>
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
                <CardTitle>Subscription Plan</CardTitle>
                <CardDescription>
                  Manage your subscription and billing information.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-md border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Professional Plan</h3>
                      <p className="text-sm text-muted-foreground">$49/month</p>
                    </div>
                    <div className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                      Active
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-muted-foreground">
                    <ul className="space-y-1">
                      <li>• Unlimited AI call answering</li>
                      <li>• Customizable greeting and questions</li>
                      <li>• Instant email summaries</li>
                      <li>• Basic analytics</li>
                    </ul>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm">
                      Change Plan
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                    >
                      Cancel Subscription
                    </Button>
                  </div>
                </div>
                <Separator className="my-4" />
                <div>
                  <h3 className="mb-4 text-lg font-medium">Payment Method</h3>
                  <div className="flex items-center justify-between rounded-md border p-4">
                    <div className="flex items-center gap-2">
                      <div className="rounded-md bg-muted p-2">
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <rect width="24" height="24" rx="4" fill="#0A2540" />
                          <path
                            d="M14 9.5V11.5H16V9.5H14ZM14 13.5V15.5H16V13.5H14ZM10 9.5V11.5H12V9.5H10ZM10 13.5V15.5H12V13.5H10ZM6 9.5V11.5H8V9.5H6ZM6 13.5V15.5H8V13.5H6Z"
                            fill="white"
                          />
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium">•••• •••• •••• 4242</div>
                        <div className="text-xs text-muted-foreground">
                          Expires 12/2025
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                  </div>
                </div>
                <Separator className="my-4" />
                <div>
                  <h3 className="mb-4 text-lg font-medium">Billing History</h3>
                  <div className="rounded-md border">
                    <div className="flex items-center justify-between border-b p-4">
                      <div>
                        <div className="font-medium">May 01, 2025</div>
                        <div className="text-xs text-muted-foreground">
                          Professional Plan - Monthly
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">$49.00</div>
                        <div className="text-xs text-green-600">Paid</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-b p-4">
                      <div>
                        <div className="font-medium">Apr 01, 2025</div>
                        <div className="text-xs text-muted-foreground">
                          Professional Plan - Monthly
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">$49.00</div>
                        <div className="text-xs text-green-600">Paid</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <div>
                        <div className="font-medium">Mar 01, 2025</div>
                        <div className="text-xs text-muted-foreground">
                          Professional Plan - Monthly
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">$49.00</div>
                        <div className="text-xs text-green-600">Paid</div>
                      </div>
                    </div>
                  </div>
                </div>
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

'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Filter } from 'bad-words';
import { useMask } from '@react-input/mask';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DashboardHeader } from '@/components/dashboard-header';
import { DashboardShell } from '@/components/dashboard-shell';
import { Camera, Bell, Shield, User } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

function SettingsContent() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') || 'profile';
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form data state
  const [formData, setFormData] = useState({
    firstName: 'James',
    lastName: 'Carter',
    email: 'james@realestate.com',
    phone: '(555) 123-4567',
    businessName: 'Carter Real Estate',
    bio: 'Experienced real estate agent specializing in residential properties.',
    licenseNumber: 'RE123456789',
    brokerage: 'Premier Realty Group',
    website: 'https://jamescarter-realestate.com',
    city: 'San Francisco',
    state: 'California',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    emailNotifications: true,
    marketingEmails: true,
  });
  
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

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
    city: { maxLength: 50, minLength: 0 },
    state: { maxLength: 50, minLength: 0 },
    currentPassword: { maxLength: 128, minLength: 0 },
    newPassword: { maxLength: 128, minLength: 0 },
    confirmPassword: { maxLength: 128, minLength: 0 },
  };

  // Regex patterns for field validation - extracted to prevent ReDoS attacks
  const VALIDATION_PATTERNS = {
    // Names: letters, single spaces (no consecutive), basic punctuation (limited)
    NAME_PATTERN: /^[a-zA-Z](?:[a-zA-Z\s\-'.])*[a-zA-Z]$|^[a-zA-Z]$/,
    
    // Business names: alphanumeric, single spaces, limited punctuation
    BUSINESS_NAME_PATTERN: /^[a-zA-Z0-9](?:[a-zA-Z0-9\s\-'.,&()])*[a-zA-Z0-9)]$|^[a-zA-Z0-9]$/,
    
    // Email: RFC 5322 compliant pattern with practical constraints
    EMAIL_PATTERN: /^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/,
    
    // Phone: pattern optimized for auto-formatted input
    PHONE_PATTERN: /^(\+?1\s)?\([0-9]{3}\)\s[0-9]{3}-[0-9]{4}$|^[0-9]{1,3}$|^\([0-9]{1,3}\)\s[0-9]{0,3}$|^\([0-9]{3}\)\s[0-9]{1,3}-?[0-9]{0,4}$|^\+[0-9]{1,4}\s\([0-9]{3}\)\s[0-9]{3}-[0-9]{4}$/,
    
    // Website URL pattern - comprehensive validation
    URL_PATTERN: /^https?:\/\/(?:[-\w.])+(?:\:[0-9]+)?(?:\/(?:[\w\/_.])*(?:\?(?:[\w&=%.])*)?(?:\#(?:[\w.])*)?)?$/,
    
    // License number pattern - alphanumeric with common prefixes
    LICENSE_PATTERN: /^[A-Za-z]{0,4}[0-9A-Za-z]{3,}$/
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
    if (['firstName', 'lastName', 'businessName', 'bio', 'brokerage', 'city', 'state'].includes(field)) {
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
      
      case 'email':
        // Check basic format first
        if (!VALIDATION_PATTERNS.EMAIL_PATTERN.test(value)) {
          return 'Please enter a valid email address';
        }
        
        // Additional email validation checks
        if (value.includes('..')) {
          return 'Email cannot contain consecutive dots';
        }
        
        if (value.startsWith('.') || value.endsWith('.')) {
          return 'Email cannot start or end with a dot';
        }
        
        if (value.includes('@.') || value.includes('.@')) {
          return 'Invalid email format around @ symbol';
        }
        
        // Check for valid TLD (at least 2 characters)
        const parts = value.split('@');
        if (parts.length === 2) {
          const domain = parts[1];
          if (!domain.includes('.') || domain.split('.').pop()!.length < 2) {
            return 'Email must have a valid domain extension';
          }
        }
        break;
        
      case 'phone':
        if (value) {
          // Check if it's international (starts with +)
          const isInternational = value.startsWith('+');
          const digitsOnly = value.replace(/\D/g, '');
          
          if (isInternational) {
            // International number validation
            if (digitsOnly.length < 7) {
              return 'International number must have at least 7 digits';
            }
            if (digitsOnly.length > 15) {
              return 'International number cannot exceed 15 digits';
            }
            // Check for reasonable country code (1-4 digits)
            if (digitsOnly.length >= 10) {
              const countryCodeLength = digitsOnly.length - 10;
              if (countryCodeLength > 4) {
                return 'Invalid country code - too long';
              }
            }
            // Basic format check - should have reasonable length
            if (digitsOnly.length < 8) {
              return 'Please enter a complete international number';
            }
          } else {
            // US number validation
            // Skip validation if less than 3 digits (user is still typing)
            if (digitsOnly.length > 0 && digitsOnly.length < 3) {
              return null; // Allow partial input
            }
            
            // Check minimum digit requirements for complete numbers
            if (digitsOnly.length > 0 && digitsOnly.length < 10) {
              return 'US phone number must be 10 digits';
            }
            
            // Check maximum digit requirements
            if (digitsOnly.length > 10) {
              return 'US phone number cannot exceed 10 digits';
            }
            
            // For complete 10-digit US numbers, validate area code and exchange
            if (digitsOnly.length === 10) {
              const areaCode = digitsOnly.substring(0, 3);
              const exchange = digitsOnly.substring(3, 6);
              
              // Check for invalid area codes (can't start with 0 or 1)
              if (areaCode.startsWith('0') || areaCode.startsWith('1')) {
                return 'Invalid area code';
              }
              
              // Check for invalid exchange codes (can't start with 0 or 1)
              if (exchange.startsWith('0') || exchange.startsWith('1')) {
                return 'Invalid exchange code';
              }
              
              // Check for special service numbers
              if (areaCode === '911' || exchange === '911') {
                return 'Cannot use emergency service numbers';
              }
              
              // Check for obviously fake numbers
              if (areaCode === '000' || exchange === '000' || 
                  areaCode === '555' && exchange === '555') {
                return 'Please enter a valid phone number';
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
            if (hostParts.length < 2 || hostParts[hostParts.length - 1].length < 2) {
              return 'Website must have a valid domain extension';
            }
            
            // Check for localhost or IP addresses (not allowed for business websites)
            if (url.hostname === 'localhost' || 
                url.hostname.startsWith('127.') || 
                url.hostname.startsWith('192.168.') ||
                url.hostname.startsWith('10.') ||
                /^\d+\.\d+\.\d+\.\d+$/.test(url.hostname)) {
              return 'Please enter a public website URL';
            }
            
            // Check for suspicious or inappropriate domains
            const suspiciousDomains = ['bit.ly', 'tinyurl.com', 'goo.gl', 't.co'];
            if (suspiciousDomains.some(domain => url.hostname.includes(domain))) {
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
        
      case 'newPassword':
        if (value && value.length < 8) {
          return 'Password must be at least 8 characters long';
        }
        break;
        
      case 'confirmPassword':
        if (value && value !== formData.newPassword) {
          return 'Passwords do not match';
        }
        break;
    }

    return null;
  };

  // Phone formatting function for flexible US/International support
  const formatPhoneNumber = (value: string): string => {
    // Remove all non-digit and non-plus characters
    const cleaned = value.replace(/[^\d+]/g, '');
    
    // If starts with +, treat as international
    if (cleaned.startsWith('+')) {
      const digits = cleaned.slice(1); // Remove the +
      
      // Limit international numbers to 15 digits max (ITU-T E.164 standard)
      const limitedDigits = digits.slice(0, 15);
      
      if (limitedDigits.length === 0) return '+';
      if (limitedDigits.length <= 4) return `+${limitedDigits}`;
      if (limitedDigits.length <= 7) return `+${limitedDigits.slice(0, limitedDigits.length - 3)} ${limitedDigits.slice(-3)}`;
      if (limitedDigits.length <= 10) return `+${limitedDigits.slice(0, limitedDigits.length - 7)} ${limitedDigits.slice(-7, -4)} ${limitedDigits.slice(-4)}`;
      // For longer numbers, group as country code + area + number
      return `+${limitedDigits.slice(0, limitedDigits.length - 10)} ${limitedDigits.slice(-10, -7)} ${limitedDigits.slice(-7, -4)} ${limitedDigits.slice(-4)}`;
    }
    
    // US format for numbers without +
    const digits = cleaned;
    
    // Limit US numbers to 10 digits
    const limitedDigits = digits.slice(0, 10);
    
    if (limitedDigits.length === 0) return '';
    if (limitedDigits.length <= 3) return `(${limitedDigits}`;
    if (limitedDigits.length <= 6) return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3)}`;
    return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`;
  };

  // License number mask configuration - flexible alphanumeric
  const licenseMaskRef = useMask({
    mask: '______________',
    replacement: { _: /[A-Za-z0-9]/ },
    showMask: false,
  });

  // Helper function to remove spaces from input
  const removeSpaces = (value: string): string => {
    return value.replace(/\s/g, '');
  };

  const handleInputChange = (field: string, value: string) => {
    let processedValue = value;
    
    // Apply phone formatting
    if (field === 'phone') {
      processedValue = formatPhoneNumber(value);
    }
    
    // Remove spaces from email and website fields
    if (field === 'email' || field === 'website') {
      processedValue = removeSpaces(value);
    }
    
    // Real-time validation as user types
    const error = validateContent(field, processedValue);
    
    setFormData(prev => ({
      ...prev,
      [field]: processedValue
    }));

    setValidationErrors(prev => ({
      ...prev,
      [field]: error || ''
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

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

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Here you would typically make an API call to save the data
      console.log('Form data:', formData);
      
      // Show success message
      toast({
        title: 'Settings saved successfully!',
        description: 'Your changes have been saved.',
      });
      
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Failed to save settings',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
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
            <form onSubmit={handleSubmit} className="space-y-4">
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
                      <AvatarFallback className="text-lg">JC</AvatarFallback>
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
                      className={`w-full rounded-md border p-2 focus:outline-none focus:ring-1 focus:ring-black focus:border-black ${
                        validationErrors.firstName ? 'bg-background border-red-500' : 'bg-background'
                      }`}
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      maxLength={50}
                    />
                    {validationErrors.firstName && (
                      <p className="text-red-500 text-sm">{validationErrors.firstName}</p>
                    )}
                    <p className="text-gray-500 text-xs">
                      {formData.firstName.length}/50 characters
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="font-medium">Last Name</label>
                    <input
                      type="text"
                      className={`w-full rounded-md border p-2 focus:outline-none focus:ring-1 focus:ring-black focus:border-black ${
                        validationErrors.lastName ? 'bg-background border-red-500' : 'bg-background'
                      }`}
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      maxLength={50}
                    />
                    {validationErrors.lastName && (
                      <p className="text-red-500 text-sm">{validationErrors.lastName}</p>
                    )}
                    <p className="text-gray-500 text-xs">
                      {formData.lastName.length}/50 characters
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="font-medium">Email Address</label>
                  <input
                    type="text"
                    className={`w-full rounded-md border p-2 focus:outline-none focus:ring-1 focus:ring-black focus:border-black ${
                      validationErrors.email ? 'bg-background border-red-500' : 'bg-background'
                    }`}
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    maxLength={254}
                    autoComplete="email"
                    inputMode="email"
                    placeholder="your.email@example.com"
                  />
                  {validationErrors.email && (
                    <p className="text-red-500 text-sm">{validationErrors.email}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <label className="font-medium">Phone Number</label>
                  <input
                    type="tel"
                    className={`w-full rounded-md border p-2 focus:outline-none focus:ring-1 focus:ring-black focus:border-black ${
                      validationErrors.phone ? 'bg-background border-red-500' : 'bg-background'
                    }`}
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="(555) 123-4567 or +1 555 123 4567"
                    autoComplete="tel"
                    maxLength={20}
                  />
                  {validationErrors.phone && (
                    <p className="text-red-500 text-sm">{validationErrors.phone}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <label className="font-medium">Business Name</label>
                  <input
                    type="text"
                    className={`w-full rounded-md border p-2 focus:outline-none focus:ring-1 focus:ring-black focus:border-black ${
                      validationErrors.businessName ? 'bg-background border-red-500' : 'bg-background'
                    }`}
                    value={formData.businessName}
                    onChange={(e) => handleInputChange('businessName', e.target.value)}
                    maxLength={100}
                    placeholder="e.g., ABC Real Estate, Smith & Associates, etc."
                  />
                  {validationErrors.businessName && (
                    <p className="text-red-500 text-sm">{validationErrors.businessName}</p>
                  )}
                  <p className="text-gray-500 text-xs">
                    {formData.businessName.length}/100 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="font-medium">Bio</label>
                  <textarea
                    className={`w-full rounded-md border p-2 resize-none focus:outline-none focus:ring-1 focus:ring-black focus:border-black ${
                      validationErrors.bio ? 'bg-background border-red-500' : 'bg-background'
                    }`}
                    rows={3}
                    value={formData.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    maxLength={500}
                    placeholder="Tell us about yourself and your real estate business..."
                  />
                  {validationErrors.bio && (
                    <p className="text-red-500 text-sm">{validationErrors.bio}</p>
                  )}
                  <p className="text-gray-500 text-xs">
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
                  Configure how you want to receive notifications and updates.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-notifications">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications about new calls and messages via email
                    </p>
                  </div>
                  <Switch 
                    id="email-notifications" 
                    checked={formData.emailNotifications}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, emailNotifications: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="marketing-emails">Marketing Emails</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive updates about new features and tips
                    </p>
                  </div>
                  <Switch 
                    id="marketing-emails" 
                    checked={formData.marketingEmails}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, marketingEmails: checked }))}
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
                  <label className="font-medium">Current Password</label>
                  <input
                    type="password"
                    className={`w-full rounded-md border p-2 focus:outline-none focus:ring-1 focus:ring-black focus:border-black ${
                      validationErrors.currentPassword ? 'bg-background border-red-500' : 'bg-background'
                    }`}
                    value={formData.currentPassword}
                    onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                    maxLength={128}
                  />
                  {validationErrors.currentPassword && (
                    <p className="text-red-500 text-sm">{validationErrors.currentPassword}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="font-medium">New Password</label>
                  <input
                    type="password"
                    className={`w-full rounded-md border p-2 focus:outline-none focus:ring-1 focus:ring-black focus:border-black ${
                      validationErrors.newPassword ? 'bg-background border-red-500' : 'bg-background'
                    }`}
                    value={formData.newPassword}
                    onChange={(e) => handleInputChange('newPassword', e.target.value)}
                    maxLength={128}
                  />
                  {validationErrors.newPassword && (
                    <p className="text-red-500 text-sm">{validationErrors.newPassword}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="font-medium">Confirm New Password</label>
                  <input
                    type="password"
                    className={`w-full rounded-md border p-2 focus:outline-none focus:ring-1 focus:ring-black focus:border-black ${
                      validationErrors.confirmPassword ? 'bg-background border-red-500' : 'bg-background'
                    }`}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    maxLength={128}
                  />
                  {validationErrors.confirmPassword && (
                    <p className="text-red-500 text-sm">{validationErrors.confirmPassword}</p>
                  )}
                </div>

                <Button variant="outline">Change Password</Button>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="two-factor">Two-Factor Authentication</Label>
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
                    className={`w-full rounded-md border p-2 focus:outline-none focus:ring-1 focus:ring-black focus:border-black ${
                      validationErrors.licenseNumber ? 'bg-background border-red-500' : 'bg-background'
                    }`}
                    value={formData.licenseNumber}
                    onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                    maxLength={50}
                    placeholder="e.g., RE123456789"
                    autoComplete="off"
                  />
                  {validationErrors.licenseNumber && (
                    <p className="text-red-500 text-sm">{validationErrors.licenseNumber}</p>
                  )}
                  <p className="text-gray-500 text-xs">
                    {formData.licenseNumber.length}/50 characters
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label className="font-medium">Brokerage</label>
                  <input
                    type="text"
                    className={`w-full rounded-md border p-2 focus:outline-none focus:ring-1 focus:ring-black focus:border-black ${
                      validationErrors.brokerage ? 'bg-background border-red-500' : 'bg-background'
                    }`}
                    value={formData.brokerage}
                    onChange={(e) => handleInputChange('brokerage', e.target.value)}
                    maxLength={100}
                  />
                  {validationErrors.brokerage && (
                    <p className="text-red-500 text-sm">{validationErrors.brokerage}</p>
                  )}
                  <p className="text-gray-500 text-xs">
                    {formData.brokerage.length}/100 characters
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label className="font-medium">Website</label>
                  <input
                    type="text"
                    className={`w-full rounded-md border p-2 focus:outline-none focus:ring-1 focus:ring-black focus:border-black ${
                      validationErrors.website ? 'bg-background border-red-500' : 'bg-background'
                    }`}
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    maxLength={254}
                    placeholder="https://your-website.com"
                    autoComplete="url"
                    inputMode="url"
                  />
                  {validationErrors.website && (
                    <p className="text-red-500 text-sm">{validationErrors.website}</p>
                  )}
                  <p className="text-gray-500 text-xs">
                    {formData.website.length}/254 characters
                  </p>
                </div>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="font-medium">City</label>
                    <input
                      type="text"
                      className={`w-full rounded-md border p-2 focus:outline-none focus:ring-1 focus:ring-black focus:border-black ${
                        validationErrors.city ? 'bg-background border-red-500' : 'bg-background'
                      }`}
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      maxLength={50}
                    />
                    {validationErrors.city && (
                      <p className="text-red-500 text-sm">{validationErrors.city}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="font-medium">State</label>
                    <input
                      type="text"
                      className={`w-full rounded-md border p-2 focus:outline-none focus:ring-1 focus:ring-black focus:border-black ${
                        validationErrors.state ? 'bg-background border-red-500' : 'bg-background'
                      }`}
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      maxLength={50}
                    />
                    {validationErrors.state && (
                      <p className="text-red-500 text-sm">{validationErrors.state}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save Changes */}
            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={isSubmitting || Object.values(validationErrors).some(error => error)}
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
            </form>
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
    <Suspense fallback={<div>Loading...</div>}>
      <SettingsContent />
    </Suspense>
  );
}

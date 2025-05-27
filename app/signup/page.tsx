'use client';

import type React from 'react';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneCall } from 'lucide-react';
import { signUp } from '@/lib/auth';
import { toast } from '@/components/ui/use-toast';
import { SocialLogin } from '@/components/auth/social-login';
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
import { useMask } from '@react-input/mask';
import { Filter } from 'bad-words';
import PasswordStrengthBar from 'react-password-strength-bar';

export default function SignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const initialFormData = { firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '' };
  const [score, setScore] = useState(0);

  // Profanity/content filter
  const filter = new Filter();
  filter.addWords('scam', 'fraud', 'fake', 'illegal', 'drugs');

  // Regex patterns for field validation
  const VALIDATION_PATTERNS = {
    NAME_PATTERN: /^[a-zA-Z'](?:[a-zA-Z\s\-'.])*[a-zA-Z']$|^[a-zA-Z']$/,
    EMAIL_PATTERN: /^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/,
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

  // Phone formatting (for display, not strict validation)
  const formatPhoneNumber = (value: string): string => {
    // Remove all non-digit and non-plus characters
    const cleaned = value.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('+')) {
      const digits = cleaned.slice(1);
      const limitedDigits = digits.slice(0, 15);
      if (limitedDigits.length === 0) return '+';
      if (limitedDigits.length <= 4) return `+${limitedDigits}`;
      if (limitedDigits.length <= 7) return `+${limitedDigits.slice(0, limitedDigits.length - 3)} ${limitedDigits.slice(-3)}`;
      if (limitedDigits.length <= 10) return `+${limitedDigits.slice(0, limitedDigits.length - 7)} ${limitedDigits.slice(-7, -4)} ${limitedDigits.slice(-4)}`;
      return `+${limitedDigits.slice(0, limitedDigits.length - 10)} ${limitedDigits.slice(-10, -7)} ${limitedDigits.slice(-7, -4)} ${limitedDigits.slice(-4)}`;
    }
    const digits = cleaned;
    const limitedDigits = digits.slice(0, 10);
    if (limitedDigits.length === 0) return '';
    if (limitedDigits.length <= 3) return `(${limitedDigits}`;
    if (limitedDigits.length <= 6) return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3)}`;
    return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`;
  };

  // Validation logic
  const validateContent = (field: string, value: string): string | null => {
    switch (field) {
      case 'firstName':
      case 'lastName': {
        if (!value) return 'This field is required';
        if (value.length > 50) return 'Please keep this under 50 characters';
        if (filter.isProfane(value)) return 'Please use professional, appropriate language';
        if (!VALIDATION_PATTERNS.NAME_PATTERN.test(value)) {
          return 'Please use only letters, spaces, and common punctuation';
        }
        return null;
      }
      case 'email': {
        if (!value) return 'This field is required';
        if (value.length > 254) return 'Please use a shorter email address';
        if (!VALIDATION_PATTERNS.EMAIL_PATTERN.test(value)) return 'Please check your email format (e.g., name@example.com)';
        if (value.includes('..')) return 'Please remove consecutive dots from your email';
        if (value.startsWith('.') || value.endsWith('.')) return 'Email addresses cannot start or end with a dot';
        if (value.includes('@.') || value.includes('.@')) return 'Please check the format around the @ symbol';
        const parts = value.split('@');
        if (parts.length === 2) {
          const domain = parts[1];
          if (!domain.includes('.') || domain.split('.').pop()!.length < 2) {
            return 'Please include a valid domain (e.g., gmail.com)';
          }
        }
        return null;
      }
      case 'phone': {
        if (!value) return null; // Optional
        const isInternational = value.startsWith('+');
        const digitsOnly = value.replace(/\D/g, '');
        if (isInternational) {
          if (digitsOnly.length < 7) return 'Please enter at least 7 digits for international numbers';
          if (digitsOnly.length > 15) return 'International numbers cannot exceed 15 digits';
          if (digitsOnly.length >= 10) {
            const countryCodeLength = digitsOnly.length - 10;
            if (countryCodeLength > 4) return 'Please check your country code';
          }
          if (digitsOnly.length < 8) return 'Please enter a complete international number';
        } else {
          if (digitsOnly.length > 0 && digitsOnly.length < 3) return null;
          if (digitsOnly.length > 0 && digitsOnly.length < 10) return 'Please enter a complete 10-digit phone number';
          if (digitsOnly.length > 10) return 'US phone numbers should be exactly 10 digits';
          if (digitsOnly.length === 10) {
            const areaCode = digitsOnly.substring(0, 3);
            const exchange = digitsOnly.substring(3, 6);
            if (areaCode.startsWith('0') || areaCode.startsWith('1')) return 'Please enter a valid area code';
            if (exchange.startsWith('0') || exchange.startsWith('1')) return 'Please enter a valid exchange code';
            if (areaCode === '911' || exchange === '911') return 'Please use a different phone number';
            if (areaCode === '000' || exchange === '000' || (areaCode === '555' && exchange === '555')) return 'Please enter a valid phone number';
          }
        }
        return null;
      }
      case 'password': {
        if (!value) return 'This field is required';
        if (value.length < 8) return 'Please use at least 8 characters';
        if (value.length > 128) return 'Please keep password under 128 characters';
        if (!/[A-Z]/.test(value)) return 'Please include at least one uppercase letter';
        if (!/[a-z]/.test(value)) return 'Please include at least one lowercase letter';
        if (!/[0-9]/.test(value)) return 'Please include at least one number';
        if (!/[!@#$%^&*(),.?":{}|<>\[\]\\/\-_+=~`';]/.test(value)) return 'Please include at least one special character (!@#$%^&* etc.)';
        return null;
      }
      case 'confirmPassword': {
        if (!value) return 'This field is required';
        if (value !== formData.password) return 'Please make sure both passwords match';
        return null;
      }
      default:
        return null;
    }
  };

  // Handle field blur (when user leaves the field)
  const handleFieldBlur = (field: string) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    
    let valueToValidate = formData[field as keyof typeof formData];
    
    // Auto-trim name fields when user leaves the field
    if (field === 'firstName' || field === 'lastName') {
      const trimmedValue = valueToValidate.trim();
      setFormData(prev => ({ ...prev, [field]: trimmedValue }));
      valueToValidate = trimmedValue;
    }
    
    const error = validateContent(field, valueToValidate);
    setValidationErrors(prev => ({ ...prev, [field]: error || '' }));
  };

  // Unified input handler
  const handleInputChange = (field: string, value: string) => {
    let processedValue = value;
    if (field === 'phone') {
      processedValue = formatPhoneNumber(value);
    }
    setFormData(prev => ({ ...prev, [field]: processedValue }));
    
    // Only show validation errors for fields that have been touched (blurred)
    // Exception: show validation for confirmPassword immediately if password field has been touched
    if (touchedFields[field] || (field === 'confirmPassword' && touchedFields.password)) {
      // For name fields, validate against the trimmed value but don't update the form data yet
      const valueForValidation = (field === 'firstName' || field === 'lastName') ? processedValue.trim() : processedValue;
      const error = validateContent(field, valueForValidation);
      setValidationErrors(prev => ({ ...prev, [field]: error || '' }));
    }
  };

  const isFormChanged = JSON.stringify(formData) !== JSON.stringify(initialFormData);
  const hasValidationErrors = Object.values(validationErrors).some(error => error);

  // Cancel logic
  const handleCancel = () => {
    setFormData({ ...initialFormData });
    setValidationErrors({});
    setTouchedFields({});
  };

  // Actual signup logic (direct submit)
  const doSignup = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await signUp(formData.email, formData.password);
      if (error) {
        throw error;
      }
      toast({
        title: 'Account created',
        description: 'Please check your email to verify your account.',
      });
      router.push('/signup/confirmation');
    } catch (error: any) {
      toast({
        title: 'Error creating account',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Form submit handler
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Mark all fields as touched and validate them
    const allFields = ['firstName', 'lastName', 'email', 'phone', 'password', 'confirmPassword'];
    const newTouchedFields: Record<string, boolean> = {};
    const newValidationErrors: Record<string, string> = {};
    
    allFields.forEach(field => {
      newTouchedFields[field] = true;
      let valueToValidate = formData[field as keyof typeof formData];
      
      // Use trimmed values for name field validation
      if (field === 'firstName' || field === 'lastName') {
        valueToValidate = valueToValidate.trim();
      }
      
      const error = validateContent(field, valueToValidate);
      newValidationErrors[field] = error || '';
    });
    
    setTouchedFields(newTouchedFields);
    setValidationErrors(newValidationErrors);
    
    // Check if there are any validation errors
    const hasErrors = Object.values(newValidationErrors).some(error => error);
    
    if (!hasErrors && JSON.stringify(formData) !== JSON.stringify(initialFormData)) {
      await doSignup();
    }
  };

  // Helper to check if all required fields are filled (except phone)
  const areRequiredFieldsFilled =
    formData.firstName.trim() !== '' &&
    formData.lastName.trim() !== '' &&
    formData.email.trim() !== '' &&
    formData.password.trim() !== '' &&
    formData.confirmPassword.trim() !== '';

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 text-xl font-bold">
            <PhoneCall className="h-5 w-5 text-primary" />
            <Link href="/">Spoqen</Link>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium">
              Login
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Create an account</CardTitle>
              <CardDescription>
                Start your 14-day free trial. No credit card required.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:gap-2">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    placeholder="Enter your first name"
                    value={formData.firstName}
                    onChange={e => handleInputChange('firstName', e.target.value)}
                    onBlur={() => handleFieldBlur('firstName')}
                    required
                    aria-invalid={!!validationErrors.firstName}
                    maxLength={50}
                    inputMode="text"
                  />
                  {validationErrors.firstName && (
                    <p className="text-muted-foreground text-sm">{validationErrors.firstName}</p>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    placeholder="Enter your last name"
                    value={formData.lastName}
                    onChange={e => handleInputChange('lastName', e.target.value)}
                    onBlur={() => handleFieldBlur('lastName')}
                    required
                    aria-invalid={!!validationErrors.lastName}
                    maxLength={50}
                    inputMode="text"
                  />
                  {validationErrors.lastName && (
                    <p className="text-muted-foreground text-sm">{validationErrors.lastName}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="text"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={e => handleInputChange('email', e.target.value)}
                  onBlur={() => handleFieldBlur('email')}
                  required
                  aria-invalid={!!validationErrors.email}
                  maxLength={254}
                  inputMode="email"
                  autoComplete="email"
                  ref={emailMaskRef}
                />
                {validationErrors.email && (
                  <p className="text-muted-foreground text-sm">{validationErrors.email}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 123-4567 or +1 555 123 4567"
                  value={formData.phone}
                  onChange={e => handleInputChange('phone', e.target.value)}
                  onBlur={() => handleFieldBlur('phone')}
                  aria-invalid={!!validationErrors.phone}
                  maxLength={20}
                  inputMode="tel"
                  autoComplete="tel"
                />
                {validationErrors.phone && (
                  <p className="text-muted-foreground text-sm">{validationErrors.phone}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={e => handleInputChange('password', e.target.value)}
                  onBlur={() => handleFieldBlur('password')}
                  required
                  aria-invalid={!!validationErrors.password}
                  maxLength={128}
                />
                <PasswordStrengthBar
                  password={formData.password}
                  minLength={8}
                  scoreWords={['Too weak', 'Weak', 'Okay', 'Strong', 'Very strong']}
                  onChangeScore={setScore}
                />
                {validationErrors.password && (
                  <p className="text-muted-foreground text-sm">{validationErrors.password}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={e => handleInputChange('confirmPassword', e.target.value)}
                  onBlur={() => handleFieldBlur('confirmPassword')}
                  required
                  aria-invalid={!!validationErrors.confirmPassword}
                  maxLength={128}
                />
                {validationErrors.confirmPassword && (
                  <p className="text-muted-foreground text-sm">{validationErrors.confirmPassword}</p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <div className="w-full">
                <Button
                  className="w-full"
                  type="submit"
                  disabled={
                    isLoading ||
                    !areRequiredFieldsFilled ||
                    Object.values(validationErrors).some(error => error) ||
                    JSON.stringify(formData) === JSON.stringify(initialFormData) ||
                    formData.password.length < 8 ||
                    score < 2
                  }
                >
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </div>
              <SocialLogin mode="signup" />
              <div className="text-center text-sm text-muted-foreground">
                By creating an account, you agree to our{' '}
                <Link href="/terms" className="underline underline-offset-4">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="underline underline-offset-4">
                  Privacy Policy
                </Link>
                .
              </div>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}

'use client';

import type React from 'react';

import { useState, useEffect, useRef } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
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
import { signUp } from '@/lib/auth';
import { toast } from '@/components/ui/use-toast';
import { SocialLogin } from '@/components/auth/social-login';
import { useMask } from '@react-input/mask';
import { Filter } from 'bad-words';
import dynamic from 'next/dynamic';
const PasswordStrengthBar = dynamic(
  () => import('react-password-strength-bar'),
  { ssr: false }
);
import Logo from '@/components/ui/logo';
import { CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { logger } from '@/lib/logger';

// CONVERSION OPTIMIZATION: Reduced form fields for better conversion
type FormFieldName = 'email' | 'password' | 'confirmPassword' | 'firstName';

type FormData = Record<FormFieldName, string>;

// CONVERSION OPTIMIZATION: Real-time validation feedback component
const ValidationFeedback = ({
  isValid,
  isValidating,
  message,
  showOnValid = false,
}: {
  isValid: boolean;
  isValidating: boolean;
  message: string;
  showOnValid?: boolean;
}) => {
  if (isValidating) {
    return (
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span>Checking...</span>
      </div>
    );
  }

  if (isValid && showOnValid) {
    return (
      <div className="flex items-center space-x-2 text-sm text-green-600">
        <CheckCircle className="h-4 w-4" />
        <span>Looks good!</span>
      </div>
    );
  }

  if (!isValid && message) {
    return (
      <div className="flex items-center space-x-2 text-sm text-red-600">
        <AlertCircle className="h-4 w-4" />
        <span>{message}</span>
      </div>
    );
  }

  return null;
};

export default function SignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // CONVERSION OPTIMIZATION: Simplified form data with only essential fields
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '', // Optional - can be collected later in onboarding
  });

  const [validationErrors, setValidationErrors] = useState<
    Record<FormFieldName, string>
  >({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
  });

  const [touchedFields, setTouchedFields] = useState<
    Record<FormFieldName, boolean>
  >({
    email: false,
    password: false,
    confirmPassword: false,
    firstName: false,
  });

  // CONVERSION OPTIMIZATION: Real-time validation states
  const [isValidating, setIsValidating] = useState<
    Record<FormFieldName, boolean>
  >({
    email: false,
    password: false,
    confirmPassword: false,
    firstName: false,
  });

  const latestPasswordRef = useRef('');
  const confirmPasswordRef = useRef('');
  const emailRequestIdRef = useRef(0);
  const emailRemotePendingRef = useRef(false);

  const [fieldValidStates, setFieldValidStates] = useState<
    Record<FormFieldName, boolean>
  >({
    email: false,
    password: false,
    confirmPassword: false,
    firstName: true, // Optional field, defaults to valid
  });

  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [score, setScore] = useState(0);

  // Profanity/content filter
  const filter = new Filter();
  filter.addWords('scam', 'fraud', 'fake', 'illegal', 'drugs');

  // Validation patterns
  const VALIDATION_PATTERNS = {
    NAME_PATTERN: /^[\p{L}'](?:[\p{L}\s\-'.])*[\p{L}']$|^[\p{L}']$/u,
    EMAIL_PATTERN:
      /^[a-zA-Z0-9]([a-zA-Z0-9._+-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/,
  };

  // Email mask
  const emailMaskRef = useMask({
    mask: '****************************************************************',
    replacement: { '*': /[a-zA-Z0-9._%+\-@]/ },
    showMask: false,
  });

  const removeSpaces = (value: string): string => value.replace(/\s/g, '');

  // CONVERSION OPTIMIZATION: Real-time validation with debouncing
  const validateField = async (
    field: FormFieldName,
    value: string
  ): Promise<string | null> => {
    switch (field) {
      case 'firstName': {
        if (!value) return null; // Optional field
        if (value.length > 50) return 'Please keep this under 50 characters';
        if (filter.isProfane(value)) return 'Please use appropriate language';
        if (!VALIDATION_PATTERNS.NAME_PATTERN.test(value)) {
          return 'Please use only letters, spaces, and common punctuation';
        }
        return null;
      }
      case 'email': {
        if (!value) return 'Email is required';
        if (value.length > 254) return 'Please use a shorter email address';
        if (!VALIDATION_PATTERNS.EMAIL_PATTERN.test(value)) {
          return 'Please enter a valid email address';
        }
        if (value.includes('..'))
          return 'Please remove consecutive dots from your email';
        if (value.startsWith('.') || value.endsWith('.')) {
          return 'Email addresses cannot start or end with a dot';
        }
        if (value.includes('@.') || value.includes('.@')) {
          return 'Please check the format around the @ symbol';
        }
        const parts = value.split('@');
        if (parts.length === 2) {
          const domain = parts[1];
          if (!domain.includes('.') || domain.split('.').pop()!.length < 2) {
            return 'Please include a valid domain (e.g., gmail.com)';
          }
        }
        return null;
      }
      case 'password': {
        if (!value) return 'Password is required';
        if (value.length < 8) return 'Password must be at least 8 characters';
        if (value.length > 128) return 'Password is too long';
        if (!/(?=.*[a-z])/.test(value))
          return 'Include at least one lowercase letter';
        if (!/(?=.*[A-Z])/.test(value))
          return 'Include at least one uppercase letter';
        if (!/(?=.*\d)/.test(value)) return 'Include at least one number';
        if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(value)) {
          return 'Include at least one special character';
        }
        return null;
      }
      case 'confirmPassword': {
        if (!value) return 'Please confirm your password';
        if (value !== latestPasswordRef.current)
          return 'Passwords do not match';
        return null;
      }
      default:
        return null;
    }
  };

  // Debounced per-field validation (runs only on the field being edited)
  // Store timers so each field has its own debounce instance
  const validationTimers = useRef<Record<FormFieldName, NodeJS.Timeout | null>>(
    {
      email: null,
      password: null,
      confirmPassword: null,
      firstName: null,
    }
  );

  const triggerValidation = (field: FormFieldName, value: string) => {
    // Clear any existing timer for this field
    if (validationTimers.current[field]) {
      clearTimeout(validationTimers.current[field] as NodeJS.Timeout);
    }

    setIsValidating(prev => ({ ...prev, [field]: true }));

    validationTimers.current[field] = setTimeout(async () => {
      const error = await validateField(field, value);
      setValidationErrors(prev => ({ ...prev, [field]: error || '' }));
      if (field === 'email') {
        setFieldValidStates(prev => ({
          ...prev,
          email: !error && !emailRemotePendingRef.current,
        }));
      } else {
        setFieldValidStates(prev => ({ ...prev, [field]: !error }));
      }
      if (field === 'email') {
        if (!emailRemotePendingRef.current) {
          setIsValidating(prev => ({ ...prev, [field]: false }));
        }
      } else {
        setIsValidating(prev => ({ ...prev, [field]: false }));
      }
    }, 300);
  };

  /**
   * Queries the /api/check-email-exists endpoint to see if an email already exists.
   * Throws on network / server errors so callers can differentiate connectivity
   * problems from a "false" (email not taken) result.
   *
   * Basic retry with exponential back-off (maxAttempts = 3).
   */
  const checkEmailExists = async (
    email: string,
    maxAttempts = 3
  ): Promise<boolean> => {
    let attempt = 0;
    // Doubled delay each retry: 0 ms, 250 ms, 500 ms
    const baseDelay = 250;

    while (attempt < maxAttempts) {
      try {
        const res = await fetch(
          `/api/check-email-exists?email=${encodeURIComponent(email)}`
        );

        if (!res.ok) {
          // Treat non-2xx as error (e.g., 500, 502, 404)
          const text = await res.text();
          throw new Error(`Endpoint error: ${res.status} — ${text}`);
        }

        const json: { exists: boolean } = await res.json();
        // Defensive check
        if (typeof json.exists !== 'boolean') {
          throw new Error('Malformed response from email-exists endpoint');
        }

        return json.exists;
      } catch (err) {
        attempt += 1;
        if (attempt >= maxAttempts) {
          // Exhausted retries — rethrow to caller
          throw err;
        }
        // Wait before retrying
        await new Promise(res => setTimeout(res, baseDelay * attempt));
      }
    }

    // Fallback — should never reach here
    throw new Error('Retries exhausted');
  };

  const handleFieldBlur = (field: FormFieldName) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));

    // Only run remote uniqueness check for email when the basic format is valid
    if (field === 'email') {
      (async () => {
        const requestId = ++emailRequestIdRef.current;

        const regexError = await validateField('email', formData.email);
        if (regexError) {
          return;
        }

        emailRemotePendingRef.current = true;
        setIsValidating(prev => ({ ...prev, email: true }));

        try {
          const exists = await checkEmailExists(formData.email);

          if (requestId !== emailRequestIdRef.current) return;

          emailRemotePendingRef.current = false;
          setIsValidating(prev => ({ ...prev, email: false }));

          if (exists) {
            setValidationErrors(prev => ({
              ...prev,
              email: 'Email already in use',
            }));
            setFieldValidStates(prev => ({ ...prev, email: false }));
          } else {
            // Only clear the error if it was related to uniqueness
            setValidationErrors(prev => ({
              ...prev,
              email: prev.email === 'Email already in use' ? '' : prev.email,
            }));
            setFieldValidStates(prev => ({ ...prev, email: true }));
          }
        } catch (err) {
          if (requestId !== emailRequestIdRef.current) return;

          emailRemotePendingRef.current = false;
          setIsValidating(prev => ({ ...prev, email: false }));
          logger.error('SIGNUP', 'Email uniqueness check failed', err as Error);
          // Show generic connectivity error but keep field invalid so user cannot proceed
          setValidationErrors(prev => ({
            ...prev,
            email:
              'Unable to verify email uniqueness. Please check your connection.',
          }));
          setFieldValidStates(prev => ({ ...prev, email: false }));
        }
      })();
    }
  };

  const handleInputChange = (field: FormFieldName, value: string) => {
    let processedValue = value;

    // Process value based on field type
    if (field === 'email') {
      processedValue = removeSpaces(value.toLowerCase().trim());
    } else if (field === 'firstName') {
      processedValue = value.slice(0, 50); // Limit length
    } else if (field === 'password' || field === 'confirmPassword') {
      processedValue = value.slice(0, 128); // Limit length
    }

    // Update refs for latest values before validations
    if (field === 'password') {
      latestPasswordRef.current = processedValue;
    } else if (field === 'confirmPassword') {
      confirmPasswordRef.current = processedValue;
    }

    // Mark field as touched as soon as user edits
    setTouchedFields(prev => ({ ...prev, [field]: true }));

    setFormData(prev => ({ ...prev, [field]: processedValue }));

    // While the user is actively typing in email, consider it invalid until uniqueness check runs on blur
    if (field === 'email') {
      setFieldValidStates(prev => ({ ...prev, email: false }));
    }

    triggerValidation(field, processedValue);

    // If password changed, re-validate confirmPassword with latest value to keep them in sync
    if (field === 'password' && touchedFields.confirmPassword) {
      triggerValidation('confirmPassword', confirmPasswordRef.current);
    }
  };

  // CONVERSION OPTIMIZATION: Check if form is valid for submission
  const isFormValid = () => {
    return (
      fieldValidStates.email &&
      fieldValidStates.password &&
      fieldValidStates.confirmPassword &&
      acceptedTerms &&
      !isLoading
    );
  };

  const doSignup = async () => {
    try {
      setIsLoading(true);

      // Use first name if provided, otherwise use email prefix
      const firstName = formData.firstName || formData.email.split('@')[0];

      await signUp(formData.email, formData.password, firstName, '', '');

      toast({
        title: 'Account created successfully!',
        description:
          'Check your email and click the link to activate your account.',
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Mark required fields as touched
    const requiredFields: FormFieldName[] = [
      'email',
      'password',
      'confirmPassword',
    ];
    const newTouchedFields = { ...touchedFields };
    requiredFields.forEach(field => {
      newTouchedFields[field] = true;
    });
    setTouchedFields(newTouchedFields);

    // Validate all fields
    const validationPromises = requiredFields.map(async field => {
      const error = await validateField(field, formData[field]);
      return { field, error };
    });

    const validationResults = await Promise.all(validationPromises);
    const newValidationErrors = { ...validationErrors };
    const newFieldValidStates = { ...fieldValidStates };

    validationResults.forEach(({ field, error }) => {
      newValidationErrors[field] = error || '';
      newFieldValidStates[field] = !error;
    });

    // Extra server-side uniqueness check for email during final submission
    if (newFieldValidStates.email) {
      setIsValidating(prev => ({ ...prev, email: true }));
      let exists: boolean | null = null;
      try {
        exists = await checkEmailExists(formData.email);
      } catch (err) {
        // Network or server error – log but allow submission to proceed.
        logger.error(
          'SIGNUP',
          'Email uniqueness check failed during submission, proceeding anyway',
          err as Error
        );
      }

      // Only mark invalid if check completed and email definitely exists
      if (exists === true) {
        newValidationErrors.email = 'Email already in use';
        newFieldValidStates.email = false;
      }
    }

    setValidationErrors(newValidationErrors);
    setFieldValidStates(newFieldValidStates);

    if (
      newFieldValidStates.email &&
      newFieldValidStates.password &&
      newFieldValidStates.confirmPassword &&
      acceptedTerms &&
      !isLoading
    ) {
      await doSignup();
    }
  };

  return (
    <ProtectedRoute requireAuth={false}>
      <div className="flex min-h-screen flex-col">
        <main className="flex flex-1 items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <form onSubmit={handleSubmit}>
              <CardHeader>
                <CardTitle>Create your account</CardTitle>
                <CardDescription>
                  Start your 14-day free trial. No credit card required.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* CONVERSION OPTIMIZATION: Optional first name field for personalization */}
                <div className="space-y-2">
                  <Label htmlFor="firstName">
                    First Name{' '}
                    <span className="text-sm text-muted-foreground">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    id="firstName"
                    placeholder="Enter your first name"
                    value={formData.firstName}
                    onChange={e =>
                      handleInputChange('firstName', e.target.value)
                    }
                    onBlur={() => handleFieldBlur('firstName')}
                    maxLength={50}
                    inputMode="text"
                    autoComplete="given-name"
                  />
                  {touchedFields.firstName && (
                    <ValidationFeedback
                      isValid={fieldValidStates.firstName}
                      isValidating={isValidating.firstName}
                      message={validationErrors.firstName}
                      showOnValid={!!formData.firstName}
                    />
                  )}
                </div>

                {/* CONVERSION OPTIMIZATION: Email with real-time validation */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="text"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={e => handleInputChange('email', e.target.value)}
                    onBlur={() => handleFieldBlur('email')}
                    required
                    maxLength={254}
                    inputMode="email"
                    autoComplete="email"
                    ref={emailMaskRef}
                    className={
                      touchedFields.email
                        ? fieldValidStates.email
                          ? 'border-green-500 focus:border-green-500'
                          : 'border-red-500 focus:border-red-500'
                        : ''
                    }
                  />
                  {touchedFields.email && (
                    <ValidationFeedback
                      isValid={fieldValidStates.email}
                      isValidating={isValidating.email}
                      message={validationErrors.email}
                      showOnValid={true}
                    />
                  )}
                </div>

                {/* CONVERSION OPTIMIZATION: Password with strength indicator and show/hide */}
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a strong password"
                      value={formData.password}
                      onChange={e =>
                        handleInputChange('password', e.target.value)
                      }
                      onBlur={() => handleFieldBlur('password')}
                      required
                      maxLength={128}
                      autoComplete="new-password"
                      className={
                        touchedFields.password
                          ? fieldValidStates.password
                            ? 'border-green-500 focus:border-green-500'
                            : 'border-red-500 focus:border-red-500'
                          : ''
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>

                  {formData.password && (
                    <PasswordStrengthBar
                      password={formData.password}
                      minLength={8}
                      scoreWords={[
                        'Too weak',
                        'Weak',
                        'Okay',
                        'Strong',
                        'Very strong',
                      ]}
                      onChangeScore={setScore}
                    />
                  )}

                  {touchedFields.password && (
                    <ValidationFeedback
                      isValid={fieldValidStates.password}
                      isValidating={isValidating.password}
                      message={validationErrors.password}
                      showOnValid={true}
                    />
                  )}
                </div>

                {/* CONVERSION OPTIMIZATION: Confirm password with real-time matching */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={e =>
                        handleInputChange('confirmPassword', e.target.value)
                      }
                      onBlur={() => handleFieldBlur('confirmPassword')}
                      required
                      maxLength={128}
                      autoComplete="new-password"
                      className={
                        touchedFields.confirmPassword
                          ? fieldValidStates.confirmPassword
                            ? 'border-green-500 focus:border-green-500'
                            : 'border-red-500 focus:border-red-500'
                          : ''
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>

                  {touchedFields.confirmPassword && (
                    <ValidationFeedback
                      isValid={fieldValidStates.confirmPassword}
                      isValidating={isValidating.confirmPassword}
                      message={validationErrors.confirmPassword}
                      showOnValid={true}
                    />
                  )}
                </div>
              </CardContent>

              <CardFooter className="flex flex-col space-y-4">
                {/* Terms checkbox */}
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="terms"
                    checked={acceptedTerms}
                    onCheckedChange={v => setAcceptedTerms(!!v)}
                    aria-label="Accept Terms of Service and Privacy Policy"
                    className="rounded-[2px]"
                  />
                  <label
                    htmlFor="terms"
                    className="text-sm text-muted-foreground"
                  >
                    I agree to the{' '}
                    <Link
                      href="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Privacy Policy
                    </Link>
                  </label>
                </div>

                <div className="w-full">
                  <Button
                    className="w-full"
                    type="submit"
                    disabled={isLoading || !isFormValid()}
                    variant={isFormValid() ? 'default' : 'secondary'}
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Creating Account...</span>
                      </div>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </div>

                <SocialLogin mode="signup" />

                <div className="text-center text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <Link href="/login" className="text-primary hover:underline">
                    Sign in
                  </Link>
                </div>
              </CardFooter>
            </form>
          </Card>
        </main>
      </div>
    </ProtectedRoute>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { Filter } from 'bad-words';
import { Button } from '@/components/ui/button';
import {
  useUserSettings,
  type AIReceptionistSettings,
} from '@/hooks/use-user-settings';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell,
  Calendar,
  Clock,
  Edit,
  MessageSquare,
  PhoneCall,
  Settings,
} from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard-header';
import { RecentCallsList } from '@/components/recent-calls-list';
import { StatsCards } from '@/components/stats-cards';
import { toast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

// Initialize content filter outside component to prevent recreation on every render
const contentFilter = new Filter();
contentFilter.addWords('scam', 'fraud', 'fake', 'illegal', 'drugs');

export default function DashboardPage() {
  const [isEditing, setIsEditing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Use the user settings hook
  const {
    loading: settingsLoading,
    saving: settingsSaving,
    error: settingsError,
    dataLoaded,
    updateAIReceptionistSettings,
    getAIReceptionistSettings,
  } = useUserSettings();

  // Get current settings from the hook
  const savedData = getAIReceptionistSettings();

  // Current form data (can be different from saved while editing)
  const [formData, setFormData] = useState<AIReceptionistSettings>(savedData);

  // Update form data when settings are loaded
  useEffect(() => {
    if (dataLoaded) {
      const currentSettings = getAIReceptionistSettings();
      setFormData(currentSettings);
    }
  }, [dataLoaded, getAIReceptionistSettings]);

  // Validation rules for each field
  const fieldLimits = {
    aiAssistantName: { maxLength: 25, minLength: 1 },
    yourName: { maxLength: 50, minLength: 1 },
    businessName: { maxLength: 100, minLength: 1 },
    greetingScript: { maxLength: 500, minLength: 10 },
  };

  // Regex patterns for field validation - extracted to prevent ReDoS attacks
  // These patterns are designed to be efficient and avoid catastrophic backtracking
  const VALIDATION_PATTERNS = {
    // Names: letters, single spaces (no consecutive), basic punctuation (limited)
    // Prevents ReDoS by avoiding nested quantifiers and limiting repetition
    // Updated to support Unicode letters including accented and international characters
    NAME_PATTERN: /^[\p{L}](?:[\p{L}\s\-'.])*[\p{L}]$|^[\p{L}]$/u,

    // Business names: alphanumeric, single spaces, limited punctuation
    // More restrictive to prevent ReDoS while allowing common business name formats
    // Fixed: handles both single and multi-character names
    BUSINESS_NAME_PATTERN:
      /^[a-zA-Z0-9](?:[a-zA-Z0-9\s\-'.,&()]*[a-zA-Z0-9.)])?$/,
  };

  const validateContent = (field: string, value: string): string | null => {
    const limits = fieldLimits[field as keyof typeof fieldLimits];

    // Check length limits
    if (value.length < limits.minLength) {
      return `Minimum ${limits.minLength} characters required`;
    }
    if (value.length > limits.maxLength) {
      return `Maximum ${limits.maxLength} characters allowed`;
    }

    // Check for inappropriate content using the pre-initialized filter
    if (contentFilter.isProfane(value)) {
      return 'Please use professional, appropriate language';
    }

    // Field-specific validation using extracted patterns
    switch (field) {
      case 'aiAssistantName':
      case 'yourName':
        // Names should only contain letters, spaces, and basic punctuation
        if (!VALIDATION_PATTERNS.NAME_PATTERN.test(value)) {
          return 'Names should only contain letters, spaces, and basic punctuation';
        }
        break;

      case 'businessName':
        // Business names can contain letters, numbers, spaces, and common business punctuation
        if (!VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test(value)) {
          return 'Business names should only contain letters, numbers, spaces, and basic punctuation';
        }
        break;

      case 'greetingScript':
        // No additional restrictions for greeting script - profanity filter handles inappropriate content
        break;
    }

    return null;
  };

  const handleEdit = () => {
    setIsEditing(true);
    setValidationErrors({});
  };

  const doSave = async () => {
    setConfirmOpen(false);
    // Validate all fields before saving
    const errors: Record<string, string> = {};
    Object.entries(formData).forEach(([field, value]) => {
      const error = validateContent(field, value);
      if (error) {
        errors[field] = error;
      }
    });
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      await updateAIReceptionistSettings(formData);
      setIsEditing(false);
      setValidationErrors({});
    } catch (error) {
      // Error handling is done in the hook
      console.error('Failed to save settings:', error);
    }
  };

  const handleCancel = () => {
    // Revert form data back to saved data
    const currentSavedData = getAIReceptionistSettings();
    setFormData({ ...currentSavedData });
    setIsEditing(false);
    setValidationErrors({});
  };

  const handleInputChange = (field: string, value: string) => {
    // Real-time validation as user types
    const error = validateContent(field, value);

    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    setValidationErrors(prev => ({
      ...prev,
      [field]: error || '',
    }));
  };

  // Add a helper to check if form data has changed
  const currentSavedData = getAIReceptionistSettings();
  const isFormChanged =
    JSON.stringify(formData) !== JSON.stringify(currentSavedData);

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col">
        <DashboardHeader />
        <div className="flex-1 space-y-4 p-8 pt-6">
          <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          </div>
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="calls">Calls</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-4">
              <StatsCards />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="md:col-span-1 lg:col-span-4">
                  <CardHeader>
                    <CardTitle>Recent Calls</CardTitle>
                    <CardDescription>
                      You've received 12 calls in the last 7 days.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RecentCallsList />
                  </CardContent>
                </Card>
                <Card className="md:col-span-1 lg:col-span-3">
                  <CardHeader>
                    <CardTitle>Your AI Receptionist</CardTitle>
                    <CardDescription>
                      Customize how your AI assistant interacts with callers.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {settingsLoading || !dataLoaded ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="text-center">
                          <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
                          <p className="text-sm text-muted-foreground">
                            Loading settings...
                          </p>
                        </div>
                      </div>
                    ) : settingsError ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="text-center">
                          <p className="mb-2 text-sm text-red-600">
                            Failed to load settings
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.location.reload()}
                          >
                            Retry
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <form
                        className="space-y-4"
                        onSubmit={e => {
                          e.preventDefault();
                          if (
                            !Object.values(validationErrors).some(
                              error => error
                            ) &&
                            isFormChanged
                          ) {
                            setConfirmOpen(true);
                          }
                        }}
                      >
                        <div className="space-y-2">
                          <label className="font-medium">
                            AI Assistant Name
                          </label>
                          <input
                            type="text"
                            className={`w-full rounded-md border p-2 focus:outline-none ${
                              !isEditing
                                ? 'cursor-default bg-muted'
                                : validationErrors.aiAssistantName
                                  ? 'border-red-500 bg-background focus:border-black focus:ring-1 focus:ring-black'
                                  : 'bg-background focus:border-black focus:ring-1 focus:ring-black'
                            }`}
                            value={formData.aiAssistantName}
                            onChange={e =>
                              handleInputChange(
                                'aiAssistantName',
                                e.target.value
                              )
                            }
                            readOnly={!isEditing}
                            maxLength={25}
                          />
                          {validationErrors.aiAssistantName && (
                            <p className="text-sm text-red-500">
                              {validationErrors.aiAssistantName}
                            </p>
                          )}
                          {isEditing && (
                            <p className="text-xs text-gray-500">
                              {formData.aiAssistantName.length}/25 characters
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label className="font-medium">Your Name</label>
                          <input
                            type="text"
                            className={`w-full rounded-md border p-2 focus:outline-none ${
                              !isEditing
                                ? 'cursor-default bg-muted'
                                : validationErrors.yourName
                                  ? 'border-red-500 bg-background focus:border-black focus:ring-1 focus:ring-black'
                                  : 'bg-background focus:border-black focus:ring-1 focus:ring-black'
                            }`}
                            value={formData.yourName}
                            onChange={e =>
                              handleInputChange('yourName', e.target.value)
                            }
                            readOnly={!isEditing}
                            maxLength={50}
                          />
                          {validationErrors.yourName && (
                            <p className="text-sm text-red-500">
                              {validationErrors.yourName}
                            </p>
                          )}
                          {isEditing && (
                            <p className="text-xs text-gray-500">
                              {formData.yourName.length}/50 characters
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label className="font-medium">Business Name</label>
                          <input
                            type="text"
                            className={`w-full rounded-md border p-2 focus:outline-none ${
                              !isEditing
                                ? 'cursor-default bg-muted'
                                : validationErrors.businessName
                                  ? 'border-red-500 bg-background focus:border-black focus:ring-1 focus:ring-black'
                                  : 'bg-background focus:border-black focus:ring-1 focus:ring-black'
                            }`}
                            value={formData.businessName}
                            onChange={e =>
                              handleInputChange('businessName', e.target.value)
                            }
                            readOnly={!isEditing}
                            maxLength={100}
                            placeholder={
                              isEditing
                                ? 'e.g., ABC Real Estate, Smith & Associates, etc.'
                                : ''
                            }
                          />
                          {validationErrors.businessName && (
                            <p className="text-sm text-red-500">
                              {validationErrors.businessName}
                            </p>
                          )}
                          {isEditing && (
                            <p className="text-xs text-gray-500">
                              {formData.businessName.length}/100 characters
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label className="font-medium">Greeting Script</label>
                          <textarea
                            className={`w-full resize-none rounded-md border p-2 focus:outline-none ${
                              !isEditing
                                ? 'cursor-default bg-muted'
                                : validationErrors.greetingScript
                                  ? 'border-red-500 bg-background focus:border-black focus:ring-1 focus:ring-black'
                                  : 'bg-background focus:border-black focus:ring-1 focus:ring-black'
                            }`}
                            rows={3}
                            value={formData.greetingScript}
                            onChange={e =>
                              handleInputChange(
                                'greetingScript',
                                e.target.value
                              )
                            }
                            readOnly={!isEditing}
                            maxLength={500}
                            placeholder={
                              isEditing
                                ? "e.g., Hi, thanks for calling [Business Name]! I'm [Assistant Name], how can I help you today?"
                                : ''
                            }
                          />
                          {validationErrors.greetingScript && (
                            <p className="text-sm text-red-500">
                              {validationErrors.greetingScript}
                            </p>
                          )}
                          {isEditing && (
                            <p className="text-xs text-gray-500">
                              {formData.greetingScript.length}/500 characters
                            </p>
                          )}
                        </div>

                        {!isEditing ? (
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={handleEdit}
                            type="button"
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Settings
                          </Button>
                        ) : (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              className="flex-1"
                              onClick={handleCancel}
                              type="button"
                            >
                              Cancel
                            </Button>
                            <Button
                              className="flex-1"
                              type="submit"
                              disabled={
                                Object.values(validationErrors).some(
                                  error => error
                                ) ||
                                !isFormChanged ||
                                settingsSaving
                              }
                            >
                              {settingsSaving ? 'Saving...' : 'Save Settings'}
                            </Button>
                            <AlertDialog
                              open={confirmOpen}
                              onOpenChange={setConfirmOpen}
                            >
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Confirm Save
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to save these changes
                                    to your AI Receptionist settings? This
                                    action will update your settings
                                    immediately.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel asChild>
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        handleCancel();
                                        setConfirmOpen(false);
                                      }}
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
                        )}
                      </form>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            <TabsContent value="calls" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Call History</CardTitle>
                  <CardDescription>
                    View and manage all your recent calls.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="rounded-md border">
                      <div className="p-4">
                        <div className="grid gap-1">
                          <div className="font-medium">Sarah Johnson</div>
                          <div className="text-sm text-muted-foreground">
                            <div className="flex items-center">
                              <PhoneCall className="mr-1 h-3 w-3" />
                              (555) 123-4567
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 text-sm">
                          <div className="flex items-center text-muted-foreground">
                            <Calendar className="mr-1 h-3 w-3" />
                            May 24, 2025
                          </div>
                          <div className="flex items-center text-muted-foreground">
                            <Clock className="mr-1 h-3 w-3" />
                            10:30 AM
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="text-sm font-medium">Summary:</div>
                          <div className="text-sm text-muted-foreground">
                            Sarah is interested in the 3-bedroom property on Oak
                            Street. She's a first-time homebuyer and would like
                            to schedule a viewing this weekend. Best time to
                            call back is after 5 PM.
                          </div>
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                          <Button size="sm" variant="outline">
                            <MessageSquare className="mr-1 h-3 w-3" />
                            Call Back
                          </Button>
                          <Button size="sm" variant="outline">
                            <Bell className="mr-1 h-3 w-3" />
                            Remind
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-md border">
                      <div className="p-4">
                        <div className="grid gap-1">
                          <div className="font-medium">Michael Rodriguez</div>
                          <div className="text-sm text-muted-foreground">
                            <div className="flex items-center">
                              <PhoneCall className="mr-1 h-3 w-3" />
                              (555) 987-6543
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 text-sm">
                          <div className="flex items-center text-muted-foreground">
                            <Calendar className="mr-1 h-3 w-3" />
                            May 23, 2025
                          </div>
                          <div className="flex items-center text-muted-foreground">
                            <Clock className="mr-1 h-3 w-3" />
                            2:15 PM
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="text-sm font-medium">Summary:</div>
                          <div className="text-sm text-muted-foreground">
                            Michael is looking to sell his condo in downtown.
                            He's relocating for work and needs to sell within
                            the next 2 months. He'd like to discuss valuation
                            and listing strategy. Available anytime tomorrow.
                          </div>
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                          <Button size="sm" variant="outline">
                            <MessageSquare className="mr-1 h-3 w-3" />
                            Call Back
                          </Button>
                          <Button size="sm" variant="outline">
                            <Bell className="mr-1 h-3 w-3" />
                            Remind
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ProtectedRoute>
  );
}

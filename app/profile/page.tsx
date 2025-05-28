'use client';

import { useState, useEffect } from 'react';
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

export default function ProfilePage() {
  const { user } = useAuth();
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
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Update form data when profile data is loaded
  useEffect(() => {
    if (dataLoaded) {
      const profileData = getProfileFormData();
      setFormData(profileData);
    }
  }, [dataLoaded, getProfileFormData]);

  // Handle form field changes
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear validation error for this field when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
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

    if (!formData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.assistantName.trim()) {
      errors.assistantName = 'Assistant name is required';
    }

    // Optional field validations
    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      errors.website = 'Website must start with http:// or https://';
    }

    if (formData.phone && !/^[\+]?[1-9][\d]{0,15}$/.test(formData.phone.replace(/[\s\-\(\)]/g, ''))) {
      errors.phone = 'Please enter a valid phone number';
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
      await Promise.all(updatePromises);

      // Show success toast after all updates complete
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated.',
      });
    } catch (error) {
      // Show error toast to inform users of failures
      toast({
        title: 'Update Failed',
        description: 'Failed to update your profile. Please try again.',
        variant: 'destructive',
      });
      console.error('Failed to save profile:', error);
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
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading profile...</p>
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
                    src={profile?.avatar_url || user?.user_metadata?.avatar_url || "/placeholder.svg?height=80&width=80&query=person"}
                    alt="Profile picture"
                  />
                  <AvatarFallback className="text-lg">{getUserInitials()}</AvatarFallback>
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
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      placeholder="Enter your first name"
                      className={validationErrors.firstName ? 'border-red-500' : ''}
                    />
                    {validationErrors.firstName && (
                      <p className="text-sm text-red-500">{validationErrors.firstName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input 
                      id="lastName" 
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      placeholder="Enter your last name"
                      className={validationErrors.lastName ? 'border-red-500' : ''}
                    />
                    {validationErrors.lastName && (
                      <p className="text-sm text-red-500">{validationErrors.lastName}</p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="Enter your email address"
                    className={validationErrors.email ? 'border-red-500' : ''}
                  />
                  {validationErrors.email && (
                    <p className="text-sm text-red-500">{validationErrors.email}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    type="tel" 
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="Enter your phone number"
                    className={validationErrors.phone ? 'border-red-500' : ''}
                  />
                  {validationErrors.phone && (
                    <p className="text-sm text-red-500">{validationErrors.phone}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input 
                    id="businessName" 
                    value={formData.businessName}
                    onChange={(e) => handleInputChange('businessName', e.target.value)}
                    placeholder="Enter your business name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell us about yourself and your real estate business..."
                    value={formData.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
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
                  <Label htmlFor="licenseNumber">Real Estate License Number</Label>
                  <Input 
                    id="licenseNumber" 
                    value={formData.licenseNumber}
                    onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                    placeholder="Enter your license number"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="brokerage">Brokerage</Label>
                  <Input 
                    id="brokerage" 
                    value={formData.brokerage}
                    onChange={(e) => handleInputChange('brokerage', e.target.value)}
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
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    className={validationErrors.website ? 'border-red-500' : ''}
                  />
                  {validationErrors.website && (
                    <p className="text-sm text-red-500">{validationErrors.website}</p>
                  )}
                </div>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input 
                      id="city" 
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      placeholder="Enter your city"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input 
                      id="state" 
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
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
                    onChange={(e) => handleInputChange('assistantName', e.target.value)}
                    placeholder="Enter your assistant's name"
                    className={validationErrors.assistantName ? 'border-red-500' : ''}
                  />
                  {validationErrors.assistantName && (
                    <p className="text-sm text-red-500">{validationErrors.assistantName}</p>
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
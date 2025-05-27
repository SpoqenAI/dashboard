'use client';

import { Suspense, useState } from 'react';
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
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DashboardHeader } from '@/components/dashboard-header';
import { DashboardShell } from '@/components/dashboard-shell';
import { Camera, Bell, Shield, User } from 'lucide-react';

function SettingsContent() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') || 'profile';
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      
      // Extract form values
      const firstName = formData.get('first-name') as string;
      const lastName = formData.get('last-name') as string;
      const email = formData.get('email') as string;
      const phone = formData.get('phone') as string;
      const website = formData.get('website') as string;
      const newPassword = formData.get('new-password') as string;
      const confirmPassword = formData.get('confirm-password') as string;

      // Validation
      const errors: string[] = [];

      if (!firstName?.trim()) {
        errors.push('First name is required');
      }
      if (!lastName?.trim()) {
        errors.push('Last name is required');
      }
      if (!email?.trim()) {
        errors.push('Email is required');
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('Please enter a valid email address');
      }

      // Website validation (if provided)
      if (website && website.trim() && !/^https?:\/\/.+/.test(website)) {
        errors.push('Website must be a valid URL starting with http:// or https://');
      }

      // Password validation (if changing password)
      if (newPassword || confirmPassword) {
        if (!newPassword) {
          errors.push('New password is required when changing password');
        } else if (newPassword.length < 8) {
          errors.push('New password must be at least 8 characters long');
        } else if (newPassword !== confirmPassword) {
          errors.push('New password and confirmation do not match');
        }
      }

      if (errors.length > 0) {
        alert('Please fix the following errors:\n\n' + errors.join('\n'));
        return;
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Here you would typically make an API call to save the data
      const formDataObject = Object.fromEntries(formData);
      console.log('Form data:', formDataObject);
      
      // Show success message
      alert('Settings saved successfully!');
      
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
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
                    <Label htmlFor="first-name">First Name</Label>
                    <Input id="first-name" name="first-name" defaultValue="James" required />
                  </div>
                <div className="space-y-2">
                    <Label htmlFor="last-name">Last Name</Label>
                    <Input id="last-name" name="last-name" defaultValue="Carter" required />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue="james@realestate.com"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" name="phone" type="tel" defaultValue="(555) 123-4567" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="business-name">Business Name</Label>
                  <Input id="business-name" name="business-name" defaultValue="Carter Real Estate" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    placeholder="Tell us about yourself and your real estate business..."
                    defaultValue="Experienced real estate agent specializing in residential properties."
                    rows={3}
                  />
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
                  <Switch id="email-notifications" name="email-notifications" defaultChecked />
                </div>



                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="marketing-emails">Marketing Emails</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive updates about new features and tips
                    </p>
                  </div>
                  <Switch id="marketing-emails" name="marketing-emails" defaultChecked />
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
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input id="current-password" name="current-password" type="password" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input id="new-password" name="new-password" type="password" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input id="confirm-password" name="confirm-password" type="password" />
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
                  <Label htmlFor="license-number">License Number</Label>
                  <Input id="license-number" name="license-number" defaultValue="RE123456789" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="brokerage">Brokerage</Label>
                  <Input id="brokerage" name="brokerage" defaultValue="Premier Realty Group" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    name="website"
                    type="url"
                    placeholder="https://your-website.com"
                    defaultValue="https://jamescarter-realestate.com"
                  />
                </div>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" name="city" defaultValue="San Francisco" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input id="state" name="state" defaultValue="California" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save Changes */}
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
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

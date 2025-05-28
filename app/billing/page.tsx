'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DashboardHeader } from '@/components/dashboard-header';
import { DashboardShell } from '@/components/dashboard-shell';
import { 
  CreditCard, 
  Download, 
  Calendar, 
  DollarSign,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function BillingPage() {
  // State for notification settings
  const [notifications, setNotifications] = useState({
    paymentConfirmations: true,
    billingReminders: true,
    failedPaymentAlerts: true,
  });

  // State for modal visibility
  const [showPlanChangeModal, setShowPlanChangeModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [downloadingInvoices, setDownloadingInvoices] = useState<Set<string>>(new Set());

  // Load notification preferences from local storage on component mount
  useEffect(() => {
    const loadNotificationPreferences = () => {
      try {
        const savedPreferences = localStorage.getItem('billingNotificationPreferences');
        if (savedPreferences) {
          const parsedPreferences = JSON.parse(savedPreferences);
          setNotifications(parsedPreferences);
        }
      } catch (error) {
        console.error('Failed to load notification preferences:', error);
      }
    };

    loadNotificationPreferences();
  }, []);

  // Function to save preferences to local storage and API
  const saveNotificationPreferences = async (newPreferences: typeof notifications) => {
    try {
      // Save to local storage
      localStorage.setItem('billingNotificationPreferences', JSON.stringify(newPreferences));
      
      // TODO: Replace with actual API endpoint
      // Example API call to save preferences to backend
      /*
      const response = await fetch('/api/user/notification-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          // Add authentication headers as needed
          // 'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          billingNotifications: newPreferences
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save notification preferences to server');
      }
      */
      
      console.log('Notification preferences saved:', newPreferences);
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
      // You might want to show a toast notification or error message to the user
    }
  };

  // Handler for toggling notification settings
  const handleNotificationToggle = async (setting: keyof typeof notifications) => {
    const updatedNotifications = {
      ...notifications,
      [setting]: !notifications[setting]
    };
    
    // Update local state
    setNotifications(updatedNotifications);
    
    // Persist the updated preferences
    await saveNotificationPreferences(updatedNotifications);
  };

  // Handler for opening plan change modal
  const handleChangePlan = () => {
    setShowPlanChangeModal(true);
  };

  // Handler for initiating subscription cancellation
  const handleCancelSubscription = () => {
    setShowCancelModal(true);
  };

  // Handler for confirming plan change
  const handleConfirmPlanChange = (planType: string) => {
    // TODO: Implement actual plan change logic
    console.log(`Changing to ${planType} plan...`);
    setShowPlanChangeModal(false);
    // You would typically make an API call here
  };

  // Handler for confirming subscription cancellation
  const handleConfirmCancellation = () => {
    // TODO: Implement actual cancellation logic
    console.log('Cancelling subscription...');
    setShowCancelModal(false);
    // You would typically make an API call here
  };

  // Function to securely download invoice
  const handleInvoiceDownload = async (invoiceId: string, invoiceDate: string) => {
    // Prevent multiple downloads of the same invoice
    if (downloadingInvoices.has(invoiceId)) {
      return;
    }

    try {
      // Add invoice to downloading set
      setDownloadingInvoices(prev => new Set(prev).add(invoiceId));

      // TODO: Replace with actual API endpoint
      // Example secure API call to fetch invoice
      /*
      const response = await fetch(`/api/invoices/${invoiceId}/download`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Add authentication headers
          'Authorization': `Bearer ${token}`,
          // Add CSRF token if needed
          'X-CSRF-Token': csrfToken,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in again.');
        } else if (response.status === 403) {
          throw new Error('You do not have permission to download this invoice.');
        } else if (response.status === 404) {
          throw new Error('Invoice not found.');
        } else {
          throw new Error(`Failed to download invoice: ${response.statusText}`);
        }
      }

      // Get the blob data
      const blob = await response.blob();
      
      // Verify content type
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/pdf')) {
        throw new Error('Invalid file type received from server.');
      }
      */

      // For demo purposes, create a mock PDF blob
      const mockPdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
>>
endobj
xref
0 4
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000125 00000 n 
trailer
<<
/Size 4
/Root 1 0 R
>>
startxref
203
%%EOF`;
      
      const blob = new Blob([mockPdfContent], { type: 'application/pdf' });

      // Create temporary anchor element for download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoiceId}-${invoiceDate.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;
      
      // Ensure the link is accessible but hidden
      link.style.display = 'none';
      link.setAttribute('aria-hidden', 'true');
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      window.URL.revokeObjectURL(url);
      
      console.log(`Invoice ${invoiceId} downloaded successfully`);
      
    } catch (error) {
      console.error('Failed to download invoice:', error);
      
      // You might want to show a toast notification or error message to the user
      // For now, we'll just alert the user
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred while downloading the invoice.';
      alert(`Download failed: ${errorMessage}`);
      
    } finally {
      // Remove invoice from downloading set
      setDownloadingInvoices(prev => {
        const newSet = new Set(prev);
        newSet.delete(invoiceId);
        return newSet;
      });
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <DashboardShell>
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Billing & Subscription</h2>
        </div>
        
        <div className="grid gap-6">
          {/* Current Plan */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Current Plan
              </CardTitle>
              <CardDescription>
                Manage your subscription and view plan details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">Professional Plan</h3>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Active
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold">$49<span className="text-sm font-normal text-muted-foreground">/month</span></p>
                  <p className="text-sm text-muted-foreground">
                    Next billing date: June 1, 2025
                  </p>
                </div>
                <div className="text-right space-y-2">
                  <Button variant="outline" size="sm" onClick={handleChangePlan}>
                    Change Plan
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={handleCancelSubscription}>
                    Cancel Subscription
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Plan Features</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Unlimited AI call answering
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Customizable greeting and questions
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Instant email summaries
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Basic analytics and reporting
                    </li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Usage This Month</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Calls handled:</span>
                      <span className="font-medium">247</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Minutes used:</span>
                      <span className="font-medium">1,234</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Emails sent:</span>
                      <span className="font-medium">247</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Method
              </CardTitle>
              <CardDescription>
                Manage your payment information and billing details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-slate-900 p-2">
                    <CreditCard className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">•••• •••• •••• 4242</p>
                    <p className="text-sm text-muted-foreground">Expires 12/2025</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Update
                </Button>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Billing Address</h4>
                <div className="text-sm text-muted-foreground">
                  <p>James Carter</p>
                  <p>123 Real Estate Ave</p>
                  <p>San Francisco, CA 94102</p>
                  <p>United States</p>
                </div>
                <Button variant="outline" size="sm">
                  Update Billing Address
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Billing History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Billing History
              </CardTitle>
              <CardDescription>
                View and download your past invoices.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { date: 'May 01, 2025', amount: '$49.00', status: 'Paid', invoice: 'INV-2025-05-001' },
                  { date: 'Apr 01, 2025', amount: '$49.00', status: 'Paid', invoice: 'INV-2025-04-001' },
                  { date: 'Mar 01, 2025', amount: '$49.00', status: 'Paid', invoice: 'INV-2025-03-001' },
                  { date: 'Feb 01, 2025', amount: '$49.00', status: 'Paid', invoice: 'INV-2025-02-001' },
                ].map((invoice, index) => (
                  <div key={index} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{invoice.date}</p>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          {invoice.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Professional Plan - Monthly • {invoice.invoice}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-semibold">{invoice.amount}</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleInvoiceDownload(invoice.invoice, invoice.date)}
                        disabled={downloadingInvoices.has(invoice.invoice)}
                        aria-label={`Download invoice ${invoice.invoice} for ${invoice.date}`}
                        aria-describedby={`invoice-${index}-description`}
                      >
                        <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                        {downloadingInvoices.has(invoice.invoice) ? 'Downloading...' : 'Download'}
                      </Button>
                    </div>
                    <div id={`invoice-${index}-description`} className="sr-only">
                      Invoice {invoice.invoice} for Professional Plan dated {invoice.date}, amount {invoice.amount}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Billing Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Billing Notifications
              </CardTitle>
              <CardDescription>
                Configure how you receive billing-related notifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Payment confirmations</p>
                    <p className="text-sm text-muted-foreground">
                      Get notified when payments are processed
                    </p>
                  </div>
                  <Switch
                    checked={notifications.paymentConfirmations}
                    onCheckedChange={() => handleNotificationToggle('paymentConfirmations')}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Billing reminders</p>
                    <p className="text-sm text-muted-foreground">
                      Receive reminders before your next billing date
                    </p>
                  </div>
                  <Switch
                    checked={notifications.billingReminders}
                    onCheckedChange={() => handleNotificationToggle('billingReminders')}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Failed payment alerts</p>
                    <p className="text-sm text-muted-foreground">
                      Get notified immediately if a payment fails
                    </p>
                  </div>
                  <Switch
                    checked={notifications.failedPaymentAlerts}
                    onCheckedChange={() => handleNotificationToggle('failedPaymentAlerts')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardShell>

      {/* Plan Change Modal */}
      <Dialog open={showPlanChangeModal} onOpenChange={setShowPlanChangeModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Change Plan</DialogTitle>
            <DialogDescription>
              Choose a new plan for your subscription. You are currently on the Professional Plan.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Basic Plan</h4>
                    <p className="text-sm text-muted-foreground">$29/month</p>
                    <p className="text-xs text-muted-foreground">Limited features</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleConfirmPlanChange('basic')}
                  >
                    Select
                  </Button>
                </div>
              </div>
              <div className="rounded-lg border p-4 bg-muted">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold flex items-center gap-2">
                    Professional Plan
                    <Badge variant="secondary">Current</Badge>
                  </h4>
                    <p className="text-sm text-muted-foreground">$49/month</p>
                    <p className="text-xs text-muted-foreground">Full features</p>
                  </div>
                  <Button variant="outline" size="sm" disabled>
                    Current
                  </Button>
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Enterprise Plan</h4>
                    <p className="text-sm text-muted-foreground">$99/month</p>
                    <p className="text-xs text-muted-foreground">Advanced features</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleConfirmPlanChange('enterprise')}
                  >
                    Select
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPlanChangeModal(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Subscription Modal */}
      <AlertDialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your subscription? This action cannot be undone and you will lose access to all premium features at the end of your current billing period.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmCancellation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancel Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 
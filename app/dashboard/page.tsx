'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
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

export default function DashboardPage() {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    aiAssistantName: 'Ava',
    yourName: 'James Carter',
    greetingScript: "Hi, thanks for calling James Carter's office! I'm Ava, his assistant. How can I help you today?",
    email: 'james@realestate.com',
  });

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    // Here you would typically save to backend/database
    setIsEditing(false);
    // You could add a toast notification here
    console.log('Settings saved:', formData);
  };

  const handleCancel = () => {
    // Reset form data to original values if needed
    setIsEditing(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
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
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
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
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="font-medium">AI Assistant Name</label>
                      <input
                        type="text"
                        className={`w-full rounded-md border p-2 ${!isEditing ? 'bg-muted' : 'bg-background'}`}
                        value={formData.aiAssistantName}
                        onChange={(e) => handleInputChange('aiAssistantName', e.target.value)}
                        readOnly={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="font-medium">Your Name</label>
                      <input
                        type="text"
                        className={`w-full rounded-md border p-2 ${!isEditing ? 'bg-muted' : 'bg-background'}`}
                        value={formData.yourName}
                        onChange={(e) => handleInputChange('yourName', e.target.value)}
                        readOnly={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="font-medium">Greeting Script</label>
                      <textarea
                        className={`w-full rounded-md border p-2 resize-none ${!isEditing ? 'bg-muted' : 'bg-background'}`}
                        rows={3}
                        value={formData.greetingScript}
                        onChange={(e) => handleInputChange('greetingScript', e.target.value)}
                        readOnly={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="font-medium">Email for Summaries</label>
                      <input
                        type="email"
                        className={`w-full rounded-md border p-2 ${!isEditing ? 'bg-muted' : 'bg-background'}`}
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        readOnly={!isEditing}
                      />
                    </div>
                    {!isEditing ? (
                      <Button variant="outline" className="w-full" onClick={handleEdit}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Settings
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={handleCancel}>
                          Cancel
                        </Button>
                        <Button className="flex-1" onClick={handleSave}>
                          Save Settings
                        </Button>
                      </div>
                    )}
                  </div>
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
                          Street. She's a first-time homebuyer and would like to
                          schedule a viewing this weekend. Best time to call
                          back is after 5 PM.
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
                          Michael is looking to sell his condo in downtown. He's
                          relocating for work and needs to sell within the next
                          2 months. He'd like to discuss valuation and listing
                          strategy. Available anytime tomorrow.
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
  );
}

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
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <div className="flex items-center space-x-2">
            <Button>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </div>
        </div>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="calls">Calls</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4">
            <StatsCards />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4">
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
              <Card className="col-span-3">
                <CardHeader>
                  <CardTitle>Your AI Receptionist</CardTitle>
                  <CardDescription>
                    Customize how your AI assistant interacts with callers.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">Greeting</div>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="rounded-md bg-muted p-3 text-sm">
                        "Hi, thanks for calling James Carter's office! I'm Ava,
                        his assistant. How can I help you today?"
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">
                          Qualification Questions
                        </div>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <div className="rounded-md bg-muted p-2 text-sm">
                          1. Are you looking to buy, sell, or ask about a
                          property?
                        </div>
                        <div className="rounded-md bg-muted p-2 text-sm">
                          2. What's your name and the best number to reach you?
                        </div>
                        <div className="rounded-md bg-muted p-2 text-sm">
                          3. When would be the best time for James to call you
                          back?
                        </div>
                      </div>
                    </div>
                    <Button className="w-full">Update Settings</Button>
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
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>AI Receptionist Settings</CardTitle>
                <CardDescription>
                  Customize how your AI assistant interacts with callers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="font-medium">AI Assistant Name</label>
                  <input
                    type="text"
                    className="w-full rounded-md border p-2"
                    defaultValue="Ava"
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-medium">Your Name</label>
                  <input
                    type="text"
                    className="w-full rounded-md border p-2"
                    defaultValue="James Carter"
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-medium">Greeting Script</label>
                  <textarea
                    className="w-full rounded-md border p-2"
                    rows={3}
                    defaultValue="Hi, thanks for calling James Carter's office! I'm Ava, his assistant. How can I help you today?"
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-medium">Qualification Questions</label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        className="w-full rounded-md border p-2"
                        defaultValue="Are you looking to buy, sell, or ask about a property?"
                      />
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        className="w-full rounded-md border p-2"
                        defaultValue="What's your name and the best number to reach you?"
                      />
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        className="w-full rounded-md border p-2"
                        defaultValue="When would be the best time for James to call you back?"
                      />
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="mt-2">
                    + Add Question
                  </Button>
                </div>
                <div className="space-y-2">
                  <label className="font-medium">Email for Summaries</label>
                  <input
                    type="email"
                    className="w-full rounded-md border p-2"
                    defaultValue="james@realestate.com"
                  />
                </div>
                <Button className="w-full">Save Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

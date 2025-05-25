"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { getProfile, updateProfile } from "@/actions/profile"
import { getAISettings, updateAISettings } from "@/actions/ai-settings"
import { getQuestions, updateQuestion, addQuestion, deleteQuestion } from "@/actions/questions"
import { toast } from "@/components/ui/use-toast"

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const tab = searchParams.get("tab")

  const [profile, setProfile] = useState<any>(null)
  const [settings, setSettings] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [newQuestion, setNewQuestion] = useState("")
  const [editingQuestions, setEditingQuestions] = useState<Record<string, string>>({})

  useEffect(() => {
    async function loadData() {
      const profileResult = await getProfile()
      if (profileResult.profile) {
        setProfile(profileResult.profile)
      }

      const settingsResult = await getAISettings()
      if (settingsResult.settings) {
        setSettings(settingsResult.settings)
      }

      const questionsResult = await getQuestions()
      if (questionsResult.questions) {
        setQuestions(questionsResult.questions)

        // Initialize editing state
        const initialEditState: Record<string, string> = {}
        questionsResult.questions.forEach((q) => {
          initialEditState[q.id] = q.question_text
        })
        setEditingQuestions(initialEditState)
      }
    }

    loadData()
  }, [])

  async function handleProfileUpdate(formData: FormData) {
    setIsLoading(true)

    try {
      const result = await updateProfile(formData)

      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Success",
          description: "Profile updated successfully.",
        })

        // Refresh profile data
        const profileResult = await getProfile()
        if (profileResult.profile) {
          setProfile(profileResult.profile)
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleAISettingsUpdate(formData: FormData) {
    setIsLoading(true)

    try {
      const result = await updateAISettings(formData)

      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Success",
          description: "AI settings updated successfully.",
        })

        // Refresh settings data
        const settingsResult = await getAISettings()
        if (settingsResult.settings) {
          setSettings(settingsResult.settings)
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleQuestionUpdate(id: string) {
    setIsLoading(true)

    try {
      const result = await updateQuestion(id, editingQuestions[id])

      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Success",
          description: "Question updated successfully.",
        })

        // Refresh questions data
        const questionsResult = await getQuestions()
        if (questionsResult.questions) {
          setQuestions(questionsResult.questions)

          // Update editing state
          const newEditState = { ...editingQuestions }
          questionsResult.questions.forEach((q) => {
            newEditState[q.id] = q.question_text
          })
          setEditingQuestions(newEditState)
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleAddQuestion() {
    if (!newQuestion.trim()) {
      toast({
        title: "Error",
        description: "Question text cannot be empty.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const result = await addQuestion(newQuestion)

      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Success",
          description: "Question added successfully.",
        })

        // Clear new question input
        setNewQuestion("")

        // Refresh questions data
        const questionsResult = await getQuestions()
        if (questionsResult.questions) {
          setQuestions(questionsResult.questions)

          // Update editing state
          const newEditState = { ...editingQuestions }
          questionsResult.questions.forEach((q) => {
            if (!newEditState[q.id]) {
              newEditState[q.id] = q.question_text
            }
          })
          setEditingQuestions(newEditState)
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDeleteQuestion(id: string) {
    setIsLoading(true)

    try {
      const result = await deleteQuestion(id)

      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Success",
          description: "Question deleted successfully.",
        })

        // Refresh questions data
        const questionsResult = await getQuestions()
        if (questionsResult.questions) {
          setQuestions(questionsResult.questions)

          // Update editing state
          const newEditState = { ...editingQuestions }
          delete newEditState[id]
          setEditingQuestions(newEditState)
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <DashboardShell>
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        </div>
        <Tabs defaultValue={tab || "profile"} className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="ai-settings">AI Settings</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>
          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Manage your personal information and preferences.</CardDescription>
              </CardHeader>
              <form action={handleProfileUpdate}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" name="name" defaultValue={profile?.full_name || ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" defaultValue={profile?.email || ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" name="phone" type="tel" defaultValue={profile?.phone_number || ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business-name">Business Name (Optional)</Label>
                    <Input id="business-name" name="business-name" defaultValue={profile?.business_name || ""} />
                  </div>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Saving..." : "Save Changes"}
                  </Button>
                </CardContent>
              </form>
            </Card>
          </TabsContent>
          <TabsContent value="ai-settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>AI Assistant Settings</CardTitle>
                <CardDescription>Customize how your AI receptionist interacts with callers.</CardDescription>
              </CardHeader>
              <form action={handleAISettingsUpdate}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="ai-name">AI Assistant Name</Label>
                    <Input id="ai-name" name="ai-name" defaultValue={settings?.ai_name || "Ava"} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="greeting">Greeting Script</Label>
                    <Textarea id="greeting" name="greeting" defaultValue={settings?.greeting_script || ""} rows={4} />
                  </div>
                  <Separator className="my-4" />
                  <div>
                    <h3 className="text-lg font-medium mb-2">Qualification Questions</h3>
                    <div className="space-y-4">
                      {questions && questions.length > 0 ? (
                        questions.map((question, index) => (
                          <div key={question.id} className="space-y-2">
                            <Label htmlFor={`question-${question.id}`}>Question {index + 1}</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                id={`question-${question.id}`}
                                value={editingQuestions[question.id] || ""}
                                onChange={(e) =>
                                  setEditingQuestions({
                                    ...editingQuestions,
                                    [question.id]: e.target.value,
                                  })
                                }
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuestionUpdate(question.id)}
                                disabled={isLoading}
                              >
                                Update
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteQuestion(question.id)}
                                disabled={isLoading}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-muted-foreground">No questions configured yet.</div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="new-question">Add New Question</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="new-question"
                            value={newQuestion}
                            onChange={(e) => setNewQuestion(e.target.value)}
                            placeholder="Enter a new qualification question"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAddQuestion}
                            disabled={isLoading}
                          >
                            Add
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <div className="space-y-2">
                    <Label htmlFor="summary-email">Email for Summaries</Label>
                    <Input
                      id="summary-email"
                      name="summary-email"
                      type="email"
                      defaultValue={settings?.summary_email || ""}
                    />
                  </div>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Saving..." : "Save AI Settings"}
                  </Button>
                </CardContent>
              </form>
            </Card>
          </TabsContent>
          <TabsContent value="billing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Subscription Plan</CardTitle>
                <CardDescription>Manage your subscription and billing information.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-md border p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">Professional Plan</h3>
                      <p className="text-sm text-muted-foreground">$49/month</p>
                    </div>
                    <div className="bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded-full">Active</div>
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
                    <Button variant="outline" size="sm" className="text-destructive">
                      Cancel Subscription
                    </Button>
                  </div>
                </div>
                <Separator className="my-4" />
                <div>
                  <h3 className="text-lg font-medium mb-4">Payment Method</h3>
                  <div className="rounded-md border p-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="bg-muted rounded-md p-2">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect width="24" height="24" rx="4" fill="#0A2540" />
                          <path
                            d="M14 9.5V11.5H16V9.5H14ZM14 13.5V15.5H16V13.5H14ZM10 9.5V11.5H12V9.5H10ZM10 13.5V15.5H12V13.5H10ZM6 9.5V11.5H8V9.5H6ZM6 13.5V15.5H8V13.5H6Z"
                            fill="white"
                          />
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium">•••• •••• •••• 4242</div>
                        <div className="text-xs text-muted-foreground">Expires 12/2025</div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                  </div>
                </div>
                <Separator className="my-4" />
                <div>
                  <h3 className="text-lg font-medium mb-4">Billing History</h3>
                  <div className="rounded-md border">
                    <div className="p-4 flex justify-between items-center border-b">
                      <div>
                        <div className="font-medium">May 01, 2025</div>
                        <div className="text-xs text-muted-foreground">Professional Plan - Monthly</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">$49.00</div>
                        <div className="text-xs text-green-600">Paid</div>
                      </div>
                    </div>
                    <div className="p-4 flex justify-between items-center border-b">
                      <div>
                        <div className="font-medium">Apr 01, 2025</div>
                        <div className="text-xs text-muted-foreground">Professional Plan - Monthly</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">$49.00</div>
                        <div className="text-xs text-green-600">Paid</div>
                      </div>
                    </div>
                    <div className="p-4 flex justify-between items-center">
                      <div>
                        <div className="font-medium">Mar 01, 2025</div>
                        <div className="text-xs text-muted-foreground">Professional Plan - Monthly</div>
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
  )
}

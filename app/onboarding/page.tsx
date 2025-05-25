"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PhoneCall, ArrowRight, ArrowLeft, Check } from "lucide-react"
import { updateProfile } from "@/actions/profile"
import { updateAISettings } from "@/actions/ai-settings"
import { getProfile } from "@/actions/profile"
import { getAISettings } from "@/actions/ai-settings"
import { getQuestions, updateQuestion, addQuestion } from "@/actions/questions"
import { toast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { createClientSupabaseClient } from "@/lib/supabase/client"

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const totalSteps = 4
  const router = useRouter()

  const [profile, setProfile] = useState<any>(null)
  const [settings, setSettings] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    agentName: "",
    businessName: "",
    phoneNumber: "",
    aiName: "Ava",
    greeting: "",
    questions: ["", "", ""],
    summaryEmail: "",
  })

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClientSupabaseClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push("/login")
        return
      }

      // Load user data
      const profileResult = await getProfile()
      if (profileResult.profile) {
        setProfile(profileResult.profile)
        setFormData((prev) => ({
          ...prev,
          agentName: profileResult.profile.full_name || "",
          businessName: profileResult.profile.business_name || "",
          phoneNumber: profileResult.profile.phone_number || "",
        }))
      }

      const settingsResult = await getAISettings()
      if (settingsResult.settings) {
        setSettings(settingsResult.settings)
        setFormData((prev) => ({
          ...prev,
          aiName: settingsResult.settings.ai_name || "Ava",
          greeting: settingsResult.settings.greeting_script || "",
          summaryEmail: settingsResult.settings.summary_email || "",
        }))
      }

      const questionsResult = await getQuestions()
      if (questionsResult.questions) {
        setQuestions(questionsResult.questions)

        // Update form data with questions
        const questionTexts = questionsResult.questions.map((q) => q.question_text)
        setFormData((prev) => ({
          ...prev,
          questions: [questionTexts[0] || "", questionTexts[1] || "", questionTexts[2] || ""],
        }))
      }
    }

    checkAuth()
  }, [router])

  const nextStep = () => {
    if (step < totalSteps) {
      setStep(step + 1)
    }
  }

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleQuestionChange = (index: number, value: string) => {
    const newQuestions = [...formData.questions]
    newQuestions[index] = value
    setFormData((prev) => ({
      ...prev,
      questions: newQuestions,
    }))
  }

  const handleStep1Submit = async () => {
    if (!formData.agentName || !formData.phoneNumber) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Create form data for profile update
      const profileFormData = new FormData()
      profileFormData.append("name", formData.agentName)
      profileFormData.append("business-name", formData.businessName)
      profileFormData.append("phone", formData.phoneNumber)
      profileFormData.append("email", profile?.email || "")

      const result = await updateProfile(profileFormData)

      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
        return
      }

      // Update greeting with agent name
      setFormData((prev) => ({
        ...prev,
        greeting: `Hi, thanks for calling ${formData.agentName}'s office! I'm ${formData.aiName}, the assistant. How can I help you today?`,
      }))

      nextStep()
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

  const handleStep2Submit = async () => {
    if (!formData.aiName || !formData.greeting) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Create form data for AI settings update
      const settingsFormData = new FormData()
      settingsFormData.append("ai-name", formData.aiName)
      settingsFormData.append("greeting", formData.greeting)
      settingsFormData.append("summary-email", formData.summaryEmail || profile?.email || "")

      const result = await updateAISettings(settingsFormData)

      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
        return
      }

      nextStep()
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

  const handleStep3Submit = async () => {
    if (!formData.questions[0] || !formData.questions[1] || !formData.questions[2]) {
      toast({
        title: "Error",
        description: "Please fill in all three questions.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Update or add questions
      for (let i = 0; i < 3; i++) {
        if (questions[i]) {
          // Update existing question
          await updateQuestion(questions[i].id, formData.questions[i])
        } else {
          // Add new question
          await addQuestion(formData.questions[i])
        }
      }

      nextStep()
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

  const handleCompleteSetup = async () => {
    if (!formData.summaryEmail) {
      toast({
        title: "Error",
        description: "Please enter an email for summaries.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Update summary email
      const settingsFormData = new FormData()
      settingsFormData.append("ai-name", formData.aiName)
      settingsFormData.append("greeting", formData.greeting)
      settingsFormData.append("summary-email", formData.summaryEmail)

      const result = await updateAISettings(settingsFormData)

      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Success",
        description: "Onboarding completed successfully!",
      })

      // Redirect to dashboard
      router.push("/dashboard")
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
      <header className="sticky top-0 z-10 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl">
            <PhoneCall className="h-5 w-5 text-primary" />
            <Link href="/">Spoqen</Link>
          </div>
          <div className="text-sm text-muted-foreground">
            Step {step} of {totalSteps}
          </div>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle>Welcome to Spoqen!</CardTitle>
                <CardDescription>Let's set up your AI receptionist. First, tell us about yourself.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="agent-name">Your Name</Label>
                  <Input
                    id="agent-name"
                    name="agentName"
                    value={formData.agentName}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business-name">Business Name (Optional)</Label>
                  <Input
                    id="business-name"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleInputChange}
                    placeholder="Enter your business name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone-number">Business Phone Number</Label>
                  <Input
                    id="phone-number"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    type="tel"
                    placeholder="Enter the phone number to forward"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <div></div>
                <Button onClick={handleStep1Submit} disabled={isLoading}>
                  {isLoading ? "Saving..." : "Continue"} {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </CardFooter>
            </>
          )}

          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle>Customize Your AI Assistant</CardTitle>
                <CardDescription>Personalize how your AI receptionist interacts with callers.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ai-name">AI Assistant Name</Label>
                  <Input
                    id="ai-name"
                    name="aiName"
                    value={formData.aiName}
                    onChange={handleInputChange}
                    placeholder="Enter a name for your AI assistant"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="greeting">Greeting Script</Label>
                  <Textarea
                    id="greeting"
                    name="greeting"
                    value={formData.greeting}
                    onChange={handleInputChange}
                    placeholder="Enter the greeting your AI will use"
                    rows={4}
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  Tip: Use [Your Name] and [AI Name] as placeholders that will be automatically replaced.
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={prevStep} disabled={isLoading}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button onClick={handleStep2Submit} disabled={isLoading}>
                  {isLoading ? "Saving..." : "Continue"} {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </CardFooter>
            </>
          )}

          {step === 3 && (
            <>
              <CardHeader>
                <CardTitle>Lead Qualification Questions</CardTitle>
                <CardDescription>Set up questions your AI will ask to qualify leads.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="question-1">Question 1</Label>
                  <Input
                    id="question-1"
                    value={formData.questions[0]}
                    onChange={(e) => handleQuestionChange(0, e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="question-2">Question 2</Label>
                  <Input
                    id="question-2"
                    value={formData.questions[1]}
                    onChange={(e) => handleQuestionChange(1, e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="question-3">Question 3</Label>
                  <Input
                    id="question-3"
                    value={formData.questions[2]}
                    onChange={(e) => handleQuestionChange(2, e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={prevStep} disabled={isLoading}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button onClick={handleStep3Submit} disabled={isLoading}>
                  {isLoading ? "Saving..." : "Continue"} {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </CardFooter>
            </>
          )}

          {step === 4 && (
            <>
              <CardHeader>
                <CardTitle>Almost Done!</CardTitle>
                <CardDescription>Set up where you want to receive call summaries.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="summary-email">Email for Summaries</Label>
                  <Input
                    id="summary-email"
                    name="summaryEmail"
                    value={formData.summaryEmail}
                    onChange={handleInputChange}
                    type="email"
                    placeholder="Enter your email"
                  />
                </div>
                <div className="rounded-md bg-muted p-4">
                  <h3 className="font-medium mb-2">Here's what happens next:</h3>
                  <ol className="space-y-2 text-sm text-muted-foreground list-decimal pl-4">
                    <li>Forward your business calls to the Spoqen number we'll provide</li>
                    <li>When you're unavailable, your AI assistant will answer</li>
                    <li>You'll receive detailed call summaries via email</li>
                    <li>Follow up with leads when you're available</li>
                  </ol>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={prevStep} disabled={isLoading}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button onClick={handleCompleteSetup} disabled={isLoading}>
                  {isLoading ? "Completing..." : "Complete Setup"} {!isLoading && <Check className="ml-2 h-4 w-4" />}
                </Button>
              </CardFooter>
            </>
          )}
        </Card>
      </main>
    </div>
  )
}

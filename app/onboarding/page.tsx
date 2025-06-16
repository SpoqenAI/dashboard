'use client';

import { useState } from 'react';
import Link from 'next/link';
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
import { Textarea } from '@/components/ui/textarea';
import { ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { Logo } from '@/components/ui/logo';

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const nextStep = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/">
              <Logo width={120} height={36} />
            </Link>
          </div>
          <div className="text-sm text-muted-foreground">
            Step {step} of {totalSteps}
          </div>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle>Welcome to Spoqen!</CardTitle>
                <CardDescription>
                  Let's set up your AI receptionist. First, tell us about
                  yourself.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="agent-name">Your Name</Label>
                  <Input id="agent-name" placeholder="Enter your full name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business-name">
                    Business Name (Optional)
                  </Label>
                  <Input
                    id="business-name"
                    placeholder="Enter your business name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone-number">Business Phone Number</Label>
                  <Input
                    id="phone-number"
                    type="tel"
                    placeholder="Enter the phone number to forward"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <div></div>
                <Button onClick={nextStep}>
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </>
          )}

          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle>Customize Your AI Assistant</CardTitle>
                <CardDescription>
                  Personalize how your AI receptionist interacts with callers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ai-name">AI Assistant Name</Label>
                  <Input
                    id="ai-name"
                    placeholder="Enter a name for your AI assistant"
                    defaultValue="Ava"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="greeting">Greeting Script</Label>
                  <Textarea
                    id="greeting"
                    placeholder="Enter the greeting your AI will use"
                    defaultValue={`Hi, thanks for calling [Your Name]'s office! I'm [AI Name], the assistant. How can I help you today?`}
                    rows={4}
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  Tip: Use [Your Name] and [AI Name] as placeholders that will
                  be automatically replaced.
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={prevStep}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button onClick={nextStep}>
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </>
          )}

          {step === 3 && (
            <>
              <CardHeader>
                <CardTitle>Lead Qualification Questions</CardTitle>
                <CardDescription>
                  Set up questions your AI will ask to qualify leads.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="question-1">Question 1</Label>
                  <Input
                    id="question-1"
                    defaultValue="Are you looking to buy, sell, or ask about a property?"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="question-2">Question 2</Label>
                  <Input
                    id="question-2"
                    defaultValue="What's your name and the best number to reach you?"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="question-3">Question 3</Label>
                  <Input
                    id="question-3"
                    defaultValue="When would be the best time for me to call you back?"
                  />
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  + Add Another Question
                </Button>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={prevStep}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button onClick={nextStep}>
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </>
          )}

          {step === 4 && (
            <>
              <CardHeader>
                <CardTitle>Almost Done!</CardTitle>
                <CardDescription>
                  Set up where you want to receive call summaries.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email for Summaries</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                  />
                </div>
                <div className="rounded-md bg-muted p-4">
                  <h3 className="mb-2 font-medium">
                    Here's what happens next:
                  </h3>
                  <ol className="list-decimal space-y-2 pl-4 text-sm text-muted-foreground">
                    <li>
                      Forward your business calls to the Spoqen number we'll
                      provide
                    </li>
                    <li>
                      When you're unavailable, your AI assistant will answer
                    </li>
                    <li>You'll receive detailed call summaries via email</li>
                    <li>Follow up with leads when you're available</li>
                  </ol>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={prevStep}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button>
                  Complete Setup <Check className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </>
          )}
        </Card>
      </main>
    </div>
  );
}

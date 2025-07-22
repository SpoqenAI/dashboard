'use client';

import { useState, useEffect, useCallback, memo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Phone,
  MessageSquare,
  User,
  Building,
  DollarSign,
  Calendar,
  Zap,
  CheckCircle,
  ArrowRight,
  Play,
  Pause,
} from 'lucide-react';

interface ConversationStep {
  id: number;
  speaker: 'ai' | 'caller';
  message: string;
  analysis?: {
    sentiment: 'positive' | 'neutral' | 'negative';
    leadQuality: 'high' | 'medium' | 'low';
    intent: string;
  };
  data?: {
    name?: string;
    company?: string;
    budget?: string;
    timeline?: string;
    phone?: string;
    email?: string;
  };
}

interface LeadData {
  name?: string;
  company?: string;
  budget?: string;
  timeline?: string;
  phone?: string;
  email?: string;
}

interface AnalysisData {
  sentiment?: 'positive' | 'neutral' | 'negative';
  leadQuality?: 'high' | 'medium' | 'low';
  intent?: string;
}

const conversationFlow: ConversationStep[] = [
  {
    id: 1,
    speaker: 'ai',
    message:
      "Hi there! Thanks for calling. I'm Sarah, your AI assistant. How can I help you today?",
    analysis: {
      sentiment: 'positive',
      leadQuality: 'medium',
      intent: 'greeting',
    },
  },
  {
    id: 2,
    speaker: 'caller',
    message:
      "Hi, I'm Alex Chen from a startup. We're looking for help with our lead generation process.",
    analysis: {
      sentiment: 'positive',
      leadQuality: 'high',
      intent: 'business_inquiry',
    },
    data: { name: 'Alex Chen', company: 'Startup' },
  },
  {
    id: 3,
    speaker: 'ai',
    message:
      "Great to meet you Alex! Lead generation is definitely something we specialize in. Can you tell me a bit more about your startup and what specific challenges you're facing?",
    analysis: {
      sentiment: 'positive',
      leadQuality: 'high',
      intent: 'qualification',
    },
  },
  {
    id: 4,
    speaker: 'caller',
    message:
      "We're a SaaS company in the crypto space. We're getting traffic but struggling to convert visitors into qualified leads. Our budget is around $5K monthly for the right solution.",
    analysis: {
      sentiment: 'positive',
      leadQuality: 'high',
      intent: 'detailed_inquiry',
    },
    data: { company: 'Crypto SaaS', budget: '$5,000/month' },
  },
  {
    id: 5,
    speaker: 'ai',
    message:
      "Perfect! SaaS companies in crypto often see great results with our AI-powered lead qualification system. With a $5K budget, we can definitely create a comprehensive solution. What's your timeline for implementation?",
    analysis: {
      sentiment: 'positive',
      leadQuality: 'high',
      intent: 'needs_assessment',
    },
  },
  {
    id: 6,
    speaker: 'caller',
    message:
      "We'd like to get started within the next 2 weeks if possible. Can you send me some information?",
    analysis: {
      sentiment: 'positive',
      leadQuality: 'high',
      intent: 'ready_to_move',
    },
    data: {
      timeline: '2 weeks',
      phone: '+1 (555) 123-4567',
      email: 'alex@startup.com',
    },
  },
];

// PERFORMANCE: Memoized conversation message component
const ConversationMessage = memo(({ step }: { step: ConversationStep }) => (
  <div
    className={`flex ${step.speaker === 'ai' ? 'justify-start' : 'justify-end'}`}
  >
    <div
      className={`max-w-[80%] rounded-lg p-4 ${
        step.speaker === 'ai'
          ? 'border border-primary/30 bg-primary/20'
          : 'border border-accent/30 bg-accent/20'
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        {step.speaker === 'ai' ? (
          <>
            <MessageSquare className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              AI Assistant
            </span>
          </>
        ) : (
          <>
            <User className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-accent">Caller</span>
          </>
        )}
      </div>
      <p className="text-foreground">{step.message}</p>
    </div>
  </div>
));

ConversationMessage.displayName = 'ConversationMessage';

// PERFORMANCE: Memoized lead data display component
const LeadDataDisplay = memo(({ leadData }: { leadData: LeadData }) => (
  <div className="space-y-3">
    {leadData.name && (
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Name:</span>
        <span className="text-sm">{leadData.name}</span>
      </div>
    )}
    {leadData.company && (
      <div className="flex items-center gap-2">
        <Building className="h-4 w-4 text-accent" />
        <span className="text-sm font-medium">Company:</span>
        <span className="text-sm">{leadData.company}</span>
      </div>
    )}
    {leadData.budget && (
      <div className="flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-secondary" />
        <span className="text-sm font-medium">Budget:</span>
        <span className="text-sm">{leadData.budget}</span>
      </div>
    )}
    {leadData.timeline && (
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Timeline:</span>
        <span className="text-sm">{leadData.timeline}</span>
      </div>
    )}
    {leadData.phone && (
      <div className="flex items-center gap-2">
        <Phone className="h-4 w-4 text-accent" />
        <span className="text-sm font-medium">Phone:</span>
        <span className="text-sm">{leadData.phone}</span>
      </div>
    )}
    {leadData.email && (
      <div className="flex items-center gap-2">
        <span className="text-sm">📧</span>
        <span className="text-sm font-medium">Email:</span>
        <span className="text-sm">{leadData.email}</span>
      </div>
    )}
  </div>
));

LeadDataDisplay.displayName = 'LeadDataDisplay';

export const InteractiveDemo = memo(() => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [leadData, setLeadData] = useState<LeadData>({});
  const [analysisData, setAnalysisData] = useState<AnalysisData>({});

  // Observe viewport visibility to pause/play demo
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // PERFORMANCE: Memoized callbacks to prevent re-renders
  const startDemo = useCallback(() => {
    setCurrentStep(0);
    setLeadData({});
    setAnalysisData({});
    setIsPlaying(true);
  }, []);

  const pauseDemo = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const resetDemo = useCallback(() => {
    setCurrentStep(0);
    setLeadData({});
    setAnalysisData({});
    setIsPlaying(false);
  }, []);

  // PERFORMANCE: Fixed memory leak by properly cleaning up timer
  useEffect(() => {
    let timerId: NodeJS.Timeout | null = null;

    if (isPlaying && isVisible && currentStep < conversationFlow.length) {
      timerId = setTimeout(() => {
        const step = conversationFlow[currentStep];

        if (step.data) {
          setLeadData((prev: LeadData) => ({ ...prev, ...step.data }));
        }

        if (step.analysis) {
          setAnalysisData(step.analysis);
        }

        setCurrentStep(currentStep + 1);
      }, 2500);
    } else if (currentStep >= conversationFlow.length) {
      setIsPlaying(false);
    }

    // CRITICAL: Clean up timer to prevent memory leaks
    return () => {
      if (timerId) {
        clearTimeout(timerId);
      }
    };
  }, [isPlaying, currentStep, isVisible]);

  return (
    <section
      ref={containerRef}
      className="w-full bg-gradient-to-b from-background to-card/30 py-20"
    >
      <div className="container px-6">
        <div className="mb-12 text-center">
          <h2 className="mb-6 text-4xl font-bold lg:text-5xl">
            Experience Spoqen
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              {' '}
              In Action
            </span>
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-xl text-muted-foreground">
            Watch how our AI handles a real conversation with a tech
            entrepreneur.
          </p>

          <div className="mb-8 flex justify-center gap-4">
            <Button
              variant="neon"
              size="lg"
              onClick={startDemo}
              disabled={isPlaying}
            >
              <Play className="mr-2 h-5 w-5" />
              Start Interactive Demo
            </Button>
            {isPlaying && (
              <Button variant="outline" size="lg" onClick={pauseDemo}>
                <Pause className="mr-2 h-5 w-5" />
                Pause
              </Button>
            )}
            <Button variant="ghost" size="lg" onClick={resetDemo}>
              Reset
            </Button>
          </div>
        </div>

        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card className="h-[600px] border border-white/10 bg-card/20 backdrop-blur-glass">
              <CardHeader className="border-b border-white/10">
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-primary" />
                  Live Conversation
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[500px] overflow-y-auto p-6">
                <div className="space-y-4">
                  {conversationFlow.slice(0, currentStep).map(step => (
                    <ConversationMessage key={step.id} step={step} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Lead Data Capture */}
            <Card className="border border-white/10 bg-card/20 backdrop-blur-glass">
              <CardHeader className="border-b border-white/10">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-accent" />
                  Lead Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {Object.keys(leadData).length > 0 ? (
                  <LeadDataDisplay leadData={leadData} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Lead data will appear as the conversation progresses...
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Real-time Analysis */}
            <Card className="border border-white/10 bg-card/20 backdrop-blur-glass">
              <CardHeader className="border-b border-white/10">
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-secondary" />
                  AI Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {analysisData.sentiment ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Sentiment:</span>
                      <Badge
                        variant={
                          analysisData.sentiment === 'positive'
                            ? 'default'
                            : analysisData.sentiment === 'neutral'
                              ? 'secondary'
                              : 'destructive'
                        }
                      >
                        {analysisData.sentiment}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Lead Quality:</span>
                      <Badge
                        variant={
                          analysisData.leadQuality === 'high'
                            ? 'default'
                            : analysisData.leadQuality === 'medium'
                              ? 'secondary'
                              : 'outline'
                        }
                      >
                        {analysisData.leadQuality}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Intent:</span>
                      <span className="text-sm capitalize">
                        {analysisData.intent
                          ? analysisData.intent.replace('_', ' ')
                          : ''}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    AI analysis will appear during the conversation...
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Action Items */}
            <Card className="border border-white/10 bg-card/20 backdrop-blur-glass">
              <CardHeader className="border-b border-white/10">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  Next Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="h-2 w-2 rounded-full bg-primary"></span>
                    <span>Send follow-up email</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="h-2 w-2 rounded-full bg-accent"></span>
                    <span>Schedule demo call</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="h-2 w-2 rounded-full bg-secondary"></span>
                    <span>Add to CRM pipeline</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-12 space-y-6 text-center">
          <h3 className="text-2xl font-bold">
            Ready to automate your lead qualification?
          </h3>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Button variant="neon" size="lg" asChild>
              <a href="/signup">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button variant="outline" size="lg">
              Schedule Live Demo
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
});

InteractiveDemo.displayName = 'InteractiveDemo';

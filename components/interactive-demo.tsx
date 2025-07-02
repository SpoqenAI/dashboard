'use client';

import { useState, useEffect, useCallback, memo } from 'react';
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
  Pause
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

const conversationFlow: ConversationStep[] = [
  {
    id: 1,
    speaker: 'ai',
    message: "Hi there! Thanks for calling TechFlow Digital. I'm Sarah, your AI assistant. How can I help you today?",
    analysis: { sentiment: 'positive', leadQuality: 'medium', intent: 'greeting' }
  },
  {
    id: 2,
    speaker: 'caller',
    message: "Hi, I'm Alex Chen from a startup. We're looking for help with our lead generation process.",
    analysis: { sentiment: 'positive', leadQuality: 'high', intent: 'business_inquiry' },
    data: { name: 'Alex Chen', company: 'Startup' }
  },
  {
    id: 3,
    speaker: 'ai',
    message: "Great to meet you Alex! Lead generation is definitely something we specialize in. Can you tell me a bit more about your startup and what specific challenges you're facing?",
    analysis: { sentiment: 'positive', leadQuality: 'high', intent: 'qualification' }
  },
  {
    id: 4,
    speaker: 'caller',
    message: "We're a SaaS company in the crypto space. We're getting traffic but struggling to convert visitors into qualified leads. Our budget is around $5K monthly for the right solution.",
    analysis: { sentiment: 'positive', leadQuality: 'high', intent: 'detailed_inquiry' },
    data: { company: 'Crypto SaaS', budget: '$5,000/month' }
  },
  {
    id: 5,
    speaker: 'ai',
    message: "Perfect! SaaS companies in crypto often see great results with our AI-powered lead qualification system. With a $5K budget, we can definitely create a comprehensive solution. What's your timeline for implementation?",
    analysis: { sentiment: 'positive', leadQuality: 'high', intent: 'needs_assessment' }
  },
  {
    id: 6,
    speaker: 'caller',
    message: "We'd like to get started within the next 2 weeks if possible. Can you send me some information?",
    analysis: { sentiment: 'positive', leadQuality: 'high', intent: 'ready_to_move' },
    data: { timeline: '2 weeks', phone: '+1 (555) 123-4567', email: 'alex@startup.com' }
  }
];

// PERFORMANCE: Memoized conversation message component
const ConversationMessage = memo(({ step }: { step: ConversationStep }) => (
  <div 
    className={`flex ${step.speaker === 'ai' ? 'justify-start' : 'justify-end'}`}
  >
    <div className={`max-w-[80%] p-4 rounded-lg ${
      step.speaker === 'ai' 
        ? 'bg-primary/20 border border-primary/30' 
        : 'bg-accent/20 border border-accent/30'
    }`}>
      <div className="flex items-center gap-2 mb-2">
        {step.speaker === 'ai' ? (
          <>
            <MessageSquare className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">AI Assistant</span>
          </>
        ) : (
          <>
            <User className="w-4 h-4 text-accent" />
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
const LeadDataDisplay = memo(({ leadData }: { leadData: any }) => (
  <div className="space-y-3">
    {leadData.name && (
      <div className="flex items-center gap-2">
        <User className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Name:</span>
        <span className="text-sm">{leadData.name}</span>
      </div>
    )}
    {leadData.company && (
      <div className="flex items-center gap-2">
        <Building className="w-4 h-4 text-accent" />
        <span className="text-sm font-medium">Company:</span>
        <span className="text-sm">{leadData.company}</span>
      </div>
    )}
    {leadData.budget && (
      <div className="flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-secondary" />
        <span className="text-sm font-medium">Budget:</span>
        <span className="text-sm">{leadData.budget}</span>
      </div>
    )}
    {leadData.timeline && (
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Timeline:</span>
        <span className="text-sm">{leadData.timeline}</span>
      </div>
    )}
    {leadData.phone && (
      <div className="flex items-center gap-2">
        <Phone className="w-4 h-4 text-accent" />
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
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [leadData, setLeadData] = useState<any>({});
  const [analysisData, setAnalysisData] = useState<any>({});

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

    if (isPlaying && currentStep < conversationFlow.length) {
      timerId = setTimeout(() => {
        const step = conversationFlow[currentStep];
        
        if (step.data) {
          setLeadData((prev: any) => ({ ...prev, ...step.data }));
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
  }, [isPlaying, currentStep]);

  return (
    <section className="w-full py-20 bg-gradient-to-b from-background to-card/30">
      <div className="container px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            Experience Spoqen
            <span className="bg-gradient-primary bg-clip-text text-transparent"> In Action</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Watch how our AI handles a real conversation with a tech entrepreneur.
          </p>
          
          <div className="flex justify-center gap-4 mb-8">
            <Button 
              variant="neon" 
              size="lg" 
              onClick={startDemo}
              disabled={isPlaying}
            >
              <Play className="w-5 h-5 mr-2" />
              Start Interactive Demo
            </Button>
            {isPlaying && (
              <Button variant="outline" size="lg" onClick={pauseDemo}>
                <Pause className="w-5 h-5 mr-2" />
                Pause
              </Button>
            )}
            <Button variant="ghost" size="lg" onClick={resetDemo}>
              Reset
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          <div className="lg:col-span-2">
            <Card className="bg-card/20 backdrop-blur-glass border border-white/10 h-[600px]">
              <CardHeader className="border-b border-white/10">
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-primary" />
                  Live Conversation
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 h-[500px] overflow-y-auto">
                <div className="space-y-4">
                  {conversationFlow.slice(0, currentStep).map((step) => (
                    <ConversationMessage key={step.id} step={step} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Lead Data Capture */}
            <Card className="bg-card/20 backdrop-blur-glass border border-white/10">
              <CardHeader className="border-b border-white/10">
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-accent" />
                  Lead Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {Object.keys(leadData).length > 0 ? (
                  <LeadDataDisplay leadData={leadData} />
                ) : (
                  <p className="text-sm text-muted-foreground">Lead data will appear as the conversation progresses...</p>
                )}
              </CardContent>
            </Card>

            {/* Real-time Analysis */}
            <Card className="bg-card/20 backdrop-blur-glass border border-white/10">
              <CardHeader className="border-b border-white/10">
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-secondary" />
                  AI Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {analysisData.sentiment ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Sentiment:</span>
                      <Badge variant={
                        analysisData.sentiment === 'positive' ? 'default' : 
                        analysisData.sentiment === 'neutral' ? 'secondary' : 'destructive'
                      }>
                        {analysisData.sentiment}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Lead Quality:</span>
                      <Badge variant={
                        analysisData.leadQuality === 'high' ? 'default' : 
                        analysisData.leadQuality === 'medium' ? 'secondary' : 'outline'
                      }>
                        {analysisData.leadQuality}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Intent:</span>
                      <span className="text-sm capitalize">{analysisData.intent.replace('_', ' ')}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">AI analysis will appear during the conversation...</p>
                )}
              </CardContent>
            </Card>

            {/* Action Items */}
            <Card className="bg-card/20 backdrop-blur-glass border border-white/10">
              <CardHeader className="border-b border-white/10">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  Next Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 bg-primary rounded-full"></span>
                    <span>Send follow-up email</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 bg-accent rounded-full"></span>
                    <span>Schedule demo call</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 bg-secondary rounded-full"></span>
                    <span>Add to CRM pipeline</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-12 space-y-6">
          <h3 className="text-2xl font-bold">Ready to automate your lead qualification?</h3>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="neon" size="lg" asChild>
              <a href="/signup">
                Start Free Trial
                <ArrowRight className="ml-2 w-4 h-4" />
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
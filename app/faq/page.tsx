import { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import {
  Phone,
  Settings,
  BarChart3,
  CreditCard,
  Cog,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import FAQSearch from './FAQSearch';

interface FaqQuestion {
  id: string;
  question: string;
  answer: string;
  popular?: boolean;
}

interface FaqCategory {
  id: string;
  name: string;
  icon: LucideIcon;
  questions: FaqQuestion[];
}

// Serializable category data for client component
interface SerializableFaqCategory {
  id: string;
  name: string;
  iconName: string;
  questions: FaqQuestion[];
}

const categories: FaqCategory[] = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    icon: Settings,
    questions: [
      {
        id: 'setup-ai-receptionist',
        question: 'How do I set up my AI receptionist?',
        answer:
          'Sign up and follow the setup wizard to connect your phone number and configure basic details. You\u2019ll be ready in minutes.',
        popular: true,
      },
      {
        id: 'setup-information-needed',
        question: 'What information do I need to provide during setup?',
        answer:
          'You\u2019ll add your business name, preferred phone number, office hours, and any CRM details you want synced.',
      },
      {
        id: 'setup-time-duration',
        question: 'How long does initial setup take?',
        answer:
          'Most users complete setup in under five minutes thanks to our streamlined onboarding process.',
      },
      {
        id: 'customize-assistant-name',
        question: "Can I customize my AI assistant's name and greeting?",
        answer:
          'Absolutely! You can change the assistant name and greeting message anytime from your dashboard.',
      },
      {
        id: 'free-trial-features',
        question: 'What happens during the free trial?',
        answer:
          'Our Free plan lets you configure your AI assistant and preview transcripts. Upgrade to start handling live calls.',
      },
      {
        id: 'connect-phone-number',
        question: 'How do I connect my phone number?',
        answer:
          'Add a forwarding number or port your existing line during setup. Spoqen works with all major carriers.',
        popular: true,
      },
    ],
  },
  {
    id: 'features',
    name: 'Features & Functionality',
    icon: Phone,
    questions: [
      {
        id: 'ai-call-handling',
        question:
          'How does the AI receptionist handle different types of calls?',
        answer:
          'The assistant greets callers, identifies new leads or clients, and can route urgent issues to you via SMS or email.',
      },
      {
        id: 'call-process-flow',
        question: 'What happens when someone calls my business?',
        answer:
          'Spoqen answers with your custom greeting, captures caller details, and logs the conversation for review.',
        popular: true,
      },
      {
        id: 'lead-qualification-process',
        question: 'How does lead qualification work?',
        answer:
          'Our AI asks screening questions and assigns a quality score based on caller responses and sentiment.',
        popular: true,
      },
      {
        id: 'appointment-scheduling',
        question: 'Can the AI schedule appointments or showings?',
        answer:
          'Yes. Connect your calendar and Spoqen can book appointments directly with qualified leads.',
      },
      {
        id: 'language-support',
        question: 'What languages does the AI support?',
        answer:
          'English is fully supported today, with Spanish and French in beta for Pro and Business customers.',
      },
      {
        id: 'transcription-accuracy',
        question: 'How accurate is the call transcription?',
        answer:
          'Transcriptions average over 95% accuracy thanks to state-of-the-art speech recognition.',
      },
      {
        id: 'call-recordings-access',
        question: 'Can I listen to call recordings?',
        answer:
          'Every call is recorded and available in your dashboard alongside the transcript.',
      },
      {
        id: 'sentiment-analysis-how',
        question: 'How does the sentiment analysis work?',
        answer:
          'We analyze tone and keywords to determine caller sentiment, helping you prioritise follow-ups.',
      },
      {
        id: 'action-points-generation',
        question: 'What are action points and how are they generated?',
        answer:
          'After each call, Spoqen summarises key tasks and next steps so you can act quickly on leads.',
      },
    ],
  },
  {
    id: 'analytics',
    name: 'Analytics & Insights',
    icon: BarChart3,
    questions: [
      {
        id: 'analytics-reports-available',
        question: 'What analytics and reports are available?',
        answer:
          'You\u2019ll see call volume, lead quality scores, sentiment trends, and more in real-time dashboards.',
        popular: true,
      },
      {
        id: 'lead-quality-scores-meaning',
        question: 'How do I interpret lead quality scores?',
        answer:
          'Scores range from 1–5. Higher scores indicate callers more likely to convert based on responses and tone.',
      },
      {
        id: 'data-export-options',
        question: 'Can I export my call data?',
        answer:
          'Yes, export recordings, transcripts, and analytics to CSV at any time.',
      },
      {
        id: 'analytics-update-frequency',
        question: 'How often is analytics data updated?',
        answer:
          'Metrics update in real time as calls are processed by the system.',
      },
      {
        id: 'important-metrics-focus',
        question: 'What metrics should I focus on for my business?',
        answer:
          'Most agents track qualified leads, appointment rates, and caller sentiment to gauge performance.',
      },
      {
        id: 'roi-tracking-method',
        question: 'How do I track ROI from the AI receptionist?',
        answer:
          'Connect your CRM to measure how many qualified leads convert into closed deals over time.',
      },
    ],
  },
  {
    id: 'pricing',
    name: 'Pricing & Billing',
    icon: CreditCard,
    questions: [
      {
        id: 'pricing-plans-overview',
        question: 'What are the different pricing plans?',
        answer:
          'We offer Free, Starter, Pro, and Business tiers. See full details on our pricing page.',
        popular: true,
      },
      {
        id: 'plan-changes-flexibility',
        question: 'Can I change plans anytime?',
        answer:
          'Absolutely—upgrade or downgrade from your dashboard whenever you like.',
        popular: true,
      },
      {
        id: 'plan-features-included',
        question: "What's included in each plan?",
        answer:
          'Each tier includes a set number of calls, analytics features, and support levels—visit /pricing for specifics.',
      },
      {
        id: 'refund-policy',
        question: 'Do you offer refunds?',
        answer:
          'Yes, every paid plan comes with a 30-day money-back guarantee.',
      },
      {
        id: 'billing-process',
        question: 'How does billing work?',
        answer:
          'Subscriptions renew monthly or annually through our secure payment provider, Paddle.',
      },
      {
        id: 'usage-limit-exceed',
        question: 'What happens if I exceed my limits?',
        answer:
          'We\u2019ll reach out to discuss upgrading if your usage consistently surpasses your plan.',
      },
      {
        id: 'setup-fees',
        question: 'Are there any setup fees?',
        answer:
          'No. Getting started with Spoqen is completely free of setup charges.',
      },
    ],
  },
  {
    id: 'technical',
    name: 'Technical & Integration',
    icon: Cog,
    questions: [
      {
        id: 'phone-system-compatibility',
        question: 'What phone systems does Spoqen work with?',
        answer:
          'Spoqen connects to all major carriers and VoIP providers using simple call forwarding.',
      },
      {
        id: 'crm-integration',
        question: 'Can I integrate with my existing CRM?',
        answer:
          'Yes. Use our Webhook API or native integrations to sync leads with your CRM.',
        popular: true,
      },
      {
        id: 'data-security',
        question: 'How secure is my call data?',
        answer:
          'All recordings and transcripts are encrypted in transit and at rest.',
        popular: true,
      },
      {
        id: 'technical-issues-handling',
        question: "What happens if there's a technical issue?",
        answer:
          'Our team monitors the platform 24/7 and will notify you of any disruptions.',
      },
      {
        id: 'existing-phone-number',
        question: 'Can I use my existing phone number?',
        answer:
          'Yes, simply forward calls from your current number or port it over to us.',
      },
      {
        id: 'service-reliability',
        question: 'How reliable is the service?',
        answer:
          'Spoqen maintains 99.9% uptime backed by our cloud infrastructure.',
      },
      {
        id: 'call-quality',
        question: "What's the call quality like?",
        answer:
          'We use HD voice codecs for clear, professional-sounding calls.',
      },
    ],
  },
  {
    id: 'support',
    name: 'Support & Troubleshooting',
    icon: HelpCircle,
    questions: [
      {
        id: 'getting-help',
        question: 'How do I get help if I have issues?',
        answer:
          'Browse this FAQ or reach out via our contact page for personalised support.',
        popular: true,
      },
      {
        id: 'ai-understanding-issues',
        question: "What should I do if the AI doesn't understand a caller?",
        answer:
          'Review the transcript and update your call script or keywords to improve accuracy.',
      },
      {
        id: 'improve-ai-performance',
        question: "How can I improve my AI assistant's performance?",
        answer:
          'Regularly review call analytics and refine your prompts based on real conversations.',
      },
      {
        id: 'transcript-editing',
        question: 'Can I review and edit call transcripts?',
        answer:
          'Yes, transcripts are available in your dashboard and can be exported or edited.',
      },
      {
        id: 'setup-changes',
        question: 'What if I need to make changes to my setup?',
        answer:
          'You can adjust settings anytime or contact our team for assistance.',
      },
      {
        id: 'contact-support',
        question: 'How do I contact customer support?',
        answer:
          'Email admin@spoqen.com or fill out the form on our contact page and we\u2019ll respond within one business day.',
        popular: true,
      },
    ],
  },
];

// Icon mapping for FAQ categories
const iconNameMap: Record<string, string> = {
  'getting-started': 'Settings',
  features: 'Phone',
  analytics: 'BarChart3',
  pricing: 'CreditCard',
  technical: 'Cog',
  support: 'HelpCircle',
};

// Convert categories to serializable format
const serializableCategories: SerializableFaqCategory[] = categories.map(
  cat => ({
    id: cat.id,
    name: cat.name,
    iconName: iconNameMap[cat.id] || 'HelpCircle',
    questions: cat.questions,
  })
);

// Static data - no need for useMemo
const allQuestions = categories.flatMap(cat =>
  cat.questions.map(q => ({
    id: q.id,
    question: q.question,
    answer: q.answer,
    categoryId: cat.id,
    categoryName: cat.name,
  }))
);

const popularQuestions = categories.flatMap(cat =>
  cat.questions
    .filter(q => q.popular)
    .map(q => ({
      ...q,
      categoryId: cat.id,
      categoryName: cat.name,
    }))
);

export const metadata: Metadata = {
  title: 'FAQ - Frequently Asked Questions | Spoqen',
  description:
    "Find quick answers to common questions about using Spoqen's AI receptionist for real estate agents. Get help with setup, features, pricing, and more.",
  keywords: [
    'FAQ',
    'help',
    'support',
    'AI receptionist',
    'real estate',
    'Spoqen',
    'setup',
    'pricing',
    'features',
  ],
  openGraph: {
    title: 'FAQ - Frequently Asked Questions | Spoqen',
    description:
      "Find quick answers to common questions about using Spoqen's AI receptionist for real estate agents.",
    type: 'website',
    url: '/faq',
  },
  twitter: {
    card: 'summary',
    title: 'FAQ - Frequently Asked Questions | Spoqen',
    description:
      "Find quick answers to common questions about using Spoqen's AI receptionist for real estate agents.",
  },
  other: {
    'script:ld+json': JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: allQuestions.map(q => ({
        '@type': 'Question',
        '@id': `#${q.id}`,
        name: q.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: q.answer,
        },
      })),
    }),
  },
};

export default function FAQPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12" id="main-content">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>FAQ</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <h1 className="mb-4 text-center text-4xl font-extrabold">
        Frequently Asked Questions
      </h1>
      <p className="mx-auto mb-8 max-w-2xl text-center text-muted-foreground">
        Find quick answers to common questions about using Spoqen.
      </p>

      <Suspense fallback={<div className="text-center">Loading FAQ...</div>}>
        <FAQSearch
          categories={serializableCategories}
          allQuestions={allQuestions}
          popularQuestions={popularQuestions}
        />
      </Suspense>

      <div className="mt-12 text-center">
        <p className="mb-4 text-lg font-medium">Still have questions?</p>
        <Button asChild>
          <Link href="/contact">Contact Support</Link>
        </Button>
      </div>
    </div>
  );
}

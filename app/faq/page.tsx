'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Phone,
  Settings,
  BarChart3,
  CreditCard,
  Cog,
  HelpCircle,
  Search,
  ThumbsUp,
  ThumbsDown,
  type LucideIcon,
} from 'lucide-react';
import Script from 'next/script';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface FaqQuestion {
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

const categories: FaqCategory[] = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    icon: Settings,
    questions: [
      {
        question: 'How do I set up my AI receptionist?',
        answer:
          'Sign up and follow the setup wizard to connect your phone number and configure basic details. You\u2019ll be ready in minutes.',
        popular: true,
      },
      {
        question: 'What information do I need to provide during setup?',
        answer:
          'You\u2019ll add your business name, preferred phone number, office hours, and any CRM details you want synced.',
      },
      {
        question: 'How long does initial setup take?',
        answer:
          'Most users complete setup in under five minutes thanks to our streamlined onboarding process.',
      },
      {
        question: "Can I customize my AI assistant's name and greeting?",
        answer:
          'Absolutely! You can change the assistant name and greeting message anytime from your dashboard.',
      },
      {
        question: 'What happens during the free trial?',
        answer:
          'Our Free plan lets you configure your AI assistant and preview transcripts. Upgrade to start handling live calls.',
      },
      {
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
        question:
          'How does the AI receptionist handle different types of calls?',
        answer:
          'The assistant greets callers, identifies new leads or clients, and can route urgent issues to you via SMS or email.',
      },
      {
        question: 'What happens when someone calls my business?',
        answer:
          'Spoqen answers with your custom greeting, captures caller details, and logs the conversation for review.',
        popular: true,
      },
      {
        question: 'How does lead qualification work?',
        answer:
          'Our AI asks screening questions and assigns a quality score based on caller responses and sentiment.',
        popular: true,
      },
      {
        question: 'Can the AI schedule appointments or showings?',
        answer:
          'Yes. Connect your calendar and Spoqen can book appointments directly with qualified leads.',
      },
      {
        question: 'What languages does the AI support?',
        answer:
          'English is fully supported today, with Spanish and French in beta for Pro and Business customers.',
      },
      {
        question: 'How accurate is the call transcription?',
        answer:
          'Transcriptions average over 95% accuracy thanks to state-of-the-art speech recognition.',
      },
      {
        question: 'Can I listen to call recordings?',
        answer:
          'Every call is recorded and available in your dashboard alongside the transcript.',
      },
      {
        question: 'How does the sentiment analysis work?',
        answer:
          'We analyze tone and keywords to determine caller sentiment, helping you prioritise follow-ups.',
      },
      {
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
        question: 'What analytics and reports are available?',
        answer:
          'You\u2019ll see call volume, lead quality scores, sentiment trends, and more in real-time dashboards.',
        popular: true,
      },
      {
        question: 'How do I interpret lead quality scores?',
        answer:
          'Scores range from 1–5. Higher scores indicate callers more likely to convert based on responses and tone.',
      },
      {
        question: 'Can I export my call data?',
        answer:
          'Yes, export recordings, transcripts, and analytics to CSV at any time.',
      },
      {
        question: 'How often is analytics data updated?',
        answer:
          'Metrics update in real time as calls are processed by the system.',
      },
      {
        question: 'What metrics should I focus on for my business?',
        answer:
          'Most agents track qualified leads, appointment rates, and caller sentiment to gauge performance.',
      },
      {
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
        question: 'What are the different pricing plans?',
        answer:
          'We offer Free, Starter, Pro, and Business tiers. See full details on our pricing page.',
        popular: true,
      },
      {
        question: 'Can I change plans anytime?',
        answer:
          'Absolutely—upgrade or downgrade from your dashboard whenever you like.',
        popular: true,
      },
      {
        question: "What's included in each plan?",
        answer:
          'Each tier includes a set number of calls, analytics features, and support levels—visit /pricing for specifics.',
      },
      {
        question: 'Do you offer refunds?',
        answer:
          'Yes, every paid plan comes with a 30-day money-back guarantee.',
      },
      {
        question: 'How does billing work?',
        answer:
          'Subscriptions renew monthly or annually through our secure payment provider, Paddle.',
      },
      {
        question: 'What happens if I exceed my limits?',
        answer:
          'We\u2019ll reach out to discuss upgrading if your usage consistently surpasses your plan.',
      },
      {
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
        question: 'What phone systems does Spoqen work with?',
        answer:
          'Spoqen connects to all major carriers and VoIP providers using simple call forwarding.',
      },
      {
        question: 'Can I integrate with my existing CRM?',
        answer:
          'Yes. Use our Webhook API or native integrations to sync leads with your CRM.',
        popular: true,
      },
      {
        question: 'How secure is my call data?',
        answer:
          'All recordings and transcripts are encrypted in transit and at rest.',
        popular: true,
      },
      {
        question: "What happens if there's a technical issue?",
        answer:
          'Our team monitors the platform 24/7 and will notify you of any disruptions.',
      },
      {
        question: 'Can I use my existing phone number?',
        answer:
          'Yes, simply forward calls from your current number or port it over to us.',
      },
      {
        question: 'How reliable is the service?',
        answer:
          'Spoqen maintains 99.9% uptime backed by our cloud infrastructure.',
      },
      {
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
        question: 'How do I get help if I have issues?',
        answer:
          'Browse this FAQ or reach out via our contact page for personalised support.',
        popular: true,
      },
      {
        question: "What should I do if the AI doesn't understand a caller?",
        answer:
          'Review the transcript and update your call script or keywords to improve accuracy.',
      },
      {
        question: "How can I improve my AI assistant's performance?",
        answer:
          'Regularly review call analytics and refine your prompts based on real conversations.',
      },
      {
        question: 'Can I review and edit call transcripts?',
        answer:
          'Yes, transcripts are available in your dashboard and can be exported or edited.',
      },
      {
        question: 'What if I need to make changes to my setup?',
        answer:
          'You can adjust settings anytime or contact our team for assistance.',
      },
      {
        question: 'How do I contact customer support?',
        answer:
          'Email admin@spoqen.com or fill out the form on our contact page and we\u2019ll respond within one business day.',
        popular: true,
      },
    ],
  },
];



export default function FAQPage() {
  const [search, setSearch] = useState('');
  const allQuestions = useMemo(
    () =>
      categories.flatMap(cat =>
        cat.questions.map(q => ({ question: q.question, answer: q.answer }))
      ),
    []
  );
  
  const filteredCategories = useMemo(() => {
    if (!search) return categories;
    const term = search.toLowerCase();
    return categories
      .map(cat => ({
        ...cat,
        questions: cat.questions.filter(q =>
          q.question.toLowerCase().includes(term) ||
          q.answer.toLowerCase().includes(term)
        ),
      }))
      .filter(cat => cat.questions.length > 0);
  }, [search]);

  const filteredPopularQuestions = useMemo(() => {
    if (!search) {
      return categories.flatMap(cat =>
        cat.questions.filter(q => q.popular).map(q => ({ ...q }))
      );
    }
    const term = search.toLowerCase();
    return categories
      .flatMap(cat =>
        cat.questions
          .filter(q => q.popular)
          .filter(q =>
            q.question.toLowerCase().includes(term) ||
            q.answer.toLowerCase().includes(term)
          )
          .map(q => ({ ...q }))
      );
  }, [search]);

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

      <div className="mx-auto mb-10 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search questions"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Search questions"
          />
        </div>
      </div>

      {filteredPopularQuestions.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 text-center text-2xl font-bold text-foreground">
            {search ? 'Popular Questions Matching Your Search' : 'Most Popular Questions'}
          </h2>
          <Accordion type="single" collapsible className="space-y-2">
            {filteredPopularQuestions.map((q, idx) => (
              <AccordionItem key={idx} value={`popular-${idx}`}>
                <AccordionTrigger className="text-left">
                  {q.question}
                </AccordionTrigger>
                <AccordionContent>
                  <p>{q.answer}</p>
                  <HelpfulFeedback />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      )}

      {filteredCategories.map(category => (
        <section key={category.id} className="mb-10">
          <h2 className="mb-4 flex items-center text-2xl font-bold">
            <category.icon className="mr-2 h-5 w-5" />
            {category.name}
          </h2>
          <Accordion type="single" collapsible className="space-y-2">
            {category.questions.map((q, index) => (
              <AccordionItem key={index} value={`${category.id}-${index}`}>
                <AccordionTrigger className="text-left">
                  {q.question}
                </AccordionTrigger>
                <AccordionContent>
                  <p>{q.answer}</p>
                  <HelpfulFeedback />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      ))}

      {search && filteredCategories.length === 0 && filteredPopularQuestions.length === 0 && (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground mb-4">
            No questions found matching "{search}"
          </p>
          <p className="text-sm text-muted-foreground">
            Try searching with different keywords or browse all questions below.
          </p>
        </div>
      )}

      <div className="mt-12 text-center">
        <p className="mb-4 text-lg font-medium">Still have questions?</p>
        <Button asChild>
          <Link href="/contact">Contact Support</Link>
        </Button>
      </div>

      <Script
        id="faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: allQuestions.map(q => ({
              '@type': 'Question',
              name: q.question,
              acceptedAnswer: { '@type': 'Answer', text: q.answer },
            })),
          }),
        }}
      />
    </div>
  );
}

function HelpfulFeedback() {
  const [feedback, setFeedback] = useState<null | 'yes' | 'no'>(null);
  if (feedback) {
    return (
      <p className="mt-2 text-sm text-muted-foreground">
        Thanks for the feedback!
      </p>
    );
  }
  return (
    <div className="mt-2 flex items-center gap-2 text-sm">
      <span>Was this helpful?</span>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Yes"
        onClick={() => setFeedback('yes')}
      >
        <ThumbsUp className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="No"
        onClick={() => setFeedback('no')}
      >
        <ThumbsDown className="h-4 w-4" />
      </Button>
    </div>
  );
}

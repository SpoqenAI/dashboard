import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Quote, Star } from 'lucide-react';

interface TestimonialProps {
  content: string;
  customerName: string;
  customerTitle: string;
  customerCompany: string;
  avatarSrc?: string;
  metrics: {
    primary: string;
    secondary: string;
  };
}

const testimonials: TestimonialProps[] = [
  {
    content:
      'Spoqen captured 47 leads in our first month. ROI was 340% - absolute game changer for our agency.',
    customerName: 'Alex Chen',
    customerTitle: 'Founder',
    customerCompany: 'TechFlow Digital',
    avatarSrc:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    metrics: {
      primary: '+47 leads',
      secondary: '340% ROI',
    },
  },
  {
    content:
      "Finally, an AI that doesn't sound like a robot. Closed $50K in deals from leads Spoqen qualified.",
    customerName: 'Marcus Rodriguez',
    customerTitle: 'CEO',
    customerCompany: 'CryptoConsult Pro',
    avatarSrc:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    metrics: {
      primary: '$50K ARR',
      secondary: '2.3x conversion',
    },
  },
  {
    content:
      'Spoqen integrates with our entire stack. Webhook automation saved us 20+ hours/week on lead routing.',
    customerName: 'Sarah Kim',
    customerTitle: 'CTO',
    customerCompany: 'GrowthHack Labs',
    avatarSrc:
      'https://images.unsplash.com/photo-1494790108755-2616b612b647?w=150&h=150&fit=crop&crop=face',
    metrics: {
      primary: '20+ hrs saved',
      secondary: 'API-first',
    },
  },
];

// Micro-testimonials for sprinkling throughout the page
const microTestimonials = [
  {
    quote: 'Reduced missed calls by 74%',
    author: 'Jake Miller',
    company: 'StartupFlow',
    avatarSrc:
      'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop&crop=face',
  },
  {
    quote: "Best $49/month I've ever spent",
    author: 'Emma Thompson',
    company: 'ScaleUp Labs',
    avatarSrc:
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=face',
  },
  {
    quote: 'Our close rate went from 12% to 28%',
    author: 'David Park',
    company: 'Growth Ventures',
    avatarSrc:
      'https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?w=100&h=100&fit=crop&crop=face',
  },
  {
    quote: 'Setup took literally 4 minutes',
    author: 'Lisa Chang',
    company: 'TechForward',
    avatarSrc:
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
  },
];

function TestimonialCard({ testimonial }: { testimonial: TestimonialProps }) {
  return (
    <Card className="hover:shadow-glow-primary/20 group border border-white/10 bg-card/20 backdrop-blur-glass transition-all duration-300 hover:scale-105 hover:bg-card/30">
      <CardContent className="space-y-4 p-6">
        <div className="flex items-start space-x-2">
          <Quote className="h-6 w-6 flex-shrink-0 text-primary/60" />
          <blockquote className="italic leading-relaxed text-foreground">
            "{testimonial.content}"
          </blockquote>
        </div>

        <div className="flex items-center space-x-3">
          <Avatar className="h-12 w-12 ring-2 ring-primary/20">
            <AvatarImage
              src={testimonial.avatarSrc}
              alt={testimonial.customerName}
            />
            <AvatarFallback className="bg-gradient-primary font-semibold text-white">
              {testimonial.customerName
                .split(' ')
                .map(n => n[0])
                .join('')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="font-semibold text-foreground">
              {testimonial.customerName}
            </div>
            <div className="text-sm text-muted-foreground">
              {testimonial.customerTitle}, {testimonial.customerCompany}
            </div>
          </div>
          <div className="flex items-center space-x-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className="h-4 w-4 fill-yellow-400 text-yellow-400"
              />
            ))}
          </div>
        </div>

        <div className="flex space-x-2 pt-2">
          <Badge
            variant="secondary"
            className="border-primary/30 bg-primary/20 text-primary"
          >
            {testimonial.metrics.primary}
          </Badge>
          <Badge
            variant="secondary"
            className="border-accent/30 bg-accent/20 text-accent"
          >
            {testimonial.metrics.secondary}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export function TestimonialsSection() {
  return (
    <section className="w-full bg-gradient-to-b from-background to-card/30 py-20">
      <div className="container px-6">
        <div className="mb-16 animate-fade-in text-center">
          <h2 className="mb-6 text-4xl font-bold lg:text-5xl">
            Join
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              {' '}
              2,847+ Founders
            </span>
            <br />
            Growing Revenue with AI
          </h2>
          <p className="mx-auto max-w-3xl text-xl text-muted-foreground">
            From startups to scale-ups, tech founders are using Spoqen to
            capture every opportunity and 10X their lead conversion.
          </p>
        </div>

        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <TestimonialCard testimonial={testimonial} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Micro-testimonial component for sprinkling throughout the page
export function MicroTestimonial({ index = 0 }: { index?: number }) {
  const testimonial = microTestimonials[index % microTestimonials.length];

  return (
    <div className="flex items-center justify-center space-x-4 rounded-lg border border-white/10 bg-card/10 p-4 backdrop-blur-glass">
      <Avatar className="h-10 w-10">
        <AvatarImage src={testimonial.avatarSrc} alt={testimonial.author} />
        <AvatarFallback className="bg-gradient-primary text-sm text-white">
          {testimonial.author
            .split(' ')
            .map(n => n[0])
            .join('')}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <p className="text-sm italic text-muted-foreground">
          "{testimonial.quote}"
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">{testimonial.author}</span>,{' '}
          {testimonial.company}
        </p>
      </div>
      <div className="flex items-center space-x-1">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
        ))}
      </div>
    </div>
  );
}

// Testimonial strip for multiple micro-testimonials
export function TestimonialStrip() {
  return (
    <div className="w-full border-y border-white/10 bg-card/5 py-8 backdrop-blur-glass">
      <div className="container px-6">
        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          <MicroTestimonial index={0} />
          <MicroTestimonial index={1} />
        </div>
      </div>
    </div>
  );
}

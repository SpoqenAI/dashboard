import {
  ShieldCheck,
  Bot,
  MessageSquareCode,
  Share2,
  Workflow,
  TestTubeDiagonal,
} from 'lucide-react';
import { MotionHover, MotionItem, MotionStagger } from '@/components/motion';

const items = [
  {
    icon: Workflow,
    title: 'Visual Logic Trees',
    desc: 'Map out complex multi-turn conversations intuitively without writing any code.',
  },
  {
    icon: TestTubeDiagonal,
    title: 'Instant Simulation',
    desc: 'Test your prompt graphs immediately within the builder before deploying.',
  },
  {
    icon: Bot,
    title: 'Any LLM Backend',
    desc: 'Format prompts universally to work with OpenAI, Anthropic, Gemini, or local models.',
  },
  {
    icon: MessageSquareCode,
    title: 'Built-in Variables',
    desc: 'Easily inject dynamic user data and API context into your prompt nodes.',
  },
  {
    icon: Share2,
    title: 'One-Click Export',
    desc: 'Generate clean, production-ready JSON or code snippets for your runtime.',
  },
  {
    icon: ShieldCheck,
    title: 'Enterprise Versioning',
    desc: 'Track changes, rollback safely, and collaborate with your engineering team.',
  },
];

export function BenefitsGrid() {
  return (
    <div className="container">
      <MotionStagger inView className="mb-8 text-center sm:mb-10">
        <MotionItem>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
            Why engineers choose Spoqen
          </h2>
        </MotionItem>
        <MotionItem>
          <p className="mt-2 text-sm text-muted-foreground sm:mt-3 sm:text-base">
            The essentials that turn messy text files into reliable AI systems.
          </p>
        </MotionItem>
      </MotionStagger>

      <MotionStagger
        inView
        className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3"
      >
        {items.map(({ icon: Icon, title, desc }) => (
          <MotionItem key={title}>
            <MotionHover className="h-full">
              <div className="hover:shadow-glow-primary/20 h-full rounded-2xl border border-white/10 bg-card/40 p-4 shadow-sm backdrop-blur-glass transition-shadow duration-300 sm:p-5">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary sm:h-9 sm:w-9">
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </div>
                  <div className="text-sm font-semibold sm:text-base">
                    {title}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  {desc}
                </p>
              </div>
            </MotionHover>
          </MotionItem>
        ))}
      </MotionStagger>
    </div>
  );
}

export default BenefitsGrid;

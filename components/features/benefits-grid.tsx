import {
  ShieldCheck,
  Bot,
  MessageSquareCode,
  PhoneCall,
  NotepadText,
  Workflow,
} from 'lucide-react';

const items = [
  {
    icon: PhoneCall,
    title: 'Answers every call',
    desc: '24/7 coverage with natural voice and fast response time.',
  },
  {
    icon: NotepadText,
    title: 'Instant summaries',
    desc: 'Clean call notes and next steps delivered to your inbox/CRM.',
  },
  {
    icon: Workflow,
    title: 'Smart routing',
    desc: 'Qualify and route leads to the right person or calendar.',
  },
  {
    icon: MessageSquareCode,
    title: 'Two-way SMS',
    desc: 'Automatic follow-ups to confirm details and reduce no‑shows.',
  },
  {
    icon: Bot,
    title: 'Custom AI playbooks',
    desc: 'Tailored behavior per line of business and hours.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure & reliable',
    desc: 'Built on battle-tested infra with data privacy by default.',
  },
];

export function BenefitsGrid() {
  return (
    <div className="container">
      <div className="mb-8 text-center sm:mb-10">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
          Why teams choose Spoqen
        </h2>
        <p className="mt-2 text-sm text-muted-foreground sm:mt-3 sm:text-base">
          The essentials that turn missed calls into booked revenue.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {items.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="rounded-2xl border border-white/10 bg-card/40 p-4 shadow-sm backdrop-blur-glass sm:p-5"
          >
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary sm:h-9 sm:w-9">
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
              <div className="text-sm font-semibold sm:text-base">{title}</div>
            </div>
            <p className="text-xs text-muted-foreground sm:text-sm">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default BenefitsGrid;

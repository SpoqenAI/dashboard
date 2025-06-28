import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface PricingCardProps {
  title?: string;
  description?: string;
  price?: string;
  features?: string[];
}

export function PricingCard({
  title = 'Simple Pricing',
  description = 'No hidden fees',
  price = '$30',
  features = [
    'Call summaries in email & CRM',
    'Unlimited receptionist minutes',
    'Custom call greeting & script',
    'Lead qualification questions',
  ],
}: PricingCardProps) {
  return (
    <Card className="mx-auto w-full max-w-lg text-center">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center gap-2">
          <span className="text-5xl font-bold">{price}</span>
          <span className="text-sm text-muted-foreground">per month</span>
        </div>
        {/* Feature list */}
        <ul className="mt-6 space-y-2 text-center">
          {features.map(feature => (
            <li
              key={feature}
              className="flex items-center justify-center gap-2"
            >
              <CheckCircle className="h-4 w-4 shrink-0 text-primary" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="justify-center">
        <Button asChild>
          <Link href="/signup">Sign Up</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

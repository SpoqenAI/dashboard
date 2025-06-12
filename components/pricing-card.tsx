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

export function PricingCard({
  title = "Simple Pricing",
  description = "No hidden fees or contracts",
  price = "$30",
}: {
  title?: string;
  description?: string;
  price?: string;
}) {
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
      </CardContent>
      <CardFooter className="justify-center">
        <Button asChild>
          <Link href="/signup">Sign Up</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

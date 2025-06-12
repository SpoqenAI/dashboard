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

export function PricingCard() {
  return (
    <Card className="mx-auto w-full max-w-lg text-center">
      <CardHeader>
        <CardTitle>Simple Pricing</CardTitle>
        <CardDescription>No hidden fees or contracts</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center gap-2">
          <span className="text-5xl font-bold">$30</span>
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

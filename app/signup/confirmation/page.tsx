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
import { Mail, ArrowRight } from 'lucide-react';
import Logo from '@/components/ui/logo';

export default function SignupConfirmationPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              We've sent you a verification link to complete your registration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center py-6">
              <div className="rounded-full bg-primary/10 p-6">
                <Mail className="h-12 w-12 text-primary" />
              </div>
            </div>
            <div className="space-y-2 text-center">
              <p className="text-sm text-muted-foreground">
                Please check your email inbox and click the verification link to
                activate your account.
              </p>
              <p className="text-sm text-muted-foreground">
                If you don't see the email, check your spam folder.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button variant="outline" asChild className="w-full">
              <Link href="/login">
                Go to Login <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}

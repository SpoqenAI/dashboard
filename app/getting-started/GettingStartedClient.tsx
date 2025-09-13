'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DashboardShell } from '@/components/dashboard-shell';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { useQueryState } from 'nuqs';
import { AlertCircle, Loader2, Copy, Check, Phone } from 'lucide-react';
import CarrierForwarding from '@/components/onboarding/CarrierForwarding';
import { useSubscription } from '@/hooks/use-subscription';
import { isFreeUser } from '@/lib/paddle';

type ProvisionState = 'provisioning' | 'active' | 'failed' | 'unknown';

export default function GettingStartedClient() {
  const router = useRouter();
  const [payment] = useQueryState('payment');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<ProvisionState>('unknown');
  const [phone, setPhone] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);
  const { subscription, loading: subLoading } = useSubscription();

  const isFree = useMemo(() => {
    if (subLoading) return false;
    return isFreeUser(subscription);
  }, [subLoading, subscription]);

  useEffect(() => {
    if (payment === 'success') {
      toast({
        title: 'Payment successful!',
        description: 'Welcome to Spoqen. Let’s finish your setup.',
        duration: 5000,
      });
    }
  }, [payment]);

  useEffect(() => {
    let alive = true;
    let attempts = 0;
    const supabase = createClient();

    const fetchData = async () => {
      attempts += 1;
      try {
        const { data: auth } = await supabase.auth.getUser();
        const user = auth.user;
        if (!user) {
          setLoading(false);
          return;
        }

        const [{ data: phoneRow }, { data: settingsRow }] = await Promise.all([
          supabase
            .from('phone_numbers')
            .select('status, e164_number')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .maybeSingle(),
          supabase
            .from('user_settings')
            .select('assistant_provisioning_status, call_forwarding_completed')
            .eq('id', user.id)
            .maybeSingle(),
        ]);

        if (!alive) return;

        const prov =
          (settingsRow?.assistant_provisioning_status as ProvisionState | null) ||
          'unknown';

        if (!phoneRow) {
          setPhone(null);
          if (prov === 'provisioning' || prov === 'unknown')
            setStatus('provisioning');
          else if (prov === 'failed') setStatus('failed');
          else setStatus('provisioning');
        } else {
          setPhone(phoneRow.e164_number || null);
          setStatus('active');
        }
      } catch {
        // ignore transient errors
      } finally {
        if (alive) setLoading(false);
      }
    };

    // Free users: no number; show subscribe CTA instead of polling
    if (!isFree) {
      fetchData();
      const id = setInterval(() => {
        if (status === 'active') return;
        if (attempts >= 20) return;
        fetchData();
      }, 5000);
      return () => {
        alive = false;
        clearInterval(id);
      };
    } else {
      setLoading(false);
      setStatus('unknown');
      return () => {
        alive = false;
      };
    }
  }, [status, isFree]);

  const digitsOnly = useMemo(
    () => (phone ? phone.replace(/\D/g, '') : ''),
    [phone]
  );

  const copy = async (text: string) => {
    try {
      setCopying(true);
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copied', description: 'Copied to clipboard.' });
    } finally {
      setCopying(false);
    }
  };

  const handleFinish = async () => {
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) return;
      const { error } = await supabase
        .from('user_settings')
        .update({
          call_forwarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      if (error) throw error;
      toast({ title: 'Setup complete', description: "You're all set." });
      router.push('/recent-calls');
    } catch (e) {
      toast({
        title: 'Error',
        description: 'Could not save your setup state.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardShell>
        <div className="mx-auto max-w-3xl space-y-6 py-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Getting Started</h1>
          </div>

          {loading && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-gray-600">Checking your setup…</span>
              </div>
            </div>
          )}

          {!loading && isFree && (
            <Card>
              <CardHeader>
                <CardTitle>No phone number yet</CardTitle>
                <CardDescription>
                  Subscribe to get your dedicated number and enable call
                  forwarding.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <a href="/pricing">Choose a plan</a>
                </Button>
              </CardContent>
            </Card>
          )}

          {!loading && !isFree && status === 'provisioning' && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-blue-900">
                  Setting up your number
                </CardTitle>
                <CardDescription className="text-blue-700">
                  We’re provisioning your number. This usually takes under a
                  minute.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-blue-700">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Provisioning in progress…</span>
                </div>
              </CardContent>
            </Card>
          )}

          {!loading && !isFree && status === 'failed' && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-900">Setup issue</CardTitle>
                <CardDescription className="text-red-700">
                  We couldn’t finish provisioning. Please refresh later or
                  contact support.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  <span>We’ve been notified and are looking into it.</span>
                </div>
              </CardContent>
            </Card>
          )}

          {!loading && !isFree && status === 'active' && phone && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Your Spoqen number</CardTitle>
                  <CardDescription>
                    Forward missed/declined calls to this number so your AI can
                    answer.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-2">
                      <Phone className="h-5 w-5 text-green-600" />
                      <span className="text-2xl font-bold tracking-wider">
                        {phone}
                      </span>
                    </div>
                  </div>

                  {/** Dial codes are shown after you choose device & carrier below **/}
                </CardContent>
              </Card>

              <CarrierForwarding phoneNumber={phone} />

              <div className="flex justify-end">
                <Button onClick={handleFinish}>Finish</Button>
              </div>
            </>
          )}
        </div>
      </DashboardShell>
    </div>
  );
}

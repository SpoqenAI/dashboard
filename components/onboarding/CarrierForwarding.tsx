'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { useMemo, useState } from 'react';
import { Apple, Smartphone } from 'lucide-react';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface Props {
  phoneNumber: string;
}

type Device = 'iphone' | 'android';
type Carrier = 'verizon' | 'att' | 'tmobile';

export default function CarrierForwarding({ phoneNumber }: Props) {
  const digits = useMemo(() => phoneNumber.replace(/\D/g, ''), [phoneNumber]);
  const [device, setDevice] = useState<Device>('iphone');
  const [carrier, setCarrier] = useState<Carrier>('verizon');

  const Code = ({ code }: { code: string }) => (
    <div className="flex w-full items-center justify-center">
      <code className="rounded-lg border-2 border-foreground/20 bg-background px-4 py-3 text-2xl font-bold tracking-wider">
        {code}
      </code>
    </div>
  );

  const carrierStep = device === 'iphone' ? 3 : 2;
  const dialStep = device === 'iphone' ? 4 : 3;

  const renderCarrierCodes = () => {
    switch (carrier) {
      case 'verizon':
        return (
          <div className="space-y-3">
            <div className="text-sm font-medium">
              Step {dialStep} — Dial to turn on conditional call forwarding
            </div>
            <div className="text-sm text-muted-foreground">
              Open your Phone app and dial:
            </div>
            <Code code={`*71${digits}`} />
            <div className="text-xs text-muted-foreground">
              To turn it off later, dial{' '}
              <code className="rounded bg-muted px-1">*73</code>.
            </div>
          </div>
        );
      case 'att':
        return (
          <div className="space-y-3">
            <div className="text-sm font-medium">
              Step {dialStep} — Dial to turn on conditional call forwarding
            </div>
            <div className="text-sm text-muted-foreground">
              Open your Phone app and dial:
            </div>
            <Code code={`**004*${digits}#`} />
            <div className="text-xs text-muted-foreground">
              To turn it off later, dial{' '}
              <code className="rounded bg-muted px-1">##004#</code>.
            </div>
          </div>
        );
      case 'tmobile':
        return (
          <div className="space-y-3">
            <div className="text-sm font-medium">
              Step {dialStep} — Dial to turn on conditional call forwarding
            </div>
            <div className="text-sm text-muted-foreground">
              Open your Phone app and dial:
            </div>
            <Code code={`**004*${digits}#`} />
            <div className="text-xs text-muted-foreground">
              To turn it off later, dial{' '}
              <code className="rounded bg-muted px-1">##004#</code>.
            </div>
          </div>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set up call forwarding</CardTitle>
        <CardDescription>
          Pick your device and carrier to get exact dial codes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="text-sm font-medium">Step 1 — Choose your device</div>
          <ToggleGroup
            type="single"
            value={device}
            onValueChange={val => val && setDevice(val as Device)}
          >
            <ToggleGroupItem value="iphone" aria-label="iPhone">
              <Apple className="h-4 w-4" /> iPhone
            </ToggleGroupItem>
            <ToggleGroupItem value="android" aria-label="Android">
              <Smartphone className="h-4 w-4" /> Android
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {device === 'iphone' && (
          <div className="text-sm">
            <div className="font-medium">
              Step 2 — Turn off Live Voicemail (required)
            </div>
            <div className="text-muted-foreground">
              Settings → Phone → Live Voicemail → turn OFF. Forwarding will not
              work if Live Voicemail is on.
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="text-sm font-medium">
            Step {carrierStep} — Choose your carrier
          </div>
          <Select
            value={carrier}
            onValueChange={val => setCarrier(val as Carrier)}
          >
            <SelectTrigger className="w-full md:w-80">
              <SelectValue placeholder="Select carrier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="verizon">
                Verizon (Visible, Xfinity Mobile)
              </SelectItem>
              <SelectItem value="att">AT&T</SelectItem>
              <SelectItem value="tmobile">T-Mobile (Mint)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {renderCarrierCodes()}

        <div className="rounded-md border bg-blue-50 p-4 text-sm text-blue-900">
          After enabling, test it: call your main number from another phone.
          Your Spoqen number should answer.
        </div>
      </CardContent>
    </Card>
  );
}

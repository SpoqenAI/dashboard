'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle, AlertCircle, Loader2, Phone } from 'lucide-react';

interface AssistantData {
  status: 'draft' | 'provisioning' | 'active' | 'error';
  status_detail?: string;
  phone_numbers?: { e164_number: string }[];
}

export default function CallForwardingInstructions() {
  const [assistantData, setAssistantData] = useState<AssistantData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssistantData = async () => {
      try {
        const supabase = createClient();

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          setError(authError.message);
          setLoading(false);
          return;
        }

        if (!user) {
          setLoading(false);
          return;
        }

        // Fetch the user's most recent assistant and join with the phone number
        const { data: assistantData, error } = await supabase
          .from('assistants')
          .select(
            `
            status,
            status_detail,
            phone_numbers ( e164_number )
          `
          )
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          if (error.code === 'PGRST116') {
            // No assistant found - this is expected for users who haven't completed onboarding
            setAssistantData(null);
          } else {
            setError(error.message);
          }
        } else {
          setAssistantData(assistantData);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchAssistantData();
  }, []);

  if (loading) {
    return (
      <div className="my-6 rounded-lg border border-gray-200 bg-gray-50 p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-gray-600">Loading assistant status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-6 rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="text-red-800">
            Error loading assistant data: {error}
          </span>
        </div>
      </div>
    );
  }

  if (!assistantData) {
    return null;
  }

  const { status, status_detail } = assistantData;
  const phoneNumber = Array.isArray(assistantData.phone_numbers)
    ? assistantData.phone_numbers[0]?.e164_number
    : null;

  const renderContent = () => {
    switch (status) {
      case 'provisioning':
        return (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
            <div className="mb-4 flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <h4 className="text-lg font-semibold text-blue-800">
                Setup in Progress
              </h4>
            </div>
            <p className="mb-2 text-blue-700">
              We are setting up your dedicated phone number and AI assistant.
              This may take a minute.
            </p>
            {status_detail && (
              <p className="rounded border bg-blue-100 px-3 py-2 text-sm text-blue-600">
                <span className="font-medium">Status:</span> {status_detail}
              </p>
            )}
            <p className="mt-3 text-sm text-blue-600">
              Please refresh the page in a moment to see your phone number.
            </p>
          </div>
        );

      case 'active':
        if (!phoneNumber) {
          // Fallback to error state if active but no number
          return renderErrorState();
        }
        return (
          <div className="rounded-lg border border-green-200 bg-green-50 p-6">
            <div className="mb-4 flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <h4 className="text-lg font-semibold text-green-800">
                Your AI Assistant is Ready!
              </h4>
            </div>

            <p className="mb-4 text-green-700">
              Forward your calls to the number below to have your AI handle
              them:
            </p>

            <div className="mb-4 rounded-lg border-2 border-green-300 bg-white p-4">
              <div className="flex items-center justify-center gap-2">
                <Phone className="h-5 w-5 text-green-600" />
                <span className="text-2xl font-bold tracking-wider text-gray-900">
                  {phoneNumber}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <h5 className="font-medium text-green-800">
                How to set up call forwarding:
              </h5>
              <div className="space-y-2 text-sm text-gray-700">
                <p className="flex items-start gap-2">
                  <span className="min-w-[60px] font-semibold">Option 1:</span>
                  <span>
                    Dial{' '}
                    <code className="rounded bg-gray-100 px-1 py-0.5">
                      *72{phoneNumber.replace(/\D/g, '')}
                    </code>{' '}
                    from your phone
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="min-w-[60px] font-semibold">Option 2:</span>
                  <span>
                    Contact your mobile carrier and request call forwarding to{' '}
                    {phoneNumber}
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="min-w-[60px] font-semibold">Option 3:</span>
                  <span>
                    Check your phone's settings app for "Call Forwarding"
                    options
                  </span>
                </p>
              </div>

              <div className="mt-4 rounded border border-blue-200 bg-blue-50 p-3 text-sm">
                <p className="text-blue-800">
                  <span className="font-medium">💡 Tip:</span> Test your setup
                  by calling your original number. You should hear your AI
                  assistant answer!
                </p>
              </div>
            </div>
          </div>
        );

      case 'error':
        return renderErrorState();

      case 'draft':
      default:
        return null;
    }
  };

  const renderErrorState = () => (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6">
      <div className="mb-4 flex items-center gap-3">
        <AlertCircle className="h-6 w-6 text-red-600" />
        <h4 className="text-lg font-semibold text-red-800">Setup Error</h4>
      </div>

      <p className="mb-3 text-red-700">
        There was a problem setting up your phone number and AI assistant. Our
        team has been notified.
      </p>

      {status_detail && (
        <div className="mb-4 rounded border border-red-200 bg-red-100 p-3 text-sm">
          <p className="text-red-800">
            <span className="font-medium">Error details:</span> {status_detail}
          </p>
        </div>
      )}

      <div className="space-y-2 text-sm">
        <p className="text-red-700">
          <span className="font-medium">What you can do:</span>
        </p>
        <ul className="ml-4 list-inside list-disc space-y-1 text-red-600">
          <li>
            Refresh this page in a few minutes to see if the issue resolved
            automatically
          </li>
          <li>Contact our support team for immediate assistance</li>
          <li>Check that your subscription is active in the billing section</li>
        </ul>
      </div>
    </div>
  );

  return <div className="my-6">{renderContent()}</div>;
}

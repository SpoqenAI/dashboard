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
  const [assistantData, setAssistantData] = useState<AssistantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssistantData = async () => {
      try {
        const supabase = createClient();
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // Fetch the user's most recent assistant and join with the phone number
        const { data: assistantData, error } = await supabase
          .from('assistants')
          .select(`
            status,
            status_detail,
            phone_numbers ( e164_number )
          `)
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
      <div className="my-6 p-6 border border-gray-200 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-gray-600">Loading assistant status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-6 p-6 border border-red-200 bg-red-50 rounded-lg">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="text-red-800">Error loading assistant data: {error}</span>
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
          <div className="p-6 border border-blue-200 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-3 mb-4">
              <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
              <h4 className="font-semibold text-blue-800 text-lg">Setup in Progress</h4>
            </div>
            <p className="text-blue-700 mb-2">
              We are setting up your dedicated phone number and AI assistant. This may take a minute.
            </p>
            {status_detail && (
              <p className="text-sm text-blue-600 bg-blue-100 px-3 py-2 rounded border">
                <span className="font-medium">Status:</span> {status_detail}
              </p>
            )}
            <p className="text-sm text-blue-600 mt-3">
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
          <div className="p-6 border border-green-200 bg-green-50 rounded-lg">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <h4 className="font-semibold text-green-800 text-lg">Your AI Assistant is Ready!</h4>
            </div>
            
            <p className="text-green-700 mb-4">
              Forward your calls to the number below to have your AI handle them:
            </p>
            
            <div className="bg-white border-2 border-green-300 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-center gap-2">
                <Phone className="h-5 w-5 text-green-600" />
                <span className="text-2xl font-bold text-gray-900 tracking-wider">
                  {phoneNumber}
                </span>
              </div>
            </div>
            
            <div className="space-y-3">
              <h5 className="font-medium text-green-800">How to set up call forwarding:</h5>
              <div className="text-sm text-gray-700 space-y-2">
                <p className="flex items-start gap-2">
                  <span className="font-semibold min-w-[60px]">Option 1:</span>
                  <span>Dial <code className="bg-gray-100 px-1 py-0.5 rounded">*72{phoneNumber.replace(/\D/g, '')}</code> from your phone</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="font-semibold min-w-[60px]">Option 2:</span>
                  <span>Contact your mobile carrier and request call forwarding to {phoneNumber}</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="font-semibold min-w-[60px]">Option 3:</span>
                  <span>Check your phone's settings app for "Call Forwarding" options</span>
                </p>
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                <p className="text-blue-800">
                  <span className="font-medium">💡 Tip:</span> Test your setup by calling your original number. 
                  You should hear your AI assistant answer!
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
    <div className="p-6 border border-red-200 bg-red-50 rounded-lg">
      <div className="flex items-center gap-3 mb-4">
        <AlertCircle className="h-6 w-6 text-red-600" />
        <h4 className="font-semibold text-red-800 text-lg">Setup Error</h4>
      </div>
      
      <p className="text-red-700 mb-3">
        There was a problem setting up your phone number and AI assistant. Our team has been notified.
      </p>
      
      {status_detail && (
        <div className="mb-4 p-3 bg-red-100 border border-red-200 rounded text-sm">
          <p className="text-red-800">
            <span className="font-medium">Error details:</span> {status_detail}
          </p>
        </div>
      )}
      
      <div className="space-y-2 text-sm">
        <p className="text-red-700">
          <span className="font-medium">What you can do:</span>
        </p>
        <ul className="list-disc list-inside text-red-600 space-y-1 ml-4">
          <li>Refresh this page in a few minutes to see if the issue resolved automatically</li>
          <li>Contact our support team for immediate assistance</li>
          <li>Check that your subscription is active in the billing section</li>
        </ul>
      </div>
    </div>
  );

  return (
    <div className="my-6">
      {renderContent()}
    </div>
  );
} 
'use client';

import { useState } from 'react';
import { logger } from '@/lib/logger';

export default function TestLoggingPage() {
  const [testEmail] = useState('user@example.com');
  const [testUserId] = useState('uuid-1234-5678-9012-abcdef');

  const testDebugLog = () => {
    logger.debug('TEST', 'Debug message with sensitive data', {
      email: testEmail,
      userId: testUserId,
      action: 'test_debug'
    });
  };

  const testInfoLog = () => {
    logger.info('TEST', 'Info message with context', {
      email: testEmail,
      userId: testUserId,
      action: 'test_info'
    });
  };

  const testWarningLog = () => {
    logger.warn('TEST', 'Warning message', {
      email: testEmail,
      issue: 'test_warning'
    });
  };

  const testErrorLog = () => {
    const testError = new Error('Test error for Sentry integration');
    logger.error('TEST', 'Test error with context', testError, {
      email: testEmail,
      userId: testUserId,
      action: 'test_error'
    });
  };

  const testAuthEvent = () => {
    const mockSession = {
      user: {
        email: testEmail,
        id: testUserId
      }
    };
    logger.auth.event('TEST_SIGN_IN', mockSession);
  };

  const testAuthError = () => {
    const authError = new Error('Authentication failed - test error');
    logger.auth.error('Test authentication error', authError, {
      email: testEmail,
      attemptedAction: 'sign_in'
    });
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">🔒 Secure Logging System Test</h1>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">📋 Test Data (Will be masked in logs)</h2>
        <div className="space-y-2 font-mono text-sm">
          <div><strong>Email:</strong> {testEmail}</div>
          <div><strong>User ID:</strong> {testUserId}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">🔧 General Logging Tests</h2>
          
          <button
            onClick={testDebugLog}
            className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded transition-colors"
          >
            Test Debug Log (Dev only)
          </button>
          
          <button
            onClick={testInfoLog}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
          >
            Test Info Log (Dev only)
          </button>
          
          <button
            onClick={testWarningLog}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded transition-colors"
          >
            Test Warning Log (Always logged)
          </button>
          
          <button
            onClick={testErrorLog}
            className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-colors"
          >
            Test Error Log (→ Sentry)
          </button>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">🔐 Auth Logging Tests</h2>
          
          <button
            onClick={testAuthEvent}
            className="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition-colors"
          >
            Test Auth Event (Masked PII)
          </button>
          
          <button
            onClick={testAuthError}
            className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
          >
            Test Auth Error (→ Sentry)
          </button>
        </div>
      </div>

      <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">✅ What to Check</h2>
        <div className="space-y-2 text-sm">
          <div><strong>Development Console:</strong> Debug/Info logs visible with masked PII</div>
          <div><strong>Production Console:</strong> Only warnings and errors visible</div>
          <div><strong>Sentry Dashboard:</strong> Errors and breadcrumbs (no PII)</div>
          <div><strong>Email Masking:</strong> user@example.com → us***@example.com</div>
          <div><strong>ID Masking:</strong> uuid-1234... → uuid-123...</div>
        </div>
      </div>

      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">🎯 Environment Behavior</h2>
        <div className="text-sm">
          <div><strong>Current Environment:</strong> {process.env.NODE_ENV || 'development'}</div>
          <div className="mt-2">
            {process.env.NODE_ENV === 'production' ? (
              <span className="text-red-600">🔒 Production: Debug/Info logs suppressed, errors sent to Sentry</span>
            ) : (
              <span className="text-green-600">🔧 Development: All logs visible in console</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 
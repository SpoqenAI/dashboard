import { logger } from '@/lib/logger';

interface SendCallSummaryOptions {
  to: string;
  summary: string;
  phoneNumber?: string;
}

/**
 * sendCallSummaryEmail – dispatches a call-summary email via SendGrid.
 * Uses a dynamic import so the bundle doesn't include SendGrid code unless needed.
 */
export async function sendCallSummaryEmail({
  to,
  summary,
  phoneNumber,
}: SendCallSummaryOptions) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.SENDGRID_FROM_EMAIL;

  if (!apiKey || !from) {
    logger.error(
      'EMAIL',
      'Missing SENDGRID_API_KEY or SENDGRID_FROM_EMAIL env vars'
    );
    return;
  }

  // Dynamically import to keep initial bundle size small and avoid type-checking issues.
  const sgMailModule = await import('@sendgrid/mail');
  const sgMail = sgMailModule.default;
  sgMail.setApiKey(apiKey);

  const baseUrl = 'https://www.spoqen.com';

  const smallLogoUrl = `${baseUrl}/Spoqen.png`;
  const fullLogoUrl = `${baseUrl}/Spoqen-full.png`;
  const dashboardUrl = `${baseUrl}/dashboard`;

  // Dynamically import React, the SSR renderer, and the template – this keeps them out of
  // the default webpack bundle for route handlers, satisfying Next.js' server-component rules.
  const { default: React } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { default: CallSummaryEmail } = await import(
    '@/app/email-templates/call-summary'
  );

  const html = renderToStaticMarkup(
    React.createElement(CallSummaryEmail, {
      summary,
      phoneNumber,
      logoUrl: smallLogoUrl,
      fullLogoUrl,
      dashboardUrl,
    })
  );

  const msg = {
    to,
    from,
    subject: '[Spoqen] Call Summary',
    text: summary,
    html,
  };

  try {
    await sgMail.send(msg);
    logger.info('EMAIL', 'Call summary email sent successfully', { to });
  } catch (error) {
    logger.error('EMAIL', 'Failed to send call summary email', error as Error, {
      to,
    });
  }
}

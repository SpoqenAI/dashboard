import { logger } from '@/lib/logger';

interface SendCallSummaryOptions {
  to: string;
  summary: string;
}

/**
 * sendCallSummaryEmail – dispatches a call-summary email via SendGrid.
 * Uses a dynamic import so the bundle doesn't include SendGrid code unless needed.
 */
export async function sendCallSummaryEmail({
  to,
  summary,
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

  // Utility: escape HTML entities to prevent XSS when injecting user-generated text
  function escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  const msg = {
    to,
    from,
    subject: 'Your AI Receptionist – Call Summary',
    text: summary,
    html: `<p>${escapeHtml(summary).replace(/\n/g, '<br/>')}</p>`,
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

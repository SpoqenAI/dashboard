import { NextResponse } from 'next/server';
import { validatePaddleConfiguration } from '@/lib/config';

export async function GET() {
  try {
    const config = validatePaddleConfiguration();

    // Calculate webhook URL
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const webhookUrl = siteUrl
      ? `${siteUrl}/api/webhooks/paddle`
      : 'Not configured';

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      configuration: {
        ...config,
        webhookUrl,
        priceIdMapping: {
          pri_01k0adkgfd9m6fep0prj9gc0sb: 'Starter Monthly',
          pri_01k0admysy9c1xxxq8g5ajfcqv: 'Starter Annual',
          pri_01k0aeaa5te9q80a7rvpapyw4k: 'Pro Monthly',
          pri_01k0aee7p0yvcp733ps17sr9g8: 'Pro Annual',
        },
      },
      instructions: {
        webhookSetup: 'Configure this webhook URL in your Paddle dashboard',
        ngrokNote:
          'If using ngrok, ensure the tunnel is active and URL matches NEXT_PUBLIC_SITE_URL',
        testing: 'Visit /api/webhooks/paddle with GET request to test endpoint',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Configuration validation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

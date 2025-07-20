import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    // Check environment variables
    const envCheck = {
      hasPaddleWebhookSecret: !!process.env.PADDLE_WEBHOOK_SECRET,
      hasPaddleApiKey: !!process.env.PADDLE_API_KEY,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasSupabaseServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      nodeEnv: process.env.NODE_ENV,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    };

    // Test basic database connection
    let dbConnectionTest = 'Not tested';
    try {
      const { createSupabaseAdmin } = await import('@/lib/supabase/admin');
      const supabase = createSupabaseAdmin();

      // Simple query to test connection
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);

      if (error) {
        dbConnectionTest = `Database error: ${error.message}`;
      } else {
        dbConnectionTest = 'Database connection successful';
      }
    } catch (dbError) {
      dbConnectionTest = `Database connection failed: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`;
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: envCheck,
      databaseTest: dbConnectionTest,
      message: 'Webhook environment check completed',
    });
  } catch (error) {
    logger.error(
      'WEBHOOK_TEST',
      'Error in webhook test endpoint',
      error instanceof Error ? error : new Error(String(error))
    );

    return NextResponse.json(
      {
        error: 'Webhook test failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

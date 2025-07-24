import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import * as Sentry from '@sentry/nextjs';
import { emailCheckLimiter } from '@/lib/redis/rate-limiter';

const EMAIL_REGEX =
  /^[a-zA-Z0-9]([a-zA-Z0-9._+-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/;

// GET /api/check-email-exists?email=foo%40bar.com
export async function GET(req: NextRequest) {
  // Apply rate limiting per IP
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  const { success, remaining, reset } = await emailCheckLimiter.limit(ip);

  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json(
      { error: 'Missing "email" query parameter' },
      { status: 400 }
    );
  }

  const trimmed = email.trim().toLowerCase();
  if (trimmed.length > 254 || !EMAIL_REGEX.test(trimmed)) {
    return NextResponse.json({ exists: false });
  }

  try {
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', trimmed)
      .maybeSingle();

    if (error) {
      Sentry.captureException(error);
      console.error('Supabase error while checking email', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ exists: data !== null });
  } catch (err: any) {
    Sentry.captureException(err);
    console.error('Unexpected error while checking email', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getMetrics } from '@/lib/vapi/getDashboardMetrics';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  if (!from || !to) {
    return NextResponse.json(
      { error: 'Missing from or to parameters' },
      { status: 400 }
    );
  }

  try {
    const metrics = await getMetrics(from, to);
    return NextResponse.json({ metrics });
  } catch (error) {
    logger.error('VAPI', 'Failed to fetch dashboard metrics', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard metrics' },
      { status: 500 }
    );
  }
}

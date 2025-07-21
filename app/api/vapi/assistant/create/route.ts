import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// POST /api/vapi/assistant/create
// DEPRECATED: Assistant creation is now handled server-side via email verification
export async function POST(req: NextRequest) {
  logger.warn(
    'VAPI_ASSISTANT_CREATE_API',
    'Deprecated assistant creation endpoint called',
    { userAgent: req.headers.get('user-agent') }
  );

  return NextResponse.json(
    { 
      error: 'Assistant creation endpoint deprecated. Assistants are now created automatically upon email verification.'
    },
    { status: 410 } // Gone
  );
}

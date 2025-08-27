import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { pusher } from '@/lib/pusher';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    // Accept both JSON and x-www-form-urlencoded bodies from Pusher
    const contentType = (req.headers.get('content-type') || '').toLowerCase();
    let socket_id: string | undefined;
    let channel_name: string | undefined;

    if (contentType.includes('application/json')) {
      try {
        const body = await req.json();
        socket_id = body?.socket_id;
        channel_name = body?.channel_name;
      } catch (e) {
        // Fall through to try form parsing
      }
    }

    if (!socket_id || !channel_name) {
      try {
        const form = await req.formData();
        const sid = form.get('socket_id');
        const ch = form.get('channel_name');
        socket_id = typeof sid === 'string' ? sid : undefined;
        channel_name = typeof ch === 'string' ? ch : undefined;
      } catch (e) {
        // Ignore; validation below will handle missing values
      }
    }

    // Validate required parameters
    if (!socket_id || !channel_name) {
      logger.warn('PUSHER_AUTH', 'Missing required parameters', {
        hasSocketId: !!socket_id,
        hasChannelName: !!channel_name,
        contentType,
      });
      return new NextResponse('Missing required parameters', { status: 400 });
    }

    // Validate channel name format for private user channels (strict UUID v4/v5 validation)
    const privateChannelPattern =
      /^private-user-[0-9a-f]{8}-[0-9a-f]{4}-[45][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!privateChannelPattern.test(channel_name)) {
      logger.warn(
        'PUSHER_AUTH',
        'Invalid channel name format - must be private-user-<uuid-v4-or-v5>',
        {
          channelName: channel_name,
        }
      );
      return new NextResponse('Invalid channel name', { status: 400 });
    }

    // Extract user ID from channel name
    const userId = channel_name.replace('private-user-', '');
    if (!userId) {
      logger.warn(
        'PUSHER_AUTH',
        'Could not extract user ID from channel name',
        {
          channelName: channel_name,
        }
      );
      return new NextResponse('Invalid channel name', { status: 400 });
    }

    // Get current user session (server-side)
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          // No-ops for route handlers; we only need reads here
          set() {},
          remove() {},
        },
      }
    );
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.warn('PUSHER_AUTH', 'Authentication failed', {
        error: authError?.message,
        hasUser: !!user,
      });
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Verify the user is requesting access to their own channel
    if (user.id !== userId) {
      logger.warn(
        'PUSHER_AUTH',
        "User attempted to access another user's channel",
        {
          requestedUserId: logger.maskUserId(userId),
          authenticatedUserId: logger.maskUserId(user.id),
        }
      );
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Generate Pusher auth response
    const authResponse = pusher.authorizeChannel(socket_id, channel_name);

    logger.info('PUSHER_AUTH', 'Successfully authorized private channel', {
      userId: logger.maskUserId(userId),
      channelName: channel_name,
    });

    return NextResponse.json(authResponse);
  } catch (error) {
    logger.error(
      'PUSHER_AUTH',
      'Failed to authorize Pusher channel',
      error as Error
    );
    return new NextResponse('Internal server error', { status: 500 });
  }
}

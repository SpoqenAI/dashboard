import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase/client';
import { pusher } from '@/lib/pusher';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const { socket_id, channel_name } = await req.json();

    // Validate required parameters
    if (!socket_id || !channel_name) {
      logger.warn('PUSHER_AUTH', 'Missing required parameters', {
        hasSocketId: !!socket_id,
        hasChannelName: !!channel_name,
      });
      return new NextResponse('Missing required parameters', { status: 400 });
    }

    // Validate channel name format for private user channels
    const privateChannelPattern = /^private-user-[a-f0-9-]+$/;
    if (!privateChannelPattern.test(channel_name)) {
      logger.warn('PUSHER_AUTH', 'Invalid channel name format', {
        channelName: channel_name,
      });
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

    // Get current user session
    const supabase = getSupabaseClient();
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

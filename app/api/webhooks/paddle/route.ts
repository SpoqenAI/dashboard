'use server';

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { ProcessWebhook } from '@/utils/paddle/process-webhook';
import { getPaddleServerInstance } from '@/utils/paddle/get-paddle-instance';

const webhookProcessor = new ProcessWebhook();

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('paddle-signature') || '';
    const rawRequestBody = await request.text();
    const privateKey = process.env.PADDLE_WEBHOOK_SECRET || '';

    if (!signature || !rawRequestBody) {
      logger.warn('PADDLE_WEBHOOK', 'Missing signature from header');
      return NextResponse.json({ error: 'Missing signature from header' }, { status: 400 });
    }

    if (!privateKey) {
      logger.warn('PADDLE_WEBHOOK', 'Missing webhook secret');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    const paddle = getPaddleServerInstance();
    const eventData = await paddle.webhooks.unmarshal(rawRequestBody, privateKey, signature);
    const eventName = eventData?.eventType ?? 'Unknown event';

    logger.info('PADDLE_WEBHOOK', 'Webhook received', {
      eventType: eventName,
      eventId: eventData?.eventId,
    });

    if (eventData) {
      await webhookProcessor.processEvent(eventData);
      
      logger.info('PADDLE_WEBHOOK', 'Webhook processed successfully', {
        eventType: eventName,
        eventId: eventData?.eventId,
      });
    }

    return NextResponse.json({ 
      success: true,
      status: 200, 
      eventName,
      message: 'Webhook processed successfully'
    });

  } catch (error) {
    logger.error(
      'PADDLE_WEBHOOK',
      'Webhook processing failed',
      error instanceof Error ? error : new Error(String(error))
    );

    return NextResponse.json({ 
      error: 'Internal server error',
      message: 'Failed to process webhook'
    }, { status: 500 });
  }
}

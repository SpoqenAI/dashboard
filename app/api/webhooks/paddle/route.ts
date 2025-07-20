'use server';

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { ProcessWebhook } from '@/utils/paddle/process-webhook';
import { getPaddleServerInstance } from '@/utils/paddle/get-paddle-instance';

const webhookProcessor = new ProcessWebhook();

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const signature = request.headers.get('paddle-signature') || '';
    const rawRequestBody = await request.text();
    const privateKey = process.env.PADDLE_WEBHOOK_SECRET || '';

    // Enhanced logging for debugging
    logger.info('PADDLE_WEBHOOK', 'Webhook request received', {
      hasSignature: !!signature,
      bodyLength: rawRequestBody.length,
      hasSecret: !!privateKey,
      headers: {
        'content-type': request.headers.get('content-type'),
        'user-agent': request.headers.get('user-agent'),
      },
    });

    if (!signature || !rawRequestBody) {
      logger.warn('PADDLE_WEBHOOK', 'Missing signature from header', {
        hasSignature: !!signature,
        hasBody: !!rawRequestBody,
        bodyPreview: rawRequestBody.substring(0, 100),
      });
      return NextResponse.json(
        { error: 'Missing signature from header' },
        { status: 400 }
      );
    }

    if (!privateKey) {
      logger.warn('PADDLE_WEBHOOK', 'Missing webhook secret');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    const paddle = getPaddleServerInstance();
    const eventData = await paddle.webhooks.unmarshal(
      rawRequestBody,
      privateKey,
      signature
    );
    const eventName = eventData?.eventType ?? 'Unknown event';

    logger.info('PADDLE_WEBHOOK', 'Webhook received and verified', {
      eventType: eventName,
      eventId: eventData?.eventId,
      dataKeys: eventData ? Object.keys(eventData) : [],
    });

    if (eventData) {
      await webhookProcessor.processEvent(eventData);

      logger.info('PADDLE_WEBHOOK', 'Webhook processed successfully', {
        eventType: eventName,
        eventId: eventData?.eventId,
        processingTimeMs: Date.now() - startTime,
      });
    }

    return NextResponse.json({
      success: true,
      status: 200,
      eventName,
      message: 'Webhook processed successfully',
      processingTimeMs: Date.now() - startTime,
    });
  } catch (error) {
    const processingTimeMs = Date.now() - startTime;

    logger.error(
      'PADDLE_WEBHOOK',
      'Webhook processing failed',
      error instanceof Error ? error : new Error(String(error)),
      {
        processingTimeMs,
        errorType:
          error instanceof Error ? error.constructor.name : typeof error,
      }
    );

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to process webhook',
        processingTimeMs,
      },
      { status: 500 }
    );
  }
}

// Add GET endpoint for webhook URL verification
export async function GET() {
  return NextResponse.json({
    message: 'Paddle webhook endpoint is active',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    hasWebhookSecret: !!process.env.PADDLE_WEBHOOK_SECRET,
  });
}

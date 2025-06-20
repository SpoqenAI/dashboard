import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  logger.debug('VAPI_WEBHOOK', 'Vapi webhook received', {
    method: req.method,
    hasSignature: !!req.headers.get('x-vapi-signature'),
  });

  // 1. Security: Validate Vapi Signature
  const signature = req.headers.get('x-vapi-signature');
  const requestBody = await req.text(); // Read the body as raw text
  const secret = process.env.VAPI_WEBHOOK_SECRET;

  if (!secret || !signature) {
    logger.error('VAPI_WEBHOOK', 'Vapi webhook secret or signature is missing', undefined, {
      hasSecret: !!secret,
      hasSignature: !!signature,
    });
    return new NextResponse('Configuration error.', { status: 500 });
  }

  // Validate the signature
  const hash = crypto.createHmac('sha256', secret).update(requestBody).digest('hex');

  if (hash !== signature) {
    logger.warn('VAPI_WEBHOOK', 'Invalid Vapi webhook signature', {
      expectedPrefix: hash.slice(0, 8),
      receivedPrefix: signature.slice(0, 8),
    });
    return new NextResponse('Invalid signature.', { status: 401 });
  }

  // 2. Process the message
  try {
    const message = JSON.parse(requestBody);
    
    logger.info('VAPI_WEBHOOK', 'Received Vapi webhook', {
      type: message.type,
      callId: message.call?.id,
      assistantId: message.assistant?.id,
      timestamp: new Date().toISOString(),
    });

    // Handle different message types
    switch (message.type) {
      case 'call-start':
        logger.info('VAPI_WEBHOOK', 'Call started', {
          callId: message.call?.id,
          assistantId: message.assistant?.id,
          phoneNumber: message.call?.phoneNumber,
        });
        break;

      case 'call-end':
        logger.info('VAPI_WEBHOOK', 'Call ended', {
          callId: message.call?.id,
          assistantId: message.assistant?.id,
          duration: message.call?.endedReason,
          endReason: message.call?.endedReason,
        });
        break;

      case 'end-of-call-report':
        logger.info('VAPI_WEBHOOK', 'End of call report received', {
          callId: message.call?.id,
          assistantId: message.assistant?.id,
          duration: message.call?.duration,
          cost: message.call?.cost,
          transcript: message.transcript ? 'Present' : 'Not available',
        });

        // TODO: Store call data in database for analytics
        // You can add database storage logic here to track calls, transcripts, etc.
        break;

      case 'function-call':
        logger.info('VAPI_WEBHOOK', 'Function call received', {
          callId: message.call?.id,
          functionName: message.functionCall?.name,
          parameters: message.functionCall?.parameters ? 'Present' : 'None',
        });
        break;

      case 'speech-update':
        logger.debug('VAPI_WEBHOOK', 'Speech update received', {
          callId: message.call?.id,
          role: message.role,
          transcript: message.transcript ? 'Present' : 'None',
        });
        break;

      case 'hang':
        logger.info('VAPI_WEBHOOK', 'Call hang detected', {
          callId: message.call?.id,
        });
        break;

      default:
        logger.info('VAPI_WEBHOOK', 'Unknown Vapi webhook type', {
          type: message.type,
          callId: message.call?.id,
        });
        break;
    }

    // For function calls, you might want to return a response
    if (message.type === 'function-call') {
      // Example response for function calls
      return NextResponse.json({
        result: 'Function call processed successfully',
        // Add any function-specific response data here
      });
    }

  } catch (error) {
    logger.error(
      'VAPI_WEBHOOK',
      'Error processing Vapi webhook body',
      error instanceof Error ? error : new Error(String(error)),
      {
        bodyLength: requestBody.length,
      }
    );
    return new NextResponse('Invalid request body.', { status: 400 });
  }

  // 3. Acknowledge receipt
  return new NextResponse(null, { status: 200 });
} 
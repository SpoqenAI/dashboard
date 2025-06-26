import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { configureActionPointsAnalysis, isActionPointsAnalysisConfigured } from '@/lib/vapi/configure-action-points';

export async function POST(request: NextRequest) {
  try {
    const { assistantId } = await request.json();

    if (!assistantId) {
      return NextResponse.json(
        { error: 'Assistant ID is required' },
        { status: 400 }
      );
    }

    logger.debug('VAPI', 'Configuring assistant for action points analysis', {
      assistantId,
    });

    await configureActionPointsAnalysis(assistantId);

    return NextResponse.json({
      success: true,
      message: 'Assistant configured for action points analysis',
      assistantId,
    });
  } catch (error) {
    logger.error('VAPI', 'Failed to configure action points analysis', error as Error);
    return NextResponse.json(
      { error: 'Failed to configure assistant' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const assistantId = url.searchParams.get('assistantId');

    if (!assistantId) {
      return NextResponse.json(
        { error: 'Assistant ID is required' },
        { status: 400 }
      );
    }

    logger.debug('VAPI', 'Checking action points analysis configuration', {
      assistantId,
    });

    const isConfigured = await isActionPointsAnalysisConfigured(assistantId);

    return NextResponse.json({
      assistantId,
      isConfigured,
    });
  } catch (error) {
    logger.error('VAPI', 'Failed to check action points analysis configuration', error as Error);
    return NextResponse.json(
      { error: 'Failed to check configuration' },
      { status: 500 }
    );
  }
} 
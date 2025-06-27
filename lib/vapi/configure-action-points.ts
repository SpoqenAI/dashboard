import { updateAssistant, getAssistant } from '@/src/lib/vapi/assistant';
import { ACTION_POINTS_ANALYSIS_PLAN } from './analysis-config';
import { logger } from '@/lib/logger';

/**
 * Configures a Vapi assistant to extract action points using Vapi's built-in analysis
 * @param assistantId - The ID of the assistant to configure
 * @param token - Optional VAPI API token
 * @returns Promise that resolves when configuration is complete
 */
export async function configureActionPointsAnalysis(
  assistantId: string,
  token?: string
): Promise<void> {
  try {
    logger.debug('VAPI', 'Configuring assistant for action points analysis', {
      assistantId,
    });

    await updateAssistant(
      assistantId,
      {
        analysisPlan: ACTION_POINTS_ANALYSIS_PLAN,
      },
      token
    );

    logger.debug('VAPI', 'Successfully configured action points analysis', {
      assistantId,
    });
  } catch (error) {
    logger.error(
      'VAPI',
      'Failed to configure action points analysis',
      error as Error,
      {
        assistantId,
      }
    );
    throw error;
  }
}

/**
 * Checks if an assistant is configured for action points analysis
 * @param assistantId - The ID of the assistant to check
 * @param token - Optional VAPI API token
 * @returns Promise that resolves to true if configured, false otherwise
 */
export async function isActionPointsAnalysisConfigured(
  assistantId: string,
  token?: string
): Promise<boolean> {
  try {
    const assistant = await getAssistant(assistantId, token);

    return !!(
      assistant.analysisPlan?.structuredDataSchema?.properties?.callPurpose &&
      assistant.analysisPlan?.structuredDataSchema?.properties?.sentiment &&
      assistant.analysisPlan?.structuredDataSchema?.properties?.keyPoints
    );
  } catch (error) {
    logger.error(
      'VAPI',
      'Failed to check action points analysis configuration',
      error as Error,
      {
        assistantId,
      }
    );
    return false;
  }
}

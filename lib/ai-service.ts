import OpenAI from 'openai';
import { logger } from '@/lib/logger';
import { ActionPoints } from '@/lib/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Re-export the type for convenience
export type { ActionPoints };

export async function extractActionPoints(
  transcript?: string,
  summary?: string
): Promise<ActionPoints> {
  if (!process.env.OPENAI_API_KEY) {
    logger.warn(
      'AI',
      'OpenAI API key not configured, returning empty action points'
    );
    return {
      keyPoints: [],
      followUpItems: [],
      urgentConcerns: [],
      sentiment: 'neutral',
      callPurpose: 'Unknown',
    };
  }

  if (!transcript && !summary) {
    logger.warn(
      'AI',
      'No transcript or summary provided for action point extraction'
    );
    return {
      keyPoints: [],
      followUpItems: [],
      urgentConcerns: [],
      sentiment: 'neutral',
      callPurpose: 'Unknown',
    };
  }

  try {
    const content = transcript || summary || '';

    const systemPrompt = `You are an AI assistant that analyzes call transcripts and summaries to extract key action points. 
    
Your task is to analyze the provided call content and extract:
1. Key discussion points (important topics discussed)
2. Follow-up items (actions that need to be taken)
3. Urgent concerns (time-sensitive or critical issues)
4. Overall sentiment of the call
5. The main purpose of the call

Please respond with a JSON object in this exact format:
{
  "keyPoints": ["point 1", "point 2", ...],
  "followUpItems": ["action 1", "action 2", ...],
  "urgentConcerns": ["concern 1", "concern 2", ...],
  "sentiment": "positive|neutral|negative",
  "callPurpose": "brief description of call purpose"
}

Guidelines:
- Keep each point concise but informative (1-2 sentences max)
- Focus on actionable items for follow-ups
- Only include urgent concerns if there are genuinely time-sensitive issues
- Determine sentiment based on overall tone and outcomes
- Be specific about the call purpose`;

    const userPrompt = `Please analyze this call content and extract action points:

${content}`;

    logger.debug('AI', 'Extracting action points from call content', {
      contentLength: content.length,
      hasTranscript: !!transcript,
      hasSummary: !!summary,
    });

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-nano', // Using the more cost-effective model for this task
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1000,
      temperature: 0.3, // Lower temperature for more consistent extraction
      response_format: { type: 'json_object' },
    });

    const result = response.choices[0].message.content;
    if (!result) {
      throw new Error('No response from OpenAI');
    }

    const actionPoints = JSON.parse(result) as ActionPoints;

    // Validate the response structure
    if (!actionPoints.keyPoints || !Array.isArray(actionPoints.keyPoints)) {
      actionPoints.keyPoints = [];
    }
    if (
      !actionPoints.followUpItems ||
      !Array.isArray(actionPoints.followUpItems)
    ) {
      actionPoints.followUpItems = [];
    }
    if (
      !actionPoints.urgentConcerns ||
      !Array.isArray(actionPoints.urgentConcerns)
    ) {
      actionPoints.urgentConcerns = [];
    }
    if (!actionPoints.sentiment) {
      actionPoints.sentiment = 'neutral';
    }
    if (!actionPoints.callPurpose) {
      actionPoints.callPurpose = 'General inquiry';
    }

    logger.debug('AI', 'Successfully extracted action points', {
      keyPointsCount: actionPoints.keyPoints.length,
      followUpItemsCount: actionPoints.followUpItems.length,
      urgentConcernsCount: actionPoints.urgentConcerns.length,
      sentiment: actionPoints.sentiment,
      callPurpose: actionPoints.callPurpose,
    });

    return actionPoints;
  } catch (error) {
    logger.error('AI', 'Failed to extract action points', error as Error);

    // Return a fallback response
    return {
      keyPoints: summary ? [summary] : [],
      followUpItems: [],
      urgentConcerns: [],
      sentiment: 'neutral',
      callPurpose: 'Analysis unavailable',
    };
  }
}

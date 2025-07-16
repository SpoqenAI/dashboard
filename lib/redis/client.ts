import { Redis } from '@upstash/redis';
import { logger } from '@/lib/logger';

// Redis client instance for call analysis data
let redisClient: Redis | null = null;

export function createRedisClient(): Redis {
  if (!redisClient) {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!redisUrl || !redisToken) {
      throw new Error('Missing required Upstash Redis environment variables');
    }

    redisClient = new Redis({
      url: redisUrl,
      token: redisToken,
    });

    logger.info('REDIS', 'Redis client initialized for call analysis storage');
  }

  return redisClient;
}

// Call analysis data structure
export interface CallAnalysisData {
  callId: string;
  userId: string;
  assistantId: string;
  analyzedAt: string;
  vapiAnalysis: {
    summary?: string;
    structuredData?: {
      sentiment?: 'positive' | 'negative' | 'neutral';
      leadQuality?: 'hot' | 'warm' | 'cold';
      callPurpose?: string;
      keyPoints?: string[];
      followUpItems?: string[];
      urgentConcerns?: string[];
      appointmentRequested?: boolean;
      timeline?: string;
      contactPreference?: string;
      businessInterest?: string;
      [key: string]: any; // Allow for additional VAPI fields
    };
    successEvaluation?: any;
  };
}

// Redis key generators
export const RedisKeys = {
  callAnalysis: (userId: string, callId: string) => `call_analysis:${userId}:${callId}`,
  userCalls: (userId: string) => `user_calls:${userId}`,
  callMetadata: (callId: string) => `call_metadata:${callId}`,
} as const;

// Store call analysis data in Redis
export async function storeCallAnalysis(data: CallAnalysisData): Promise<void> {
  try {
    const redis = createRedisClient();
    const key = RedisKeys.callAnalysis(data.userId, data.callId);
    
    // Store the analysis data
    await redis.setex(key, 60 * 60 * 24 * 90, JSON.stringify(data)); // 90 days TTL
    
    // Add to user's call set with timestamp score for sorting
    const timestamp = new Date(data.analyzedAt).getTime();
    await redis.zadd(RedisKeys.userCalls(data.userId), { score: timestamp, member: data.callId });
    
    logger.info('REDIS', 'Call analysis stored successfully', { 
      callId: data.callId, 
      userId: logger.maskUserId(data.userId) 
    });
  } catch (error) {
    logger.error('REDIS', 'Failed to store call analysis', error as Error, {
      callId: data.callId,
      userId: logger.maskUserId(data.userId),
    });
    throw error;
  }
}

// Retrieve call analysis data from Redis
export async function getCallAnalysis(userId: string, callId: string): Promise<CallAnalysisData | null> {
  try {
    const redis = createRedisClient();
    const key = RedisKeys.callAnalysis(userId, callId);
    
    const data = await redis.get(key);
    if (!data) {
      return null;
    }
    
    // Upstash Redis client auto-parses JSON, so data might already be an object
    if (typeof data === 'string') {
      return JSON.parse(data) as CallAnalysisData;
    } else {
      return data as CallAnalysisData;
    }
  } catch (error) {
    logger.error('REDIS', 'Failed to retrieve call analysis', error as Error, {
      callId,
      userId: logger.maskUserId(userId),
    });
    return null;
  }
}

// Get user's recent call analysis data
export async function getUserCallAnalyses(
  userId: string, 
  limit = 100,
  offset = 0
): Promise<CallAnalysisData[]> {
  try {
    const redis = createRedisClient();
    const userCallsKey = RedisKeys.userCalls(userId);
    
    // Get call IDs sorted by timestamp (newest first)
    const callIds = await redis.zrange(userCallsKey, offset, offset + limit - 1, { rev: true });
    
    if (!callIds || callIds.length === 0) {
      return [];
    }
    
    // Fetch analysis data for each call
    const analyses: CallAnalysisData[] = [];
    for (const callId of callIds as string[]) {
      const analysis = await getCallAnalysis(userId, callId);
      if (analysis) {
        analyses.push(analysis);
      }
    }
    
    return analyses;
  } catch (error) {
    logger.error('REDIS', 'Failed to retrieve user call analyses', error as Error, {
      userId: logger.maskUserId(userId),
    });
    return [];
  }
}

// Check if call analysis exists
export async function hasCallAnalysis(userId: string, callId: string): Promise<boolean> {
  try {
    const redis = createRedisClient();
    const key = RedisKeys.callAnalysis(userId, callId);
    
    const exists = await redis.exists(key);
    return exists === 1;
  } catch (error) {
    logger.error('REDIS', 'Failed to check call analysis existence', error as Error, {
      callId,
      userId: logger.maskUserId(userId),
    });
    return false;
  }
}

// Delete call analysis (for cleanup)
export async function deleteCallAnalysis(userId: string, callId: string): Promise<void> {
  try {
    const redis = createRedisClient();
    const analysisKey = RedisKeys.callAnalysis(userId, callId);
    const userCallsKey = RedisKeys.userCalls(userId);
    
    // Delete analysis data
    await redis.del(analysisKey);
    
    // Remove from user's call set
    await redis.zrem(userCallsKey, callId);
    
    logger.info('REDIS', 'Call analysis deleted successfully', {
      callId,
      userId: logger.maskUserId(userId),
    });
  } catch (error) {
    logger.error('REDIS', 'Failed to delete call analysis', error as Error, {
      callId,
      userId: logger.maskUserId(userId),
    });
    throw error;
  }
} 
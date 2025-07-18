// Types for VAPI integration and dashboard analytics

export interface VapiCall {
  id: string;
  phoneNumber?: {
    number: string;
  };
  callerName?: string;
  status: string;
  endedReason: string;
  durationSeconds: number;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  cost?: number;
  transcript?: string;
  summary?: string;
  recordingUrl?: string;
  analysis?: {
    summary?: string;
    sentiment?: 'positive' | 'neutral' | 'negative';
    leadQuality?: 'hot' | 'warm' | 'cold';
    successEvaluation?: any;
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
      [key: string]: any;
    };
    actionPoints?: string[];
  };
  /**
   * Full structured AI-generated action points for this call.
   * Populated client-side after requesting `/api/vapi/action-points`.
   */
  actionPoints?: ActionPoints;
}

export interface ActionPoints {
  callPurpose?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  keyPoints?: string[];
  followUpItems?: string[];
  urgentConcerns?: string[];
  callAnalysis?: {
    leadQuality: 'hot' | 'warm' | 'cold';
    appointmentRequested: boolean;
    propertyInterest?: string;
    budget?: string;
    timeline?: string;
    contactPreference?: string;
  };
}

export interface CallMetrics {
  totalCalls: number;
  answeredCalls: number;
  missedCalls: number;
  avgDuration: number;
  totalCost: number;
  avgCost: number;
  callsByHour: { hour: number; count: number }[];
  callsByDay: { day: string; count: number }[];
  sentimentDistribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
  leadQualityDistribution: { hot: number; warm: number; cold: number };
}

export interface DashboardAnalytics {
  metrics: CallMetrics;
  recentCalls: VapiCall[];
  trends: {
    callVolumeTrend: 'up' | 'down' | 'stable';
    avgDurationTrend: 'up' | 'down' | 'stable';
    costTrend: 'up' | 'down' | 'stable';
  };
}

export interface ActionPoints {
  keyPoints: string[];
  followUpItems: string[];
  urgentConcerns: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  callPurpose: string;
}

export interface VapiCall {
  id: string;
  type?: string;
  status: string;
  endedReason: string;
  createdAt: string;
  updatedAt?: string;
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  durationSeconds: number;
  cost?: number;
  costBreakdown?: {
    transport?: number;
    stt?: number;
    llm?: number;
    tts?: number;
    vapi?: number;
    total?: number;
  };
  messages?: Array<{
    role: string;
    message: string;
    time: number;
    endTime: number;
    secondsFromStart: number;
  }>;
  phoneNumber?: string;
  customer?: {
    number: string;
  };
  analysis?: {
    summary?: string;
    structuredData?: any;
  };
  transcript?: string;
  summary?: string;
  keyPoints?: string[];
  followUpItems?: string[];
  urgentConcerns?: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
  callPurpose?: string;
} 
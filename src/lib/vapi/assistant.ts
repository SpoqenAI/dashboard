import { retry } from '@/src/lib/utils/retry';

export interface AssistantDTO {
  firstMessage?: string;
  systemPrompt?: string;
  voice?: { provider: string; voiceId: string };
  analysisPlan?: {
    summaryPrompt?: string;
    structuredDataPrompt?: string;
    structuredDataSchema?: object;
    successEvaluationPrompt?: string;
    successEvaluationRubric?: string;
  };
}

export class UpdateAssistantError extends Error {
  status: number;
  body: any;

  constructor(status: number, body: any) {
    super(`Failed to update assistant: ${status}`);
    this.status = status;
    this.body = body;
    Object.setPrototypeOf(this, UpdateAssistantError.prototype);
  }
}

const baseUrl = process.env.VAPI_API_URL || 'https://api.vapi.ai';

export async function getAssistant(
  id: string,
  token = process.env.VAPI_PRIVATE_KEY
) {
  if (!token) {
    throw new Error('VAPI token not provided');
  }

  const url = new URL(`/assistant/${id}`, baseUrl);

  const res = await retry(() =>
    fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'User-Agent': 'spoqen-dashboard/1.0',
      },
      signal: AbortSignal.timeout(10000),
    })
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch assistant: ${res.status}`);
  }

  return res.json();
}

export async function updateAssistant(
  id: string,
  dto: AssistantDTO,
  token = process.env.VAPI_PRIVATE_KEY
) {
  if (!token) {
    throw new Error('VAPI token not provided');
  }

  const url = new URL(`/assistant/${id}`, baseUrl);
  const body: any = {};

  if (dto.firstMessage !== undefined) {
    body.firstMessage = dto.firstMessage;
  }
  if (dto.voice) {
    body.voice = dto.voice;
  }
  if (dto.systemPrompt !== undefined) {
    body.model = {
      provider: 'openai',
      model: 'gpt-4o',
      messages: [{ role: 'system', content: dto.systemPrompt }],
    };
  }
  if (dto.analysisPlan !== undefined) {
    body.analysisPlan = dto.analysisPlan;
  }

  const res = await retry(() =>
    fetch(url.toString(), {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'spoqen-dashboard/1.0',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    })
  );

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new UpdateAssistantError(res.status, json);
  }

  return json;
}

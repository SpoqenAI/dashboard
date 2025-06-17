import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  return new Response('Method not allowed', { status: 405 });
}

export async function POST(request: Request) {
  try {
    const { limit = 5 } = await request.json();
    const apiKey =
      process.env.VAPI_API_KEY ||
      process.env.VAPI_PRIVATE_KEY ||
      process.env.VAPI_PUBLIC_KEY;

    if (!apiKey) {
      console.error('VAPI API key not configured');
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const body = {
      queries: [
        {
          table: 'call',
          name: 'recent',
          operations: [
            { operation: 'list', limit },
          ],
        },
      ],
    };

    const res = await fetch('https://api.vapi.ai/analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('VAPI API error', res.status, errorText);
      return NextResponse.json({ error: 'VAPI request failed' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected error calling VAPI', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

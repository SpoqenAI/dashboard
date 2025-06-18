// Run with: npx tsx __tests__/vapi-assistant.test.ts
import { updateAssistant, UpdateAssistantError } from '../src/lib/vapi/assistant';

class TestRunner {
  private tests: Array<{ name: string; fn: () => Promise<void> | void }> = [];
  private currentSuite = '';

  describe(name: string, fn: () => void) {
    this.currentSuite = name;
    console.log(`\n📋 ${name}`);
    fn();
  }

  it(name: string, fn: () => Promise<void> | void) {
    this.tests.push({ name: `${this.currentSuite} - ${name}`, fn });
  }

  expect(actual: any) {
    return {
      toBe: (expected: any) => {
        if (actual !== expected) {
          throw new Error(`Expected ${expected}, but got ${actual}`);
        }
      },
      toEqual: (expected: any) => {
        const a = JSON.stringify(actual);
        const b = JSON.stringify(expected);
        if (a !== b) {
          throw new Error(`Expected ${b}, but got ${a}`);
        }
      },
      toBeInstanceOf: (expected: any) => {
        if (!(actual instanceof expected)) {
          throw new Error(`Expected instance of ${expected.name}`);
        }
      },
    };
  }

  async run() {
    let passed = 0;
    let failed = 0;

    for (const test of this.tests) {
      try {
        await test.fn();
        console.log(`  ✅ ${test.name.split(' - ')[1]}`);
        passed++;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.log(`  ❌ ${test.name.split(' - ')[1]}: ${message}`);
        failed++;
      }
    }

    console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
  }
}

const runner = new TestRunner();

runner.describe('updateAssistant', () => {
  runner.it('sends only provided fields and returns response', async () => {
    const originalFetch = global.fetch;
    let received: any = {};
    global.fetch = async (url: any, options: any) => {
      received = { url, options };
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    };

    const dto = {
      firstMessage: 'hi',
      systemPrompt: 'be nice',
      voice: { provider: 'azure', voiceId: '123' },
    };

    const res = await updateAssistant('abc', dto, 'token');

    runner.expect(received.url.includes('/assistant/abc')).toBe(true);
    runner.expect(received.options.method).toBe('PATCH');
    const body = JSON.parse(received.options.body);
    runner.expect(body).toEqual({
      firstMessage: 'hi',
      voice: { provider: 'azure', voiceId: '123' },
      model: {
        provider: 'openai',
        model: 'gpt-4o',
        messages: [{ role: 'system', content: 'be nice' }],
      },
    });
    runner.expect(res).toEqual({ ok: true });

    global.fetch = originalFetch;
  });

  runner.it('throws UpdateAssistantError on non-2xx', async () => {
    const originalFetch = global.fetch;
    global.fetch = async () =>
      new Response(JSON.stringify({ error: 'bad' }), { status: 400 });

    let caught: any;
    try {
      await updateAssistant('abc', {}, 'token');
    } catch (e) {
      caught = e;
    }

    runner.expect(caught).toBeInstanceOf(UpdateAssistantError);
    runner.expect((caught as UpdateAssistantError).status).toBe(400);
    runner.expect((caught as UpdateAssistantError).body).toEqual({ error: 'bad' });

    global.fetch = originalFetch;
  });
});

runner.run();

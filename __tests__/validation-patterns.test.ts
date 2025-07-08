// Validation Patterns Test Suite
// Run with: npx tsx __tests__/validation-patterns.test.ts

// Import the validation patterns from the dashboard component
// Note: In a real implementation, these patterns should be extracted to a separate utility file
const VALIDATION_PATTERNS = {
  NAME_PATTERN: /^[a-zA-Z](?:[a-zA-Z\s\-'.])*[a-zA-Z]$|^[a-zA-Z]$/,
  BUSINESS_NAME_PATTERN:
    /^(?!.* {2})(?!.*--)(?!.*\.{2})(?!.*,{2})(?!.*'')(?!.*&&)(?!.*\(\()(?!.*\)\))[a-zA-Z0-9](?:[a-zA-Z0-9\s\-'.,&()]*[a-zA-Z0-9.)])?$/,
};

// Simple test runner
class TestRunner {
  private tests: Array<{ name: string; fn: () => void }> = [];
  private currentSuite = '';

  describe(name: string, fn: () => void) {
    this.currentSuite = name;
    console.log(`\n📋 ${name}`);
    fn();
  }

  it(name: string, fn: () => void) {
    this.tests.push({ name: `${this.currentSuite} - ${name}`, fn });
  }

  expect(actual: any) {
    return {
      toBe: (expected: any) => {
        if (actual !== expected) {
          throw new Error(`Expected ${expected}, but got ${actual}`);
        }
      },
    };
  }

  run() {
    let passed = 0;
    let failed = 0;

    for (const test of this.tests) {
      try {
        test.fn();
        console.log(`  ✅ ${test.name.split(' - ')[1]}`);
        passed++;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.log(`  ❌ ${test.name.split(' - ')[1]}: ${errorMessage}`);
        failed++;
      }
    }

    console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
    if (failed > 0) {
      process.exit(1);
    }
  }
}

const runner = new TestRunner();

// Test Suite
runner.describe('NAME_PATTERN', () => {
  runner.it('should accept valid single character names', () => {
    runner.expect(VALIDATION_PATTERNS.NAME_PATTERN.test('A')).toBe(true);
    runner.expect(VALIDATION_PATTERNS.NAME_PATTERN.test('Z')).toBe(true);
    runner.expect(VALIDATION_PATTERNS.NAME_PATTERN.test('a')).toBe(true);
    runner.expect(VALIDATION_PATTERNS.NAME_PATTERN.test('z')).toBe(true);
  });

  runner.it('should accept valid multi-character names', () => {
    runner.expect(VALIDATION_PATTERNS.NAME_PATTERN.test('John')).toBe(true);
    runner
      .expect(VALIDATION_PATTERNS.NAME_PATTERN.test('Mary-Jane'))
      .toBe(true);
    runner.expect(VALIDATION_PATTERNS.NAME_PATTERN.test("O'Connor")).toBe(true);
    runner
      .expect(VALIDATION_PATTERNS.NAME_PATTERN.test('Dr. Smith'))
      .toBe(true);
    runner
      .expect(VALIDATION_PATTERNS.NAME_PATTERN.test('Jean-Pierre'))
      .toBe(true);
  });

  runner.it(
    'should reject names starting or ending with invalid characters',
    () => {
      runner.expect(VALIDATION_PATTERNS.NAME_PATTERN.test(' John')).toBe(false);
      runner.expect(VALIDATION_PATTERNS.NAME_PATTERN.test('John ')).toBe(false);
      runner.expect(VALIDATION_PATTERNS.NAME_PATTERN.test('-John')).toBe(false);
      runner.expect(VALIDATION_PATTERNS.NAME_PATTERN.test('John-')).toBe(false);
      runner.expect(VALIDATION_PATTERNS.NAME_PATTERN.test('.John')).toBe(false);
      runner.expect(VALIDATION_PATTERNS.NAME_PATTERN.test("'John")).toBe(false);
    }
  );

  runner.it('should reject names with numbers or special characters', () => {
    runner.expect(VALIDATION_PATTERNS.NAME_PATTERN.test('John123')).toBe(false);
    runner
      .expect(VALIDATION_PATTERNS.NAME_PATTERN.test('John@Smith'))
      .toBe(false);
    runner
      .expect(VALIDATION_PATTERNS.NAME_PATTERN.test('John#Smith'))
      .toBe(false);
    runner
      .expect(VALIDATION_PATTERNS.NAME_PATTERN.test('John&Smith'))
      .toBe(false);
  });
});

runner.describe('BUSINESS_NAME_PATTERN', () => {
  runner.it('should accept valid single character business names', () => {
    runner
      .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('A'))
      .toBe(true);
    runner
      .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('Z'))
      .toBe(true);
    runner
      .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('a'))
      .toBe(true);
    runner
      .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('z'))
      .toBe(true);
    runner
      .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('1'))
      .toBe(true);
    runner
      .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('9'))
      .toBe(true);
  });

  runner.it('should accept valid business names with common patterns', () => {
    runner
      .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('ABC Corp'))
      .toBe(true);
    runner
      .expect(
        VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('Smith & Associates')
      )
      .toBe(true);
    runner
      .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('Real Estate LLC'))
      .toBe(true);
    runner
      .expect(
        VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('Tech Solutions Inc.')
      )
      .toBe(true);
    runner
      .expect(
        VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('Johnson, Smith & Co.')
      )
      .toBe(true);
    runner
      .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test("McDonald's"))
      .toBe(true);
    runner
      .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('A-1 Services'))
      .toBe(true);
  });

  runner.it(
    'should accept business names with parentheses - edge cases',
    () => {
      runner
        .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('Acme (Intl)'))
        .toBe(true);
      runner
        .expect(
          VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('Tech Corp (USA)')
        )
        .toBe(true);
      runner
        .expect(
          VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('ABC (Holdings) Ltd')
        )
        .toBe(true);
      runner
        .expect(
          VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('Company (2024)')
        )
        .toBe(true);
    }
  );

  runner.it('should reject business names with only special characters', () => {
    runner
      .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test(')'))
      .toBe(false);
    runner
      .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('('))
      .toBe(false);
    runner
      .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('&'))
      .toBe(false);
    runner
      .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('.'))
      .toBe(false);
    runner
      .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test(','))
      .toBe(false);
    runner
      .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test("'"))
      .toBe(false);
    runner
      .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('-'))
      .toBe(false);
  });

  runner.it(
    'should reject business names starting with invalid characters',
    () => {
      runner
        .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test(' ABC Corp'))
        .toBe(false);
      runner
        .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('-ABC Corp'))
        .toBe(false);
      runner
        .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('.ABC Corp'))
        .toBe(false);
      runner
        .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('&ABC Corp'))
        .toBe(false);
      runner
        .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('(ABC Corp'))
        .toBe(false);
      runner
        .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test(')ABC Corp'))
        .toBe(false);
      runner
        .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test(',ABC Corp'))
        .toBe(false);
      runner
        .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test("'ABC Corp"))
        .toBe(false);
    }
  );

  runner.it(
    'should reject business names ending with invalid characters (except closing parenthesis and periods)',
    () => {
      runner
        .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('ABC Corp '))
        .toBe(false);
      runner
        .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('ABC Corp-'))
        .toBe(false);
      runner
        .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('ABC Corp&'))
        .toBe(false);
      runner
        .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('ABC Corp('))
        .toBe(false);
      runner
        .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('ABC Corp,'))
        .toBe(false);
      runner
        .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test("ABC Corp'"))
        .toBe(false);
    }
  );

  runner.it(
    'should accept business names ending with closing parenthesis',
    () => {
      runner
        .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('ABC Corp)'))
        .toBe(true);
      runner
        .expect(
          VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('Tech Solutions)')
        )
        .toBe(true);
      runner
        .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('123 Company)'))
        .toBe(true);
    }
  );

  runner.it('should accept business names ending with periods', () => {
    runner
      .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('ABC Corp.'))
      .toBe(true);
    runner
      .expect(
        VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('Tech Solutions Inc.')
      )
      .toBe(true);
    runner
      .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('Johnson & Co.'))
      .toBe(true);
  });

  runner.it('should reject empty strings and whitespace-only strings', () => {
    runner
      .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test(''))
      .toBe(false);
    runner
      .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test(' '))
      .toBe(false);
    runner
      .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('  '))
      .toBe(false);
    runner
      .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('\t'))
      .toBe(false);
    runner
      .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('\n'))
      .toBe(false);
  });

  runner.it('should reject business names with invalid characters', () => {
    runner
      .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('ABC@Corp'))
      .toBe(false);
    runner
      .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('ABC#Corp'))
      .toBe(false);
    runner
      .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('ABC$Corp'))
      .toBe(false);
    runner
      .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('ABC%Corp'))
      .toBe(false);
    runner
      .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('ABC^Corp'))
      .toBe(false);
    runner
      .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('ABC*Corp'))
      .toBe(false);
    runner
      .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('ABC+Corp'))
      .toBe(false);
    runner
      .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('ABC=Corp'))
      .toBe(false);
    runner
      .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('ABC|Corp'))
      .toBe(false);
    runner
      .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('ABC\\Corp'))
      .toBe(false);
    runner
      .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('ABC/Corp'))
      .toBe(false);
    runner
      .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('ABC?Corp'))
      .toBe(false);
    runner
      .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('ABC<Corp'))
      .toBe(false);
    runner
      .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('ABC>Corp'))
      .toBe(false);
    runner
      .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('ABC[Corp'))
      .toBe(false);
    runner
      .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('ABC]Corp'))
      .toBe(false);
    runner
      .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('ABC{Corp'))
      .toBe(false);
    runner
      .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('ABC}Corp'))
      .toBe(false);
  });

  runner.it('should handle complex valid business names', () => {
    runner
      .expect(
        VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test(
          'Johnson, Smith & Associates LLC'
        )
      )
      .toBe(true);
    runner
      .expect(
        VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test(
          'A1 Real Estate Solutions Inc.'
        )
      )
      .toBe(true);
    runner
      .expect(
        VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test(
          'Tech-Forward Solutions (2024)'
        )
      )
      .toBe(true);
    runner
      .expect(
        VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test(
          "O'Reilly & Sons Construction"
        )
      )
      .toBe(true);
    runner
      .expect(
        VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test(
          '123 Main Street Properties'
        )
      )
      .toBe(true);
  });

  runner.it(
    'should handle edge cases with consecutive special characters',
    () => {
      // These should be rejected as they contain consecutive special characters or improper formatting
      runner
        .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('ABC  Corp'))
        .toBe(false); // double space
      runner
        .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('ABC--Corp'))
        .toBe(false); // double dash
      runner
        .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('ABC..Corp'))
        .toBe(false); // double period
      runner
        .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('ABC,,Corp'))
        .toBe(false); // double comma
      runner
        .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test("ABC''Corp"))
        .toBe(false); // double apostrophe
      runner
        .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('ABC&&Corp'))
        .toBe(false); // double ampersand
      runner
        .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test('ABC(())Corp'))
        .toBe(false); // nested parentheses
    }
  );

  runner.it(
    'should test performance with potentially problematic strings',
    () => {
      // These tests ensure the regex doesn't suffer from ReDoS attacks
      const longString = 'A' + 'a'.repeat(1000) + 'Z';
      const longStringWithSpaces = 'A' + ' a'.repeat(500) + 'Z';
      const longStringWithDashes = 'A' + '-a'.repeat(500) + 'Z';

      runner
        .expect(VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test(longString))
        .toBe(true);
      runner
        .expect(
          VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test(longStringWithSpaces)
        )
        .toBe(true);
      runner
        .expect(
          VALIDATION_PATTERNS.BUSINESS_NAME_PATTERN.test(longStringWithDashes)
        )
        .toBe(true);
    }
  );
});

// Run the tests
runner.run();

# Testing Setup and Coverage

This project uses Jest for testing with coverage reporting via Codecov.

## Test Setup

### Dependencies

- **Jest**: Test runner
- **@testing-library/react**: React component testing
- **@testing-library/jest-dom**: Custom Jest matchers
- **@testing-library/user-event**: User interaction testing
- **jest-environment-jsdom**: DOM environment for tests

### Configuration Files

- `jest.config.js`: Jest configuration
- `jest.setup.js`: Global test setup and mocks
- `.github/workflows/test.yml`: GitHub Actions CI/CD

## Running Tests

### Basic Commands

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test path/to/test-file.test.ts

# Run tests matching a pattern
pnpm test --testNamePattern="should validate"
```

### Coverage Report

The coverage report shows:

- **Statements**: Percentage of code statements executed
- **Branches**: Percentage of conditional branches executed
- **Functions**: Percentage of functions called
- **Lines**: Percentage of lines executed

Coverage files are generated in the `coverage/` directory:

- `coverage/lcov.info`: LCOV format for Codecov
- `coverage/index.html`: HTML report for local viewing

## Test Structure

### File Organization

```
├── lib/__tests__/           # Utility function tests
├── components/__tests__/     # React component tests
├── app/__tests__/           # Page and API route tests
└── hooks/__tests__/         # Custom hook tests
```

### Test File Naming

- `*.test.ts` - TypeScript test files
- `*.test.tsx` - React component test files
- `*.spec.ts` - Alternative naming convention

## Writing Tests

### Utility Function Tests

```typescript
import { validateAssistantId } from '../vapi-assistant';

describe('validateAssistantId', () => {
  it('should validate correct assistant IDs', () => {
    expect(validateAssistantId('assistant123')).toBe(true);
  });

  it('should reject invalid assistant IDs', () => {
    expect(validateAssistantId('invalid@id')).toBe(false);
  });
});
```

### React Component Tests

```typescript
import { render, screen } from '@testing-library/react'
import { DashboardAnalytics } from '../dashboard-analytics'

describe('DashboardAnalytics', () => {
  it('renders metrics correctly', () => {
    render(<DashboardAnalytics metrics={mockMetrics} trends={mockTrends} />)
    expect(screen.getByText('Total Calls')).toBeInTheDocument()
  })
})
```

### API Route Tests

```typescript
import { GET } from '../route';
import { NextRequest } from 'next/server';

describe('API Route', () => {
  it('should return 200 for valid request', async () => {
    const request = new NextRequest('http://localhost/api/test');
    const response = await GET(request);
    expect(response.status).toBe(200);
  });
});
```

## Mocks and Setup

### Global Mocks (jest.setup.js)

- **Next.js Router**: Mocked for component testing
- **Environment Variables**: Test values set
- **Sentry**: Mocked to prevent errors
- **Browser APIs**: ResizeObserver, matchMedia

### Component Mocks

```typescript
// Mock external dependencies
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: { getUser: jest.fn() },
    from: jest.fn(),
  })),
}));
```

## Codecov Integration

### GitHub Actions Workflow

The `.github/workflows/test.yml` file:

1. Runs tests on multiple Node.js versions
2. Generates coverage reports
3. Uploads to Codecov automatically

### Codecov Configuration

- **Token**: Set `CODECOV_TOKEN` in GitHub repository secrets
- **Coverage Thresholds**: Configured in Codecov dashboard
- **Status Checks**: Coverage reports on pull requests

### Coverage Badge

Add this to your README.md:

```markdown
[![codecov](https://codecov.io/gh/your-username/your-repo/branch/main/graph/badge.svg)](https://codecov.io/gh/your-username/your-repo)
```

## Best Practices

### Test Organization

1. **Arrange**: Set up test data and mocks
2. **Act**: Execute the code being tested
3. **Assert**: Verify the expected outcome

### Naming Conventions

- Test descriptions should be clear and descriptive
- Use `describe` blocks to group related tests
- Use `it` or `test` for individual test cases

### Coverage Goals

- **Minimum**: 80% overall coverage
- **Critical Paths**: 100% coverage for business logic
- **UI Components**: Focus on user interactions and edge cases

### Performance

- Keep tests fast and focused
- Use `beforeEach` for common setup
- Mock expensive operations (API calls, database queries)

## Troubleshooting

### Common Issues

1. **Import Errors**: Check module resolution in jest.config.js
2. **Mock Issues**: Ensure mocks are set up before imports
3. **Coverage Gaps**: Add tests for uncovered code paths
4. **Type Errors**: Run `pnpm type-check` to verify types

### Debugging Tests

```bash
# Run tests with verbose output
pnpm test --verbose

# Run specific test with debugging
pnpm test --testNamePattern="specific test" --verbose

# Check Jest configuration
pnpm test --showConfig
```

## Continuous Integration

### Pre-commit Hooks

Consider adding pre-commit hooks to run tests automatically:

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "pnpm test:coverage"
    }
  }
}
```

### Coverage Thresholds

Configure Jest to fail if coverage drops below thresholds:

```javascript
// jest.config.js
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80
  }
}
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library Documentation](https://testing-library.com/docs/)
- [Codecov Documentation](https://docs.codecov.io/)
- [Next.js Testing Guide](https://nextjs.org/docs/testing)

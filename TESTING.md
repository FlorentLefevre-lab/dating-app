# Testing Guide - Dating App

This document provides comprehensive instructions for running and writing tests for the Dating App.

## Table of Contents

1. [Test Architecture](#test-architecture)
2. [Setup](#setup)
3. [Running Tests](#running-tests)
4. [Writing Tests](#writing-tests)
5. [Best Practices](#best-practices)

---

## Test Architecture

The testing suite is organized into multiple layers:

```
__tests__/
├── unit/              # Unit tests (Jest)
│   ├── lib/           # Library utilities
│   ├── hooks/         # React hooks
│   └── components/    # React components
├── integration/       # Integration tests (Jest)
│   ├── api/           # API route tests
│   └── db/            # Database tests
├── security/          # Security-focused tests
├── fixtures/          # Test data
├── mocks/             # MSW handlers and mocks
└── setup/             # Test configuration
```

### Test Types

| Type | Framework | Purpose | Location |
|------|-----------|---------|----------|
| Unit | Jest | Test individual functions/components | `__tests__/unit/` |
| Integration | Jest | Test API routes and DB operations | `__tests__/integration/` |
| Security | Jest | Test auth, rate limiting, injection | `__tests__/security/` |

---

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL (for integration tests)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Install test dependencies
npm install -D jest ts-jest @types/jest jest-environment-jsdom
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install -D msw jest-mock-extended
```

### Environment Configuration

Create a `.env.test` file:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/dating_test"
NEXTAUTH_SECRET="test-secret"
NEXTAUTH_URL="http://localhost:3000"
```

### Database Setup for Tests

```bash
# Create test database
npx prisma db push --accept-data-loss

# Or use SQLite for faster tests
DATABASE_URL="file:./test.db"
```

---

## Running Tests

### Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test file
npm test -- __tests__/unit/lib/auth.test.ts
```

### Integration Tests

```bash
# Run integration tests
npm run test:integration

# Run API tests only
npm test -- __tests__/integration/api

# Run DB tests only
npm test -- __tests__/integration/db
```

### Security Tests

```bash
npm run test:security
```

### All Tests

```bash
npm test
```

---

## Writing Tests

### Unit Test Example

```typescript
// __tests__/unit/lib/auth.test.ts
import { hashPassword, verifyPassword } from '@/lib/auth';

describe('Password Utilities', () => {
  it('should hash password with bcrypt', async () => {
    const password = 'TestPassword123!';
    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(50);
  });

  it('should verify correct password', async () => {
    const password = 'TestPassword123!';
    const hash = await hashPassword(password);

    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });
});
```

### Integration Test Example

```typescript
// __tests__/integration/api/auth.test.ts
import { createMocks } from 'node-mocks-http';
import handler from '@/app/api/auth/register/route';

describe('POST /api/auth/register', () => {
  it('should create user with valid data', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'Test User'
      }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(201);
    expect(JSON.parse(res._getData())).toHaveProperty('user');
  });
});
```

---

## Best Practices

### General

1. **Isolate tests**: Each test should be independent
2. **Clean up**: Use `beforeEach` to reset state
3. **Use fixtures**: Keep test data in fixtures
4. **Descriptive names**: Test names should describe the behavior

### Unit Tests

- Test one thing per test
- Mock external dependencies
- Cover edge cases

### Integration Tests

- Use real database (or in-memory SQLite)
- Test happy path and error cases
- Verify side effects (emails sent, data created)

### Security Tests

- Test all protected routes
- Verify rate limiting works
- Test for common vulnerabilities (XSS, SQL injection)
- Test authorization (not just authentication)

---

## Troubleshooting

### Common Issues

**Database connection errors**
- Ensure test database exists
- Check DATABASE_URL in .env.test

### Debugging

```bash
# Run Jest with verbose output
npm test -- --verbose

# Run single test
npm test -- -t "should login successfully"
```

---

## Coverage Goals

| Area | Target |
|------|--------|
| Unit Tests | 80%+ |
| Integration Tests | 70%+ |
| Overall | 75%+ |

Run coverage report:
```bash
npm run test:coverage
```

---

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/)
- [MSW Documentation](https://mswjs.io/docs/)

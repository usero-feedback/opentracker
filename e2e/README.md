# E2E Testing with Playwright

This directory contains end-to-end tests for opentracker using Playwright.

## Setup

Playwright has been installed and configured. Chromium browser is the only browser configured for faster test execution.

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run tests in headed mode (with browser UI)
npm run test:e2e -- --headed

# Run tests in debug mode
npm run test:e2e -- --debug

# Run specific test file
npm run test:e2e -- tests/example.spec.ts

# Run tests with UI mode (interactive)
npx playwright test --ui
```

## Project Structure

```
e2e/
├── tests/         # Test files go here (*.spec.ts)
├── utils/         # Test utilities and fixtures
│   └── fixtures.ts  # Test user credentials
└── README.md      # This file
```

## Configuration

- **Base URL**: http://localhost:5173
- **Test timeout**: 30 seconds
- **Browser**: Chromium only
- **Screenshots**: Captured on failure
- **Retries**: 0 (no automatic retries)

## Test Fixtures

Test user credentials are available in `utils/fixtures.ts`:

- `TEST_USER_EMAIL`: Generates a unique email for each test run
- `TEST_USER_PASSWORD`: Test user password

## Development Notes

- Make sure the dev server is running at http://localhost:5173 before running tests
- The webServer config is commented out in playwright.config.ts - uncomment if you want Playwright to start the dev server
  automatically
- Screenshots and test reports will be generated in `playwright-report/` and `test-results/` directories

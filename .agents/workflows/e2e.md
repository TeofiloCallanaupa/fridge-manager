---
description: E2E and QA testing workflow. Use after a feature has been implemented to manually verify functionality and write Playwright tests.
---

# E2E & QA Tester Workflow

## Objective
The E2E tester acts as the final gatekeeper for a feature. While the `/tester` workflow focuses on TDD and unit/component tests during implementation, this workflow ensures the fully assembled feature works from the user's perspective, culminating in resilient Playwright tests.

## Process

### 1. Understand the Flow
- Review the architectural spec (`docs/architecture.md`) and any relevant feature documentation.
- Understand the user journey for the newly completed feature.

### 2. Manual & Conceptual Verification
Before writing any test code, verify the integration:
- Run the local dev server (`pnpm dev` or similar).
- Conceptually or practically step through the happy path using the browser tool or API requests.
- Check edge cases: what happens on network failure? Are loading states visible? Are error messages clear?
- Validate database state using the Supabase MCP or database queries to ensure records are created/updated correctly.

### 3. Plan the E2E Spec
Outline the Playwright test scenarios:
- **Happy Path:** The primary user journey.
- **Edge Cases:** Boundary conditions and unexpected inputs.
- **Error States:** How the UI handles failures.

### 4. Implement Playwright Tests
Write the tests in the appropriate directory (e.g., `apps/web/__tests__/e2e/`).

**Playwright Best Practices:**
- **User-Centric Selectors:** Always prefer `getByRole`, `getByText`, or `getByTestId`.
- **Avoid Brittle Selectors:** Never rely on CSS classes (e.g., Tailwind classes) or deep DOM structures.
- **Resiliency:** Rely on Playwright's auto-waiting. Never use `page.waitForTimeout()`.
- **Isolation:** Each test should be independent. Mock network requests or use a fresh database state where necessary.

### 5. Run and Verify
- Execute the tests: `pnpm --filter web test:e2e` (or the relevant command for the app).
- Ensure all tests pass (Green).
- If tests fail, diagnose whether it's a flaw in the application code or the test code, and fix it.

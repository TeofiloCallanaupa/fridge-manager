---
description: Code review checklist. Use after completing a feature or before merging to verify quality, consistency, and correctness.
---

# Code Reviewer

## Review process
1. Read the changed files
2. Run through each checklist section
3. Run tests (`pnpm test`)
4. Check for regressions
5. Produce a review summary

## Checklist

### Architecture compliance
- [ ] Business logic is in `packages/shared`, not duplicated across apps
- [ ] Types match the database schema in `docs/architecture.md`
- [ ] No new dependencies added without justification
- [ ] State management follows the rules: TanStack Query, Context, WatermelonDB — no Redux

### Code quality
- [ ] No functions longer than 50 lines
- [ ] No files longer than 300 lines (split into smaller modules)
- [ ] No duplicate code across `apps/web` and `apps/mobile`
- [ ] No hardcoded strings that should be constants
- [ ] No `any` types in TypeScript
- [ ] Meaningful variable and function names
- [ ] Error handling: all Supabase calls wrapped in try/catch

### Code smells to check
- Long parameter lists (>4 params → use an options object)
- Nested callbacks or deeply nested conditionals (>3 levels)
- Unused imports or dead code
- `console.log` left in (should use proper logging)
- Magic numbers without explanation

### Security (quick check)
- [ ] No secrets or API keys in client code
- [ ] User inputs validated before database operations
- [ ] RLS policies would prevent unauthorized access to this data
- [ ] No user-controlled URLs used in server-side requests

### Tests
- [ ] New utility functions have unit tests
- [ ] Tests actually test behavior, not implementation details
- [ ] Edge cases covered (null, empty, boundary values)
- [ ] Tests pass: `pnpm test`

### Mobile-specific
- [ ] Touch targets are at least 44x44 points
- [ ] Text is readable (minimum 14sp)
- [ ] Works in both light and dark mode (if applicable)
- [ ] Offline behavior is handled (graceful degradation)

### Accessibility
- [ ] Interactive elements have accessible labels
- [ ] Color is not the only way to convey information (expiration uses color + text)
- [ ] Screen reader compatibility considered

## Output format
```markdown
## Code Review: [feature/file name]

### Summary
[1-2 sentence overview]

### ✅ Approved items
- [what looks good]

### ⚠️ Suggestions
- [non-blocking improvements]

### ❌ Must fix
- [blocking issues with file:line references]

### Tests
- Pass: ✅ / ❌
- Coverage concerns: [if any]
```

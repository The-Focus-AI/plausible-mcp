# Architecture Overview

## Secret Management
As of Mon Mar 31 06:54:56 EDT 2025, the project uses 1Password exclusively for secret management:
- No .env files or environment variables for configuration
- API keys and secrets retrieved directly from 1Password
- Simplified setup process with single source of truth
- Reduced security risk by eliminating local secret storage

## Tech Stack
- TypeScript for type safety
- MCP SDK for server implementation
- Zod for runtime validation
- Vitest for testing
- Plausible Analytics API integration

## Directory Layout
```
src/
  ├── cli.ts           # CLI implementation
  ├── server.ts        # MCP server setup
  ├── utils/
  │   └── apiLogger.ts # API logging utilities
  └── tests/           # Test suite
```

## Implementation Patterns
1. Secret Management:
   - Always use 1Password for secrets
   - No environment variables for configuration
   - Clear error messages for missing secrets

2. Error Handling:
   - Comprehensive error types
   - Clear user feedback
   - Proper error propagation

3. Validation:
   - Zod schemas for runtime validation
   - TypeScript types for compile-time safety
   - Input validation before API calls

4. Testing:
   - Complete test coverage
   - Mock external services
   - Validate error scenarios 
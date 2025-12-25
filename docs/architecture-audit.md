# Architecture Audit Report

**Date:** 2025-01-XX  
**Scope:** Full codebase audit for security, performance, maintainability, and future scalability

---

## Executive Summary

This audit identifies critical security vulnerabilities, architectural inconsistencies, and performance bottlenecks in the current codebase. The app is a v0/Lovable-like builder with auth, per-user projects, files, snapshots, chat sessions, and AI tool loops.

**Key Findings:**
- 🔴 **CRITICAL:** Header-based auth with fallback to default user (security risk)
- 🔴 **CRITICAL:** No env validation (silent misconfig possible)
- 🟡 **HIGH:** Inconsistent error handling across routes
- 🟡 **HIGH:** Missing transactions for multi-step operations
- 🟡 **HIGH:** No centralized authz guards (ownership checks duplicated)
- 🟡 **MEDIUM:** Missing pagination on list endpoints
- 🟡 **MEDIUM:** Rate limiting only on AI route, in-memory only
- 🟢 **LOW:** File tools have basic path validation but could be hardened

---

## System Map

### Data Flow
```
UI (React) 
  → API Routes (Next.js App Router)
    → Auth Layer (getUserId from headers)
      → Business Logic (modules/ai, etc.)
        → Prisma ORM
          → SQLite Database
```

### Key Components

1. **Frontend:**
   - `app/` - Next.js pages
   - `components/` - React components (ChatPanel, WorkbenchPanel, etc.)
   - `lib/api-client.ts` - Client-side fetch wrapper

2. **Backend:**
   - `app/api/` - Next.js API routes
   - `lib/auth.ts` - Auth helper (header-based, fallback to default user)
   - `lib/prisma.ts` - Prisma client singleton
   - `src/modules/ai/` - AI provider, tools, context builder

3. **Database:**
   - SQLite via Prisma
   - Models: User, Project, ProjectFile, Snapshot, ChatSession, ChatMessage, AiRun, AiToolInvocation

---

## Top 10 Risks (Ranked)

### 1. 🔴 CRITICAL: Insecure Authentication
**Location:** `lib/auth.ts`
- Uses header-based auth (`x-user-id`, `x-user-email`)
- Falls back to creating/using default user (`default-user-migration`)
- **Risk:** Anyone can impersonate any user by setting headers
- **Impact:** Complete data breach, unauthorized access to all projects
- **Fix:** Implement proper session-based auth (cookies/JWT) with server-side validation

### 2. 🔴 CRITICAL: No Environment Variable Validation
**Location:** `lib/prisma.ts`, various routes
- Only checks `DATABASE_URL` exists, doesn't validate format
- No validation for `ANTHROPIC_API_KEY`, `AI_RATE_LIMIT_PER_MIN`
- **Risk:** Silent misconfigurations, runtime failures in production
- **Impact:** App crashes or behaves incorrectly without clear error messages
- **Fix:** Add zod-based env validation at startup

### 3. 🟡 HIGH: Inconsistent Error Handling
**Location:** All API routes
- Some return `{ error: string }`
- Some return `{ error: { code, message } }`
- Some return `{ error: string, details: ... }`
- Zod errors handled inconsistently
- **Risk:** Frontend error handling breaks, poor DX
- **Impact:** Users see cryptic errors, debugging harder
- **Fix:** Standardize error response shape with result pattern

### 4. 🟡 HIGH: Missing Transactions for Multi-Step Operations
**Location:** 
- `app/api/projects/[id]/snapshots/route.ts` (POST) - creates snapshot + files
- `src/modules/ai/run/runAiEdit.ts` - creates AiRun, messages, snapshot, tool invocations
- **Risk:** Partial failures leave DB in inconsistent state
- **Impact:** Data corruption, orphaned records
- **Fix:** Wrap multi-step operations in `prisma.$transaction()`

### 5. 🟡 HIGH: Duplicated Ownership Checks
**Location:** Every API route
- Each route manually checks `project.userId === userId`
- Pattern repeated 15+ times
- **Risk:** Easy to forget check, inconsistent logic
- **Impact:** Authorization bugs, security vulnerabilities
- **Fix:** Centralize in authz guards (`requireProjectOwner()`)

### 6. 🟡 MEDIUM: Missing Pagination
**Location:**
- `app/api/projects/route.ts` (GET) - returns all projects
- `app/api/projects/[id]/chats/route.ts` (GET) - returns all chats
- `app/api/projects/[id]/chats/[chatId]/messages/route.ts` (GET) - returns all messages
- `app/api/projects/[id]/snapshots/route.ts` (GET) - returns all snapshots
- **Risk:** Performance degradation with large datasets
- **Impact:** Slow queries, memory issues, poor UX
- **Fix:** Add cursor/offset pagination

### 7. 🟡 MEDIUM: In-Memory Rate Limiting
**Location:** `app/api/projects/[id]/ai/run/route.ts`
- Token bucket in Map (lost on restart)
- Only on AI route, not other expensive endpoints
- **Risk:** No persistence, no distributed support
- **Impact:** Rate limits reset on restart, can't scale horizontally
- **Fix:** Make rate limiter swappable, design for Redis later

### 8. 🟡 MEDIUM: File Tool Path Validation Gaps
**Location:** `src/modules/ai/tools/schemas.ts`
- Basic path validation (rejects `..`, `/`, `\`)
- Denylist exists but could be more comprehensive
- No normalization of whitespace/unicode
- **Risk:** Path traversal if validation bypassed
- **Impact:** Access to files outside project boundary
- **Fix:** Add stricter sanitization, normalize paths

### 9. 🟢 LOW: Missing Database Indexes
**Location:** `prisma/schema.prisma`
- No explicit indexes on frequently queried fields
- `(projectId, path)` is unique but may need composite index
- `chatSessionId + createdAt` for messages
- **Risk:** Slow queries as data grows
- **Impact:** Degraded performance
- **Fix:** Add indexes via Prisma schema

### 10. 🟢 LOW: No Request ID for Logging
**Location:** All API routes
- Errors logged without request context
- Hard to trace errors across services
- **Risk:** Difficult debugging in production
- **Impact:** Slower incident response
- **Fix:** Add requestId to route handler wrapper

---

## Quick Wins (1-2 Day Fixes)

### 1. Env Validation
- Create `/src/shared/config/env.ts` with zod schema
- Validate at startup (server-only)
- Provide typed config object
- **Effort:** 2 hours

### 2. Error/Result Pattern
- Create `/src/shared/lib/errors.ts` (AppError with code + status)
- Create `/src/shared/lib/result.ts` (ok/err helpers)
- **Effort:** 3 hours

### 3. Route Handler Standard
- Create `/src/shared/http/route.ts` wrapper
- Parse JSON with zod
- Try/catch wrapper
- Consistent responses
- RequestId for logs
- **Effort:** 4 hours

### 4. Authz Guards
- Create `/src/shared/auth/guards.ts`
- `requireUser()`, `requireProjectOwner()`, `requireChatSessionOwner()`
- **Effort:** 3 hours

### 5. Apply Guards to Routes
- Update all routes to use guards
- Remove duplicated ownership checks
- **Effort:** 4 hours

### 6. File Tool Hardening
- Enhance path sanitization
- Normalize paths (trim, unicode)
- Expand denylist
- **Effort:** 2 hours

### 7. Basic Rate Limiting Improvement
- Extract rate limiter to `/src/shared/http/rate-limit.ts`
- Make it swappable (interface)
- **Effort:** 2 hours

**Total Quick Wins:** ~20 hours (2-3 days)

---

## Medium Refactors (1-2 Weeks)

### 1. Module Boundaries (Clean Architecture)
**Goal:** Separate concerns, make domain logic testable

**Structure:**
```
src/modules/
  projects/
    app/        # use-cases (createProject, getProject)
    infra/      # prisma repos
    api/        # route handlers (glue)
  files/
  snapshots/
  chats/
  ai/          # (already exists, normalize)
src/shared/
  db/          # prisma client
  auth/        # guards, session
  config/      # env
  http/        # route wrapper, rate limit
  lib/         # errors, result, utils
```

**Steps:**
1. Extract use-cases from routes
2. Create repos (data access layer)
3. Move route handlers to glue layer
4. Ensure domain logic doesn't import Next.js primitives

**Effort:** 1-2 weeks

### 2. Add Transactions
- Wrap snapshot creation in transaction
- Wrap AI run operations in transaction
- Test rollback scenarios
- **Effort:** 1 day

### 3. Add Pagination
- Add pagination to projects list
- Add pagination to chats list
- Add pagination to messages list
- Add pagination to snapshots list
- Update frontend to handle pagination
- **Effort:** 2-3 days

### 4. Database Indexes
- Add indexes via Prisma schema
- Create migration
- Test query performance
- **Effort:** 1 day

**Total Medium Refactors:** ~2 weeks

---

## Long-Term Plan (Post-Beta)

### 1. Proper Authentication
- Replace header-based auth with session cookies
- Implement JWT or session store
- Add password reset flow
- Add email verification
- **Effort:** 1-2 weeks

### 2. Supabase Integration
- Migrate from SQLite to Supabase Postgres
- Replace Prisma adapter
- Use Supabase Auth
- Use Supabase Storage for file contents (if needed)
- **Effort:** 2-3 weeks

### 3. Testing Infrastructure
- Unit tests for domain logic
- Integration tests for API routes
- E2E tests for critical flows
- **Effort:** 1-2 weeks

### 4. Observability
- Structured logging (Pino/Winston)
- Request tracing (OpenTelemetry)
- Error tracking (Sentry)
- Metrics (Prometheus/Datadog)
- **Effort:** 1 week

### 5. Performance Optimization
- Query optimization (N+1 fixes)
- Caching layer (Redis)
- CDN for static assets
- Database connection pooling
- **Effort:** 1-2 weeks

---

## Code Quality Issues

### Naming Conventions
- ✅ Generally consistent (camelCase for functions, PascalCase for components)
- ⚠️ Some inconsistencies in route handlers (GET/POST vs getProject/createProject)

### File Organization
- ⚠️ Mixed structure: `lib/` and `src/modules/` coexist
- ⚠️ Some routes are thin, some have business logic
- ✅ AI module is well-organized

### Type Safety
- ✅ TypeScript used throughout
- ⚠️ Some `any` types in tool invocations
- ⚠️ Missing strict mode in tsconfig

### Error Handling
- ❌ Inconsistent error shapes
- ❌ Some errors swallowed (console.error only)
- ⚠️ No error boundaries in React

### Testing
- ❌ No tests found
- ❌ No test infrastructure

---

## Security Checklist

- [ ] ✅ Path traversal protection (basic, could be stronger)
- [ ] ✅ File size limits (300k chars)
- [ ] ✅ Denylist for sensitive files
- [ ] ❌ No rate limiting on most endpoints
- [ ] ❌ No CSRF protection
- [ ] ❌ No input sanitization for XSS
- [ ] ❌ Secrets could leak in logs (API keys)
- [ ] ⚠️ Auth is header-based (insecure)
- [ ] ✅ Ownership checks present (but duplicated)

---

## Performance Checklist

- [ ] ❌ No pagination on lists
- [ ] ❌ No query result caching
- [ ] ⚠️ Context builder truncates (good, but could be optimized)
- [ ] ❌ No database indexes (implicit only)
- [ ] ⚠️ AI context size capped (60k chars, good)
- [ ] ❌ No connection pooling config
- [ ] ❌ Large file contents returned in lists

---

## Recommendations Priority

1. **IMMEDIATE (This Week):**
   - Env validation
   - Error/result pattern
   - Authz guards
   - Route handler standard

2. **SHORT TERM (Next 2 Weeks):**
   - Transactions for multi-step ops
   - Pagination
   - File tool hardening
   - Rate limiting improvements

3. **MEDIUM TERM (Next Month):**
   - Module boundaries refactor
   - Database indexes
   - Proper authentication

4. **LONG TERM (Post-Beta):**
   - Supabase integration
   - Testing infrastructure
   - Observability
   - Performance optimization

---

## Notes

- UI/UX is not in scope (per requirements)
- No breaking changes to existing behavior
- Incremental improvements preferred
- Keep changes modular and documented


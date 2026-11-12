# Multi-Agent Parallel Sprint: Interface Contracts & Execution Plan

**Feature:** Team Collaboration (Comments, @Mentions, Audit Logging)  
**Coordination Strategy:** `interface_first` (Rigid interface contracts and schema boundaries established before execution).

---

## 1. Interface Contracts

### INTERFACE CONTRACT — Agent 1: Comment Threads
- **CREATES:**
  - `src/comments/comment.schema.ts`
  - `src/comments/comments.controller.ts`
  - `src/comments/comments.service.ts`
  - `src/comments/comments.module.ts`
  - `test/comments.e2e-spec.ts`
- **READS (ReadOnly):**
  - `src/teams/team.schema.ts`
  - `src/teams/team-membership.schema.ts`
  - `src/common/middleware/request-id.middleware.ts`
- **MODIFIES:**
  - `src/app.module.ts` (register `CommentsModule`)
- **DATA SHAPE (Comment Document):**
  ```typescript
  {
    _id: ObjectId,
    task_id: string,
    author_id: string,
    body: string, // 1 - 5000 chars
    parent_id: string | null, // for threaded replies
    created_at: Date,
    updated_at: Date
  }
  ```
- **API ENDPOINTS:**
  - `POST /tasks/:taskId/comments` -> `201 Created`
  - `GET /tasks/:taskId/comments` -> `200 OK` (list with pagination)
  - `DELETE /tasks/:taskId/comments/:id` -> `204 No Content`
- **EVENTS EMITTED:**
  - `comment.created`: `{ comment_id: string, task_id: string, author_id: string, body: string, timestamp: string }`

---

### INTERFACE CONTRACT — Agent 2: @Mention Parsing & Notification
- **CREATES:**
  - `src/mentions/mention-parser.ts`
  - `src/mentions/mention-notification.service.ts`
  - `src/mentions/mention.module.ts`
  - `test/mention-parser.spec.ts`
- **READS (ReadOnly):**
  - `src/teams/team-membership.schema.ts`
- **MODIFIES:** None (standalone utility & notification service).
- **DATA SHAPE (Parsed Mention):**
  ```typescript
  export interface ParsedMention {
    raw: string; // e.g. "@alice"
    username: string; // e.g. "alice"
    user_id: string | null;
    indices: [number, number];
  }
  ```
- **INTEGRATION POINT:**
  - `MentionParser.extractMentions(text: string): ParsedMention[]`
  - `MentionNotificationService.notifyUsers(mentions: ParsedMention[], context: MentionContext): Promise<void>`
  - Consumer (CommentsService) calls `extractMentions` on new comment creation.

---

### INTERFACE CONTRACT — Agent 3: Structured Audit Log
- **CREATES:**
  - `src/audit/audit-log.schema.ts`
  - `src/audit/audit-log.service.ts`
  - `src/audit/audit.interceptor.ts`
  - `src/audit/audit.module.ts`
  - `test/audit-log.spec.ts`
- **READS (ReadOnly):**
  - `src/common/middleware/request-id.middleware.ts`
- **MODIFIES:**
  - `src/app.module.ts` (register `AuditModule`)
- **DATA SHAPE (AuditLog Document):**
  ```typescript
  {
    _id: ObjectId,
    team_id: string,
    actor_id: string,
    action: string, // e.g. 'comment.created', 'team.updated'
    target_id: string,
    metadata: Record<string, any>,
    timestamp: Date
  }
  ```
- **INTEGRATION POINT:**
  - In-process event listener or interceptor listening to domain events and persisting asynchronously without blocking client responses.

---

## 2. Parallel Execution & Integration Sequence

1. **Phase 1 (Parallel Generation):**
   - Agent 1 builds `CommentsModule` against the Comment contract.
   - Agent 2 builds `MentionParser` & `MentionNotificationService`.
   - Agent 3 builds `AuditModule` & `AuditLogService`.
2. **Phase 2 (Sequential Reconcile & Merge):**
   - Step A: Verify Agent 2 pure utility tests pass (`npm test test/mention-parser.spec.ts`).
   - Step B: Merge Agent 1 `CommentsModule` and register in `src/app.module.ts`.
   - Step C: Merge Agent 3 `AuditModule` and register in `src/app.module.ts`.
   - Step D: Wire integration point: `CommentsService.create` invokes `MentionParser.extractMentions` and emits `comment.created` to `AuditLogService`.
3. **Phase 3 (Unified Verification):**
   - Execute combined test suite: creating a comment parses mentions, emits audit log, and persists comment without schema collision.


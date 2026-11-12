# Team Collaboration & RBAC Architecture & Onboarding Guide

## 1. Executive Architecture Overview

The Team Collaboration system is a multi-tenant workspace platform built on NestJS and MongoDB. It manages organizations, hierarchical membership access controls (RBAC), team invitations, asynchronous activity feeds, and real-time collaboration.

### Core Architecture Components
- **Controllers & DTOs:** Enforces strict whitelist validation using `class-validator` (@IsIn, @Length, @IsEmail).
- **Guards & Middleware:** `JwtAuthGuard` authenticates user identity; `TeamRbacGuard` asserts tenant membership and role authorization (`isTeamAdminOrOwner`).
- **Event Bus & Queues:** Emits decoupled audit and activity events via Redis/BullMQ to preserve low HTTP response latencies.

---

## 2. Data Models & Schemas

### 2.1 Team (`teams` collection)
```typescript
interface Team {
  _id: ObjectId;
  name: string;             // 1-100 characters, trimmed
  description?: string;      // 0-500 characters
  owner_id: ObjectId;       // References Users collection
  created_at: Date;
  updated_at: Date;
}
```

### 2.2 Team Membership (`team_memberships` collection)
```typescript
interface TeamMembership {
  _id: ObjectId;
  team_id: ObjectId;        // Foreign key to Team
  user_id: ObjectId;        // Foreign key to User
  role: 'owner' | 'admin' | 'member' | 'viewer';
  created_at: Date;
}
// Compound unique index: { team_id: 1, user_id: 1 }
```

### 2.3 Team Invitation (`team_invitations` collection)
```typescript
interface TeamInvitation {
  _id: ObjectId;
  team_id: ObjectId;
  email: string;            // Normalized lowercase RFC 5322
  role: 'admin' | 'member' | 'viewer';
  token: string;            // Cryptographically secure 32-byte hex
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expires_at: Date;         // 7-day TTL
}
```

---

## 3. RBAC Permission Hierarchy & Matrix

| Action / Capability | Owner | Admin | Member | Viewer |
| :--- | :---: | :---: | :---: | :---: |
| Delete Team | **YES** | NO | NO | NO |
| Promote / Demote Owners | **YES** | NO | NO | NO |
| Update Team Metadata | **YES** | **YES** | NO | NO |
| Issue Team Invitations | **YES** | **YES** | NO | NO |
| Update Non-Owner Roles | **YES** | **YES** | NO | NO |
| Remove Members | **YES** | **YES** | NO | NO |
| Post Comments & Attachments | **YES** | **YES** | **YES** | NO |
| View Activity Stream & Tasks | **YES** | **YES** | **YES** | **YES** |

---

## 4. How to Add a New Role (Step-by-Step Developer Guide)

To introduce a new role (e.g. `billing_admin`):
1. **Update Domain Enum:**
   Add `BILLING_ADMIN = 'billing_admin'` to `src/teams/enums/team-role.enum.ts`.
2. **Update Validation DTOs:**
   Update `@IsIn(['owner', 'admin', 'billing_admin', 'member', 'viewer'])` in `UpdateMemberRoleDto` and `CreateInvitationDto`.
3. **Configure Guard Capabilities:**
   Update `ROLE_HIERARCHY_LEVELS` and capability sets in `src/teams/guards/team-rbac.guard.ts`.
4. **Update DB Schema Constraints:**
   Add `'billing_admin'` to Mongoose enum in `src/teams/team-membership.schema.ts`.
5. **Add Boundary Tests:**
   Add positive capability tests (can access invoices) and negative denial tests (cannot delete team or edit code tasks) in `test/team-collaboration.spec.ts`.

---

## 5. Security & Failure Mode Triage

### Top Security Defenses
- **Self-Modification Block:** Users cannot alter their own role via `PUT /teams/:id/members/:uid`.
- **Identity-Bound Token Acceptance:** Invitations can only be accepted if `req.user.email === invitation.email`.
- **Tenant Scope Enforcement:** All database queries must include `team_id: req.team.id` to prevent cross-tenant IDOR access.


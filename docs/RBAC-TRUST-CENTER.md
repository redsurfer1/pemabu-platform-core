# RBAC for Trust Center Access

## Overview

The PEMABU Platform implements enterprise-grade Role-Based Access Control (RBAC) to gate access to the Trust Center and compliance dashboards. This ensures that sensitive operational data is only accessible to authorized stakeholders while maintaining transparency for auditors and institutional partners.

## Trust Roles

### Role Hierarchy

```
PUBLIC        → No Trust Center access (default)
AUDITOR       → Read-only Trust Center access
LLC_MEMBER    → Full Trust Center visibility
ADMIN         → Full Trust Center + control permissions
```

### Role Definitions

#### 1. PUBLIC (Default)

**Description**: Standard platform users without institutional access.

**Permissions**:
- ❌ Cannot access Trust Center (`/compliance-review`)
- ❌ Cannot view audit evidence
- ❌ Cannot review evidence snapshots
- ❌ Cannot trigger system controls
- ❌ Cannot access JIT elevated privileges
- ✅ Can view public landing page
- ✅ Can request institutional access

**Use Case**: General platform users, developers, and public visitors.

#### 2. AUDITOR

**Description**: External auditors and compliance officers with read-only access.

**Permissions**:
- ✅ Can access Trust Center (`/compliance-review`)
- ✅ Can view all audit evidence
- ✅ Can review and verify evidence snapshots
- ❌ Cannot trigger system controls
- ❌ Cannot perform manual releases
- ❌ Cannot access JIT elevated privileges

**View-Only Restrictions**:
- All control buttons disabled in Developer Panel
- "View-Only Mode" badge displayed
- Cannot simulate circuit breaker events
- Cannot reset system states
- Cannot request JIT access

**Use Case**: External auditors, SOC2 assessors, compliance consultants.

#### 3. LLC_MEMBER

**Description**: LLC members and institutional stakeholders with full visibility.

**Permissions**:
- ✅ Can access Trust Center (`/compliance-review`)
- ✅ Can view all audit evidence
- ✅ Can review and verify evidence snapshots
- ❌ Cannot trigger system controls (reserved for ADMIN)
- ❌ Cannot perform manual releases
- ❌ Cannot access JIT elevated privileges

**Use Case**: LLC members, board members, institutional investors.

#### 4. ADMIN

**Description**: Platform administrators with full system control.

**Permissions**:
- ✅ Can access Trust Center (`/compliance-review`)
- ✅ Can view all audit evidence
- ✅ Can review and verify evidence snapshots
- ✅ Can trigger system controls
- ✅ Can perform manual releases
- ✅ Can request JIT elevated privileges
- ✅ Can simulate circuit breaker events
- ✅ Can reset system states

**Use Case**: Platform operators, technical administrators, operations team.

## Implementation Architecture

### Database Schema

```prisma
enum TrustRole {
  PUBLIC        // No Trust Center access
  AUDITOR       // Read-only Trust Center access
  LLC_MEMBER    // Full Trust Center access, limited controls
  ADMIN         // Full Trust Center + control access
}

model User {
  id         String    @id @default(uuid())
  email      String
  trustRole  TrustRole @default(PUBLIC)
  // ... other fields
}
```

### Middleware Protection

**File**: `middleware.ts`

Protected routes:
- `/compliance-review` - Trust Center dashboard
- `/trust-center/*` - Future Trust Center pages

**Access Control Logic**:
```typescript
const allowedRoles = ['AUDITOR', 'LLC_MEMBER', 'ADMIN'];

if (!trustRole || !allowedRoles.includes(trustRole)) {
  return redirect('/?error=access_denied');
}
```

**Redirect Behavior**:
- Unauthenticated users → Redirect to home with `authentication_required` error
- Authenticated PUBLIC users → Redirect to home with `access_denied` error
- Invalid sessions → Redirect to home with `invalid_session` error

### Auth Context

**File**: `app/contexts/AuthContext.tsx`

Provides application-wide authentication state:

```typescript
interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  hasTrustCenterAccess: boolean;
  canModifyControls: boolean;
  permissions: RolePermissions;
  login: (user: AuthUser) => void;
  logout: () => void;
  setTrustRole: (role: TrustRole) => void;
}
```

**Permission Structure**:
```typescript
interface RolePermissions {
  canViewTrustCenter: boolean;
  canViewAuditEvidence: boolean;
  canReviewEvidence: boolean;
  canTriggerControls: boolean;
  canManualRelease: boolean;
  canAccessJIT: boolean;
}
```

### Component-Level Enforcement

#### Developer Panel

**File**: `app/components/DeveloperPanel.tsx`

**ADMIN Mode**:
```tsx
{permissions.canAccessJIT && (
  <JITAccessControl durationSeconds={120}>
    {(isElevated) => (
      <button disabled={!isElevated}>
        Simulate Reserve Drain
      </button>
    )}
  </JITAccessControl>
)}
```

**AUDITOR Mode**:
```tsx
{!permissions.canAccessJIT && (
  <div className="view-only-badge">
    View-Only Mode: AUDITOR role has read-only access
  </div>
)}
```

#### Navigation

**File**: `app/components/Navigation.tsx`

**Conditional Rendering**:
```tsx
{hasTrustCenterAccess ? (
  <Link href="/compliance-review">
    Trust Center
  </Link>
) : (
  <RequestInstitutionalAccess />
)}
```

## User Workflows

### Workflow 1: Public User Requests Access

1. User visits landing page (PUBLIC role by default)
2. Sees "Request Institutional Access" button instead of Trust Center link
3. Clicks button → Opens access request form
4. Fills form with:
   - Full name
   - Email address
   - Organization
   - Role/Title
   - Access justification
5. Submits request
6. Receives confirmation message
7. Admin team reviews request (external process)
8. User receives email with credentials
9. User logs in with assigned TrustRole

### Workflow 2: Auditor Reviews Evidence

1. Auditor logs in (AUDITOR role)
2. Navigation shows "Trust Center" link
3. Clicks link → Middleware validates role → Grants access
4. Views Compliance Review Dashboard
5. Sees all audit evidence snapshots
6. Clicks "View" on snapshot → Inspects detailed JSON
7. Clicks "Verify Snapshot" → Marks as reviewed
8. Developer Panel shows "View-Only Mode" badge
9. All control buttons disabled
10. Cannot simulate or reset system states

### Workflow 3: Admin Performs Control Operations

1. Admin logs in (ADMIN role)
2. Navigation shows "Trust Center" link with full access
3. Accesses Developer Panel
4. Sees "Request Elevated Access" button (JIT)
5. Requests access → Granted 120-second window
6. Live countdown timer displayed
7. Can simulate circuit breaker events
8. Can reset system states
9. Access auto-revokes after 120 seconds
10. Must request access again for next operation

## Security Considerations

### 1. Session Management

**Storage**: LocalStorage (client-side)

```typescript
localStorage.setItem('pemabu_auth_user', JSON.stringify({
  id: 'user-uuid',
  email: 'auditor@firm.com',
  tenantId: 'tenant-uuid',
  trustRole: 'AUDITOR',
  role: 'HUMAN'
}));
```

**Validation**: Middleware validates on every protected route request.

**Expiration**: Implement session timeout (recommended: 24 hours).

### 2. Server-Side Enforcement

**Critical**: All API endpoints MUST validate trustRole server-side.

```typescript
// Example: Audit Evidence Review Endpoint
export async function POST(request: NextRequest) {
  const user = await validateSession(request);

  if (!['AUDITOR', 'LLC_MEMBER', 'ADMIN'].includes(user.trustRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Proceed with review operation
}
```

### 3. Principle of Least Privilege

- Default role: PUBLIC (no access)
- Explicit grant required for Trust Center access
- Control operations require ADMIN role
- JIT access further restricts sensitive operations

### 4. Audit Trail

All access and operations are logged:
- Login/logout events
- Role changes
- Trust Center access
- Evidence reviews
- Control operations
- JIT access grants/revokes

## Testing & Validation

### Role Simulator

**File**: `app/components/RoleSimulator.tsx`

**Purpose**: Local development tool to test RBAC without database changes.

**Features**:
- Switch between all 4 trust roles instantly
- Test access controls in real-time
- Verify navigation visibility
- Validate permission enforcement
- Test middleware redirects

**Usage** (Development Mode Only):
1. Open application in localhost
2. Click Role Simulator panel (bottom-left)
3. Select trust role to simulate
4. Observe navigation and permission changes
5. Attempt to access protected routes
6. Verify view-only mode for AUDITOR
7. Test JIT access for ADMIN

### Test Scenarios

#### Test 1: PUBLIC User Access Denial

**Steps**:
1. Set role to PUBLIC
2. Attempt to navigate to `/compliance-review`
3. **Expected**: Redirect to `/?error=access_denied`
4. **Verify**: Trust Center link not visible
5. **Verify**: "Request Institutional Access" button shown

#### Test 2: AUDITOR Read-Only Mode

**Steps**:
1. Set role to AUDITOR
2. Navigate to `/compliance-review`
3. **Expected**: Access granted
4. **Verify**: Can view all snapshots
5. **Verify**: Can click "Verify Snapshot"
6. Open Developer Panel
7. **Expected**: "View-Only Mode" badge displayed
8. **Verify**: All control buttons disabled
9. **Verify**: Cannot request JIT access

#### Test 3: ADMIN Full Control

**Steps**:
1. Set role to ADMIN
2. Navigate to `/compliance-review`
3. **Expected**: Access granted
4. **Verify**: Can view and review all snapshots
5. Open Developer Panel
6. **Expected**: "Request Elevated Access" button visible
7. Click "Request Access"
8. **Expected**: 120-second countdown starts
9. **Verify**: Control buttons enabled
10. **Verify**: Can simulate circuit breaker
11. Wait for timer expiration
12. **Verify**: Access auto-revoked

#### Test 4: Middleware Enforcement

**Steps**:
1. Set role to PUBLIC
2. Manually navigate to `/compliance-review` in browser
3. **Expected**: Immediate redirect to home
4. **Verify**: Error parameter in URL
5. Set role to AUDITOR
6. Manually navigate to `/compliance-review`
7. **Expected**: Access granted
8. **Verify**: Page loads successfully

## API Reference

### Auth Helper Functions

**File**: `src/lib/auth-context.ts`

```typescript
// Check if user has Trust Center access
hasTrustCenterAccess(trustRole: TrustRole): boolean

// Check if user can modify controls
canModifyControls(trustRole: TrustRole): boolean

// Check if user is an auditor
isAuditor(trustRole: TrustRole): boolean

// Check if user is an admin
isAdmin(trustRole: TrustRole): boolean

// Get human-readable role label
getTrustRoleLabel(trustRole: TrustRole): string

// Get complete permission set for role
getTrustRolePermissions(trustRole: TrustRole): RolePermissions
```

### React Hooks

```typescript
// Use auth context in components
const {
  user,
  isAuthenticated,
  hasTrustCenterAccess,
  canModifyControls,
  permissions,
  login,
  logout,
  setTrustRole
} = useAuth();
```

## UI Components

### 1. Navigation

**Features**:
- Conditional "Trust Center" link visibility
- "Request Institutional Access" button for PUBLIC users
- User profile badge with email and trust role
- Logout button for authenticated users
- Color-coded trust role badges

### 2. Request Institutional Access Modal

**Features**:
- Professional access request form
- Captures: Name, Email, Organization, Role, Justification
- Displays trust role descriptions
- Simulated submission with success confirmation
- Auto-closes after 3 seconds

### 3. Role Simulator (Dev Only)

**Features**:
- Quick role switching for testing
- Visual indication of current role
- Color-coded role badges
- Logout functionality
- Developer mode detection

### 4. Developer Panel Enhancements

**Features**:
- Trust role badge display
- Conditional JIT access controls
- View-only mode notification
- Permission-based button enabling/disabling
- Descriptive access denial messages

## Migration Guide

### Existing Users

All existing users default to PUBLIC role. To grant Trust Center access:

```sql
-- Grant AUDITOR role to external auditors
UPDATE "User"
SET "trustRole" = 'AUDITOR'
WHERE email IN ('auditor1@firm.com', 'auditor2@firm.com');

-- Grant LLC_MEMBER role to stakeholders
UPDATE "User"
SET "trustRole" = 'LLC_MEMBER'
WHERE email IN ('member1@llc.com', 'member2@llc.com');

-- Grant ADMIN role to platform operators
UPDATE "User"
SET "trustRole" = 'ADMIN'
WHERE email IN ('admin@pemabu.ai', 'ops@pemabu.ai');
```

### New Users

Specify trustRole during user creation:

```typescript
await prisma.user.create({
  data: {
    email: 'auditor@firm.com',
    tenantId: 'tenant-id',
    role: 'HUMAN',
    trustRole: 'AUDITOR',
    profileStatus: 'VERIFIED',
  }
});
```

## Production Deployment

### Pre-Deployment Checklist

- [ ] Verify middleware is enabled for `/compliance-review` and `/trust-center/*`
- [ ] Test all 4 trust roles with Role Simulator
- [ ] Verify API endpoints validate trustRole server-side
- [ ] Implement session timeout mechanism
- [ ] Configure audit logging for access events
- [ ] Set up monitoring for unauthorized access attempts
- [ ] Document role assignment process for operations team
- [ ] Create runbook for trust role management
- [ ] Test redirect flows for all scenarios
- [ ] Verify JIT access timer accuracy

### Post-Deployment Monitoring

Monitor these metrics:
- Trust Center access attempts by role
- Access denial events
- Role distribution across user base
- JIT access grant/revoke frequency
- Average session duration by role
- Evidence review completion rate
- Unauthorized access attempts

## Troubleshooting

### Issue: User cannot access Trust Center

**Diagnosis**:
1. Check user's trustRole in database
2. Verify middleware is running
3. Check browser console for auth errors
4. Validate session cookie exists

**Solution**:
```sql
SELECT email, "trustRole" FROM "User" WHERE email = 'user@example.com';
```

If role is PUBLIC, update to appropriate role.

### Issue: AUDITOR can trigger controls

**Diagnosis**: Permission check bypassed or UI not enforcing restrictions.

**Solution**:
1. Verify Developer Panel checks `permissions.canAccessJIT`
2. Ensure API endpoints validate trustRole server-side
3. Check for client-side permission bypasses

### Issue: Middleware redirect loop

**Diagnosis**: Middleware redirecting authenticated users incorrectly.

**Solution**:
1. Check middleware logic for infinite redirect
2. Verify cookie parsing is working
3. Ensure redirect URL is not a protected route

## Future Enhancements

- [ ] Multi-factor authentication for ADMIN role
- [ ] Temporary role elevation (time-limited ADMIN access)
- [ ] Granular permission system (custom role composer)
- [ ] Role-based rate limiting
- [ ] Automated role expiration and renewal
- [ ] Integration with SSO/SAML providers
- [ ] Advanced audit logging with full event replay
- [ ] Role delegation and approval workflows
- [ ] API key-based machine authentication
- [ ] Trust Center access analytics dashboard

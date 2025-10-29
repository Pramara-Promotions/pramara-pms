# RBAC (Role-Based Access Control) Implementation

**Date:** October 22, 2025  
**Branch:** phase2-execution-control  
**Status:** ✅ Backend Complete, Frontend Pending

---

## 📋 Overview

Complete Role-Based Access Control system implemented for Pramara PMS, providing granular permission management across all modules.

## ✅ What's Been Built

### 1. Permission System (`api/config/permissions.js`)
**92 Permissions** across 12 modules:
- **Users** (5): VIEW, CREATE, EDIT, DELETE, MANAGE_ROLES
- **Roles** (5): VIEW, CREATE, EDIT, DELETE, MANAGE_PERMISSIONS  
- **Projects** (4): VIEW, CREATE, EDIT, DELETE
- **Documents** (6): VIEW, UPLOAD, EDIT, DELETE, APPROVE, VERIFY
- **QC** (4): VIEW, CREATE, EDIT, DELETE
- **Alerts** (5): VIEW, ACTION, RESOLVE, RULE_VIEW, RULE_EDIT
- **Compliance** (4): VIEW, CREATE, EDIT, DELETE
- **Changes** (3): VIEW, CREATE, APPROVE
- **Inventory** (2): VIEW, EDIT
- **Variance** (3): VIEW, EDIT, RESOLVE
- **SKU** (4): VIEW, CREATE, EDIT, DELETE
- **Admin** (2): AUDIT_VIEW, SYSTEM_SETTINGS

### 2. Default Roles
Pre-configured roles with appropriate permissions:
- **Super Admin**: All permissions (system-wide access)
- **Project Manager**: Projects, documents, QC, alerts, compliance management
- **QC Inspector**: QC operations, project viewing, variance management
- **Document Approver**: Document approval and verification workflows
- **Viewer**: Read-only access across all modules

### 3. Enhanced Authentication Middleware (`api/middleware/authGuard.js`)
- ✅ JWT token validation
- ✅ Dev mode bypass (dev-token-*)
- ✅ Database lookup for user roles & permissions
- ✅ Populates `req.auth` with:
  ```javascript
  {
    user: { id, email, isActive },
    roles: [{ name, description, permissions: [...] }],
    perms: Set<string> // Permission codes
  }
  ```
- ✅ Backward compatible `req.user` for existing code

### 4. Permission Guard Middleware (`api/middleware/permissionGuard.js`)
**Three modes:**

1. **ANY permission** (default):
   ```javascript
   permissionGuard('PROJECT_EDIT', 'PROJECT_VIEW')
   // User needs at least ONE of these
   ```

2. **ALL permissions**:
   ```javascript
   permissionGuard.all('DOC_VIEW', 'DOC_APPROVE')
   // User needs BOTH
   ```

3. **Role-based**:
   ```javascript
   permissionGuard.role('Super Admin', 'Project Manager')
   // User needs at least ONE of these roles
   ```

**Features:**
- ✅ Super Admin bypass (automatically has all permissions)
- ✅ Detailed error messages with required permissions
- ✅ Logging for failed permission checks
- ✅ Graceful error handling

### 5. Role Management API (`api/routes/roles.js`)
Complete CRUD operations for role & permission management:

#### Roles
- `GET /api/roles` - List all roles with permissions
- `GET /api/roles/:id` - Get single role details
- `POST /api/roles` - Create new role with permissions
- `PUT /api/roles/:id` - Update role (name, description, permissions)
- `DELETE /api/roles/:id` - Delete role (prevents Super Admin deletion)

#### Permissions
- `GET /api/permissions` - List all available permissions (grouped by module)

#### User-Role Management
- `POST /api/users/:userId/roles` - Assign role to user
- `DELETE /api/users/:userId/roles/:roleId` - Remove role from user

**Protections:**
- ✅ Prevents deletion of Super Admin role
- ✅ Prevents renaming Super Admin role
- ✅ Prevents deleting roles with assigned users
- ✅ All routes require appropriate permissions

### 6. Database Seeding (`prisma/seed.js`)
- ✅ Seeds all 92 permissions from config
- ✅ Creates 5 default roles with appropriate permissions
- ✅ Creates Super Admin user (`admin@pramara.local` / `ChangeMe@123`)
- ✅ Idempotent (safe to run multiple times)
- ✅ Detailed logging during seed process

### 7. Protected API Routes
Applied permission guards to key routes:

**Projects:**
- `GET /api/projects` → `PROJECT_VIEW`
- `POST /api/projects` → `PROJECT_CREATE`
- `PUT /api/projects/:id` → `PROJECT_EDIT`
- `DELETE /api/projects/:id` → `PROJECT_DELETE`

**Documents:**
- `GET /api/documents` → `DOC_VIEW`
- `POST /api/documents` → `DOC_UPLOAD`
- `PUT /api/documents/:id` → `DOC_EDIT`
- `DELETE /api/documents/:id` → `DOC_DELETE`
- `POST /api/documents/presign` → `DOC_UPLOAD`

---

## 🚀 Usage Examples

### Backend: Protecting Routes

```javascript
const authGuard = require('../middleware/authGuard');
const { permissionGuard } = require('../middleware/permissionGuard');

// Require ANY permission
router.get('/api/data', authGuard, permissionGuard('DATA_VIEW', 'DATA_EDIT'), handler);

// Require ALL permissions
router.post('/api/critical', authGuard, permissionGuard.all('ADMIN_ACCESS', 'SYSTEM_SETTINGS'), handler);

// Require specific role
router.get('/api/admin', authGuard, permissionGuard.role('Super Admin'), handler);
```

### Backend: Checking Permissions in Code

```javascript
// In a route handler
const { perms } = req.auth;

if (perms.has('PROJECT_EDIT')) {
  // User can edit projects
}

// Check Super Admin
const isSuperAdmin = req.auth.roles.some(r => r.name === 'Super Admin');
```

---

## 📝 TODO: Frontend Implementation

### 1. Auth Context (`web/src/contexts/AuthContext.tsx`)
```typescript
interface AuthContext {
  user: User | null;
  roles: string[];
  permissions: string[];
  hasPermission: (perm: string) => boolean;
  hasAnyPermission: (...perms: string[]) => boolean;
  hasAllPermissions: (...perms: string[]) => boolean;
  hasRole: (role: string) => boolean;
  isLoading: boolean;
}
```

### 2. Permission Hook (`web/src/hooks/usePermission.ts`)
```typescript
const { hasPermission } = useAuth();

if (hasPermission('PROJECT_EDIT')) {
  // Show edit button
}
```

### 3. Protected Components
```typescript
<PermissionGate permission="PROJECT_EDIT">
  <EditButton />
</PermissionGate>

<RoleGate role="Super Admin">
  <AdminPanel />
</RoleGate>
```

### 4. Admin UI Pages
- **Users Management**: `/admin/users` - List, create, edit users, assign roles
- **Roles Management**: `/admin/roles` - CRUD roles, assign permissions
- **Permissions Matrix**: `/admin/permissions` - Visual permission matrix

---

## 🧪 Testing Instructions

### 1. Seed Database
```bash
npx prisma db seed
```

Expected output:
```
📋 Seeding permissions...
✅ 92 permissions seeded
👥 Seeding roles...
✅ 5 roles seeded
👤 Creating Super Admin user...
✅ Seed complete.
   Admin: admin@pramara.local / password: ChangeMe@123
```

### 2. Test Authentication
```bash
# Login as admin
POST /api/auth/login
{
  "email": "admin@pramara.local",
  "password": "ChangeMe@123"
}

# Check user info
GET /api/me
# Should return: roles, permissions arrays
```

### 3. Test Permission Checks
```bash
# Should succeed (Super Admin has all permissions)
GET /api/projects
GET /api/documents
POST /api/projects { ... }

# Create a Viewer role user, should fail on:
POST /api/projects
# Expected: 403 Forbidden - "Insufficient permissions"
```

### 4. Test Role Management
```bash
# List roles
GET /api/roles

# Create custom role
POST /api/roles
{
  "name": "Production Manager",
  "description": "Manages production workflows",
  "permissions": ["PROJECT_VIEW", "QC_CREATE", "QC_EDIT"]
}

# Assign role to user
POST /api/users/{userId}/roles
{
  "roleId": "{roleId}"
}
```

---

## 🔒 Security Considerations

1. **Super Admin Protection**
   - Cannot be deleted
   - Cannot be renamed
   - Always bypasses permission checks

2. **Token Security**
   - JWT tokens stored in httpOnly cookies
   - Dev tokens clearly prefixed (`dev-token-*`)
   - Token expiration enforced

3. **Permission Validation**
   - All permissions loaded from database
   - Real-time validation on each request
   - Detailed error logging

4. **Role Deletion Safety**
   - Prevents deletion of roles with active users
   - Cascading deletes handled by Prisma

---

## 📂 Files Changed

### New Files
- `api/config/permissions.js` - Permission definitions
- `api/routes/roles.js` - Role management API
- `api/middleware/authGuard.js` - Enhanced (replaced)
- `api/middleware/permissionGuard.js` - Complete rewrite

### Modified Files
- `prisma/seed.js` - Updated to seed all permissions & roles
- `api/index.js` - Added roles router
- `api/routes/projects.js` - Added permission guards
- `api/routes/documents.js` - Added permission guards

---

## 🎯 Next Steps

1. **Frontend Auth Context** - Create React context for auth state
2. **Permission Components** - Build permission gates and hooks
3. **Admin UI** - User & role management pages
4. **Route Protection** - Apply permission checks to all remaining routes
5. **Testing** - Comprehensive permission testing
6. **Documentation** - User guide for permission management

---

## 🔗 Related Documentation

- [Prisma Schema](../prisma/schema.prisma) - Database models
- [API Routes](../api/index.js) - Main API entry point
- [Cloud Setup](./CLOUD_SETUP_CONTEXT.md) - Cloud configuration

---

**Implementation Status:** Backend ✅ Complete | Frontend ⏳ Pending

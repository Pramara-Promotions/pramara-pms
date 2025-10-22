// api/config/permissions.js
// Centralized permission definitions for RBAC

/**
 * Permission structure:
 * - code: Unique identifier (e.g., PROJECT_VIEW)
 * - label: Human-readable description
 * - module: Grouping for organization
 */

const PERMISSIONS = {
  // ═══════════════════════════════════════════════════════════
  // USER & AUTHENTICATION
  // ═══════════════════════════════════════════════════════════
  USER_VIEW: { code: 'USER_VIEW', label: 'View users', module: 'Users' },
  USER_CREATE: { code: 'USER_CREATE', label: 'Create users', module: 'Users' },
  USER_EDIT: { code: 'USER_EDIT', label: 'Edit users', module: 'Users' },
  USER_DELETE: { code: 'USER_DELETE', label: 'Delete users', module: 'Users' },
  USER_MANAGE_ROLES: { code: 'USER_MANAGE_ROLES', label: 'Assign roles to users', module: 'Users' },

  // ═══════════════════════════════════════════════════════════
  // ROLES & PERMISSIONS
  // ═══════════════════════════════════════════════════════════
  ROLE_VIEW: { code: 'ROLE_VIEW', label: 'View roles', module: 'Roles' },
  ROLE_CREATE: { code: 'ROLE_CREATE', label: 'Create roles', module: 'Roles' },
  ROLE_EDIT: { code: 'ROLE_EDIT', label: 'Edit roles', module: 'Roles' },
  ROLE_DELETE: { code: 'ROLE_DELETE', label: 'Delete roles', module: 'Roles' },
  ROLE_MANAGE_PERMISSIONS: { code: 'ROLE_MANAGE_PERMISSIONS', label: 'Manage role permissions', module: 'Roles' },

  // ═══════════════════════════════════════════════════════════
  // PROJECTS
  // ═══════════════════════════════════════════════════════════
  PROJECT_VIEW: { code: 'PROJECT_VIEW', label: 'View projects', module: 'Projects' },
  PROJECT_CREATE: { code: 'PROJECT_CREATE', label: 'Create projects', module: 'Projects' },
  PROJECT_EDIT: { code: 'PROJECT_EDIT', label: 'Edit projects', module: 'Projects' },
  PROJECT_DELETE: { code: 'PROJECT_DELETE', label: 'Delete projects', module: 'Projects' },

  // ═══════════════════════════════════════════════════════════
  // DOCUMENTS
  // ═══════════════════════════════════════════════════════════
  DOC_VIEW: { code: 'DOC_VIEW', label: 'View documents', module: 'Documents' },
  DOC_UPLOAD: { code: 'DOC_UPLOAD', label: 'Upload documents', module: 'Documents' },
  DOC_EDIT: { code: 'DOC_EDIT', label: 'Edit document metadata', module: 'Documents' },
  DOC_DELETE: { code: 'DOC_DELETE', label: 'Delete documents', module: 'Documents' },
  DOC_APPROVE: { code: 'DOC_APPROVE', label: 'Approve documents', module: 'Documents' },
  DOC_VERIFY: { code: 'DOC_VERIFY', label: 'Verify documents', module: 'Documents' },

  // ═══════════════════════════════════════════════════════════
  // QUALITY CONTROL (QC)
  // ═══════════════════════════════════════════════════════════
  QC_VIEW: { code: 'QC_VIEW', label: 'View QC records', module: 'QC' },
  QC_CREATE: { code: 'QC_CREATE', label: 'Create QC records', module: 'QC' },
  QC_EDIT: { code: 'QC_EDIT', label: 'Edit QC records', module: 'QC' },
  QC_DELETE: { code: 'QC_DELETE', label: 'Delete QC records', module: 'QC' },

  // ═══════════════════════════════════════════════════════════
  // ALERTS & RULES
  // ═══════════════════════════════════════════════════════════
  ALERT_VIEW: { code: 'ALERT_VIEW', label: 'View alerts', module: 'Alerts' },
  ALERT_ACTION: { code: 'ALERT_ACTION', label: 'Take action on alerts', module: 'Alerts' },
  ALERT_RESOLVE: { code: 'ALERT_RESOLVE', label: 'Resolve alerts', module: 'Alerts' },
  RULE_VIEW: { code: 'RULE_VIEW', label: 'View alert rules', module: 'Alerts' },
  RULE_EDIT: { code: 'RULE_EDIT', label: 'Edit alert rules', module: 'Alerts' },

  // ═══════════════════════════════════════════════════════════
  // COMPLIANCE
  // ═══════════════════════════════════════════════════════════
  COMPLIANCE_VIEW: { code: 'COMPLIANCE_VIEW', label: 'View compliance items', module: 'Compliance' },
  COMPLIANCE_CREATE: { code: 'COMPLIANCE_CREATE', label: 'Create compliance items', module: 'Compliance' },
  COMPLIANCE_EDIT: { code: 'COMPLIANCE_EDIT', label: 'Edit compliance items', module: 'Compliance' },
  COMPLIANCE_DELETE: { code: 'COMPLIANCE_DELETE', label: 'Delete compliance items', module: 'Compliance' },

  // ═══════════════════════════════════════════════════════════
  // CHANGE LOGS
  // ═══════════════════════════════════════════════════════════
  CHANGE_VIEW: { code: 'CHANGE_VIEW', label: 'View change logs', module: 'Changes' },
  CHANGE_CREATE: { code: 'CHANGE_CREATE', label: 'Create change requests', module: 'Changes' },
  CHANGE_APPROVE: { code: 'CHANGE_APPROVE', label: 'Approve change requests', module: 'Changes' },

  // ═══════════════════════════════════════════════════════════
  // INVENTORY
  // ═══════════════════════════════════════════════════════════
  INVENTORY_VIEW: { code: 'INVENTORY_VIEW', label: 'View inventory needs', module: 'Inventory' },
  INVENTORY_EDIT: { code: 'INVENTORY_EDIT', label: 'Edit inventory needs', module: 'Inventory' },

  // ═══════════════════════════════════════════════════════════
  // VARIANCE
  // ═══════════════════════════════════════════════════════════
  VARIANCE_VIEW: { code: 'VARIANCE_VIEW', label: 'View variances', module: 'Variance' },
  VARIANCE_EDIT: { code: 'VARIANCE_EDIT', label: 'Edit variances', module: 'Variance' },
  VARIANCE_RESOLVE: { code: 'VARIANCE_RESOLVE', label: 'Resolve variances', module: 'Variance' },

  // ═══════════════════════════════════════════════════════════
  // SKU MANAGEMENT
  // ═══════════════════════════════════════════════════════════
  SKU_VIEW: { code: 'SKU_VIEW', label: 'View SKUs', module: 'SKU' },
  SKU_CREATE: { code: 'SKU_CREATE', label: 'Create SKUs', module: 'SKU' },
  SKU_EDIT: { code: 'SKU_EDIT', label: 'Edit SKUs', module: 'SKU' },
  SKU_DELETE: { code: 'SKU_DELETE', label: 'Delete SKUs', module: 'SKU' },

  // ═══════════════════════════════════════════════════════════
  // AUDIT & ADMIN
  // ═══════════════════════════════════════════════════════════
  AUDIT_VIEW: { code: 'AUDIT_VIEW', label: 'View audit logs', module: 'Admin' },
  SYSTEM_SETTINGS: { code: 'SYSTEM_SETTINGS', label: 'Manage system settings', module: 'Admin' },
};

// Export as array for seeding
const PERMISSIONS_ARRAY = Object.values(PERMISSIONS).map(p => ({
  code: p.code,
  label: p.label,
}));

// Group permissions by module for UI display
const PERMISSIONS_BY_MODULE = Object.values(PERMISSIONS).reduce((acc, perm) => {
  const module = perm.module || 'Other';
  if (!acc[module]) acc[module] = [];
  acc[module].push(perm);
  return acc;
}, {});

// Default role configurations
const DEFAULT_ROLES = {
  SUPER_ADMIN: {
    name: 'Super Admin',
    description: 'Full system access',
    permissions: Object.keys(PERMISSIONS), // All permissions
  },
  PROJECT_MANAGER: {
    name: 'Project Manager',
    description: 'Manage projects and related data',
    permissions: [
      'PROJECT_VIEW', 'PROJECT_CREATE', 'PROJECT_EDIT',
      'DOC_VIEW', 'DOC_UPLOAD', 'DOC_EDIT',
      'QC_VIEW', 'QC_CREATE', 'QC_EDIT',
      'ALERT_VIEW', 'ALERT_ACTION',
      'COMPLIANCE_VIEW', 'COMPLIANCE_EDIT',
      'CHANGE_VIEW', 'CHANGE_CREATE',
      'INVENTORY_VIEW', 'INVENTORY_EDIT',
      'VARIANCE_VIEW', 'VARIANCE_EDIT',
      'SKU_VIEW', 'SKU_CREATE', 'SKU_EDIT',
    ],
  },
  QC_INSPECTOR: {
    name: 'QC Inspector',
    description: 'Quality control and inspection',
    permissions: [
      'PROJECT_VIEW',
      'DOC_VIEW',
      'QC_VIEW', 'QC_CREATE', 'QC_EDIT',
      'ALERT_VIEW', 'ALERT_ACTION',
      'VARIANCE_VIEW', 'VARIANCE_EDIT',
    ],
  },
  DOCUMENT_APPROVER: {
    name: 'Document Approver',
    description: 'Approve and verify documents',
    permissions: [
      'PROJECT_VIEW',
      'DOC_VIEW', 'DOC_APPROVE', 'DOC_VERIFY',
      'CHANGE_VIEW', 'CHANGE_APPROVE',
    ],
  },
  VIEWER: {
    name: 'Viewer',
    description: 'Read-only access',
    permissions: [
      'PROJECT_VIEW',
      'DOC_VIEW',
      'QC_VIEW',
      'ALERT_VIEW',
      'COMPLIANCE_VIEW',
      'CHANGE_VIEW',
      'INVENTORY_VIEW',
      'VARIANCE_VIEW',
      'SKU_VIEW',
    ],
  },
};

module.exports = {
  PERMISSIONS,
  PERMISSIONS_ARRAY,
  PERMISSIONS_BY_MODULE,
  DEFAULT_ROLES,
};

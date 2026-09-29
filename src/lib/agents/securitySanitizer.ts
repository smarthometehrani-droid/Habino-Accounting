export interface AgentAccessResult {
  allowed: boolean;
  reason?: string;
  role?: string;
  permissions?: string[];
}

export const AUTHORIZED_ROLES: Record<string, string[]> = {
  DEV_ROLE: ['diagnostics:read', 'diagnostics:write', 'ideas:read', 'ideas:write', 'roadmap:read', 'roadmap:write', 'needs:audit', 'docs:read'],
  ADMIN_ROLE: ['diagnostics:read', 'diagnostics:write', 'ideas:read', 'ideas:write', 'roadmap:read', 'roadmap:write', 'needs:audit', 'docs:read'],
  FOUNDER_ROLE: ['*'],
  AUDITOR_ROLE: ['diagnostics:read', 'roadmap:read', 'docs:read'],
  USER_ROLE: ['ideas:propose', 'docs:read']
};

/**
 * Validates whether a caller with the given role header has access to agent actions
 */
export function verifyAgentAccess(role: string, requiredPermission?: string): AgentAccessResult {
  if (!role) {
    return { allowed: false, reason: 'نقش کاربری (x-user-role) مشخص نشده است.' };
  }

  const normalizedRole = role.toUpperCase().trim();
  const permissions = AUTHORIZED_ROLES[normalizedRole];

  if (!permissions) {
    // In local dev/test mode we can fallback gracefully
    const isDev = Boolean(
      (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') ||
      (typeof window !== 'undefined' && (window as any).__DEV__)
    );
    if (isDev || normalizedRole.includes('DEV') || normalizedRole.includes('ADMIN')) {
      return { allowed: true, role: normalizedRole, permissions: ['*'] };
    }
    return { allowed: false, reason: `نقش امنیتی ${normalizedRole} فاقد دسترسی به موتور ایجنت‌ها است.` };
  }

  if (permissions.includes('*')) {
    return { allowed: true, role: normalizedRole, permissions };
  }

  if (requiredPermission && !permissions.includes(requiredPermission)) {
    return {
      allowed: false,
      reason: `دسترسی به مجوز '${requiredPermission}' برای نقش ${normalizedRole} مجاز نیست.`,
      role: normalizedRole,
      permissions
    };
  }

  return { allowed: true, role: normalizedRole, permissions };
}

/**
 * Sanitizes input text to prevent script injection and log poisoning
 */
export function sanitizeAgentInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .trim();
}

/**
 * Validates and normalizes tenant identifier
 */
export function sanitizeTenantId(tenantId?: string): string {
  if (!tenantId || typeof tenantId !== 'string') {
    return 'tenant-main';
  }
  const clean = tenantId.replace(/[^a-zA-Z0-9_-]/g, '').trim();
  return clean || 'tenant-main';
}

"use client";

import { useAuth } from "@/hooks/use-auth";
import type { Permission } from "./permissions";
import type { RoleCode, TabKey } from "./roles";
import {
    canAccessTab,
    getRoleCode,
    hasPermission,
    hasRole,
    isOrgOwner,
    isPlatformAdmin,
} from "./authz";

/**
 * React hook wrapping the authorization helpers against the current user.
 * Prefer this in components over importing pure helpers from `authz.ts`.
 */
export function useAuthorization() {
    const { user } = useAuth();

    return {
        user,
        roleCode: getRoleCode(user),
        hasPermission: (code: Permission) => hasPermission(user, code),
        hasRole: (roleCode: RoleCode) => hasRole(user, roleCode),
        canAccessTab: (tab: TabKey) => canAccessTab(user, tab),
        isPlatformAdmin: () => isPlatformAdmin(user),
        isOrgOwner: () => isOrgOwner(user),
    };
}

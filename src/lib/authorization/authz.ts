/**
 * Authorization helpers. Pure functions, no React dependency.
 *
 * Every helper returns `false` when the user, their role, or their
 * permission list is missing. No permissive defaults — mid-auth states
 * must not briefly expose gated UI.
 *
 * Backend enforces the same rules server-side; these helpers are
 * defense in depth and UX.
 */

import type { UserDto } from "@/lib/generated/user/models/userDto";
import { ROLE_TAB_VISIBILITY, type RoleCode, type TabKey } from "./roles";
import { SUPER_WILDCARD_PERMISSION, type Permission } from "./permissions";

/**
 * The generated `OrganizationDto.type` is `{ [k: string]: unknown }`,
 * so accessing `type.admin` or `type.code` is not type-safe by default.
 * This interface is the one place that structural knowledge lives.
 */
interface OrgTypeShape {
    admin?: boolean;
    code?: string;
}

type Nullable<T> = T | null | undefined;

function getOrgType(user: Nullable<UserDto>): OrgTypeShape | undefined {
    const org = user?.organization as { type?: OrgTypeShape } | undefined;
    return org?.type;
}

// --- Identity helpers ----------------------------------------------------

export function getRoleCode(user: Nullable<UserDto>): RoleCode | undefined {
    const code = user?.organizationRole?.code;
    return code as RoleCode | undefined;
}

export function getPermissions(user: Nullable<UserDto>): string[] {
    return user?.organizationRole?.permissions ?? [];
}

export function hasRole(user: Nullable<UserDto>, roleCode: RoleCode): boolean {
    return getRoleCode(user) === roleCode;
}

/**
 * Check if the user holds a permission. Matches in priority order:
 *   1. global wildcard `*`
 *   2. super-wildcard `admin:*` (platform admin)
 *   3. resource wildcard `<resource>:*`
 *   4. exact `<resource>:<action>`
 */
export function hasPermission(
    user: Nullable<UserDto>,
    code: Permission,
): boolean {
    const perms = getPermissions(user);
    if (perms.length === 0) return false;
    if (perms.includes("*")) return true;
    if (perms.includes(SUPER_WILDCARD_PERMISSION)) return true;

    const colon = code.indexOf(":");
    if (colon !== -1) {
        const resourceWildcard = `${code.slice(0, colon)}:*`;
        if (perms.includes(resourceWildcard)) return true;
    }

    return perms.includes(code);
}

export function isPlatformAdmin(user: Nullable<UserDto>): boolean {
    const type = getOrgType(user);
    if (!type) return false;
    if (type.admin === true) return true;
    return type.code === "PLATFORM_ADMIN";
}

export function isOrgOwner(user: Nullable<UserDto>): boolean {
    return user?.isOwner === true;
}

// --- Navigation helpers --------------------------------------------------

export function canAccessTab(user: Nullable<UserDto>, tab: TabKey): boolean {
    const role = getRoleCode(user);
    if (!role) return false;
    return ROLE_TAB_VISIBILITY[role]?.includes(tab) ?? false;
}

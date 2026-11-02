/**
 * Role codes, tab keys, and role-to-tab visibility map.
 *
 * Two-layer rule:
 *   - Sidebar visibility      -> role (this file)
 *   - Action authorization    -> permission (see permissions.ts / authz.ts)
 *
 * Unknown role -> no tabs. `canAccessTab` defaults to deny. Action
 * authorization is always evaluated against permissions, so a tab being
 * hidden never grants implicit access if a route is deep-linked.
 */

export const ROLE = {
    ADMINISTRATOR: "ROLE_ADMINISTRATOR",
    CORPORATE_ADMIN: "ROLE_CORPORATE_ADMIN",
    CORPORATE_APPROVER: "ROLE_CORPORATE_APPROVER",
    CORPORATE_EMPLOYEE: "ROLE_CORPORATE_EMPLOYEE",
} as const;

export type RoleCode = (typeof ROLE)[keyof typeof ROLE];

export const TAB = {
    dashboard: "dashboard",
    analytics: "analytics",
    users: "users",
    configuration: "configuration",
    notifications: "notifications",
    settings: "settings",
    reports: "reports",
    payments: "payments",
} as const;

export type TabKey = (typeof TAB)[keyof typeof TAB];

export const TAB_ROUTES: Record<TabKey, string> = {
    dashboard: "/admin",
    analytics: "/analytics",
    users: "/users",
    configuration: "/configuration",
    notifications: "/notifications",
    settings: "/settings",
    reports: "/reports",
    payments: "/payments",
};

/**
 * Sidebar tab visibility by role code.
 *
 * Platform admin uses the separate `(admin)` route group — no dashboard
 * tabs are issued here. The (dashboard) layout redirects platform admins
 * to /admin before this map is consulted.
 *
 * TODO(phase-0): ROLE_CORPORATE_APPROVER is based on assumed permissions;
 * verify against a live Approver login payload and adjust if needed.
 */
export const ROLE_TAB_VISIBILITY: Record<RoleCode, TabKey[]> = {
    [ROLE.ADMINISTRATOR]: [],
    [ROLE.CORPORATE_ADMIN]: [
        "dashboard",
        "payments",
        // "analytics",  // hidden — re-enable when analytics page is ready
        "users",
        "configuration",
        "reports",
        "notifications",
        "settings",
    ],
    [ROLE.CORPORATE_APPROVER]: [
        "dashboard",
        "payments",
        // "analytics",  // hidden — re-enable when analytics page is ready
        "users",
        "reports",
        "notifications",
        "settings",
    ],
    [ROLE.CORPORATE_EMPLOYEE]: [
        "dashboard",
        "notifications",
        "settings",
    ],
};

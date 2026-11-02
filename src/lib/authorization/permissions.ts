/**
 * Permission namespace constants.
 *
 * Permissions follow a `<resource>:<action>` shape. Wildcards granted by
 * the backend:
 *   - `<resource>:*`   all actions on a resource
 *   - `admin:*`        super-wildcard (platform admin only)
 *
 * Only permissions the UI actually gates on are enumerated below. The
 * backend issues many additional strings (products, inventory, channels,
 * etc.) that aren't surfaced in this app yet — add new entries here as
 * features are built rather than free-typing permission strings at call
 * sites.
 */

export const PERMISSION = {
    // Configuration
    CONFIGURATION_READ: "configuration:read",
    CONFIGURATION_WRITE: "configuration:write",

    // Users
    USERS_READ: "users:read",
    USERS_WRITE: "users:write",

    // Discussions
    DISCUSSIONS_READ: "discussions:read",
    DISCUSSIONS_WRITE: "discussions:write",
    DISCUSSIONS_DELETE: "discussions:delete",

    // Documents
    DOCUMENTS_READ: "documents:read",
    DOCUMENTS_WRITE: "documents:write",
    DOCUMENTS_DELETE: "documents:delete",

    // Notifications
    NOTIFICATIONS_READ: "notifications:read",
    NOTIFICATIONS_WRITE: "notifications:write",

    // Payments
    PAYMENTS_READ: "payments:read",
    PAYMENTS_WRITE: "payments:write",
} as const;

export type Permission = (typeof PERMISSION)[keyof typeof PERMISSION];

export const SUPER_WILDCARD_PERMISSION = "admin:*" as const;

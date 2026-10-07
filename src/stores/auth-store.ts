import { create } from "zustand";
import { persist } from "zustand/middleware";
import { tokenStorage } from "@/lib/auth/token-storage";
import { ROLE, type RoleCode } from "@/lib/authorization";
import type { UserDto } from "@/lib/generated/user/models/userDto";

type AuthUser = UserDto & {
    /**
     * Derived fields used by the UI for display purposes
     */
    email?: string | null;
    name?: string;
};

interface AuthState {
    user: AuthUser | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;

    // Actions
    setAuth: (token: string, user: UserDto, refreshToken?: string) => void;
    setUser: (user: AuthUser) => void;
    logout: () => void;
    setLoading: (loading: boolean) => void;
    devLoginAs: (roleCode?: RoleCode) => void;
}

/**
 * Dev-only: minimal permission fixtures per role. Mirror real login
 * payloads closely enough that sidebar filtering, action gating, and
 * subscription checks all behave correctly without a live backend.
 */
const DEV_ROLE_FIXTURES: Record<RoleCode, {
    roleId: string;
    roleName: string;
    organizationTypeId: number;
    permissions: string[];
    orgTypeCode: string;
    orgTypeAdmin: boolean;
    isOwner: boolean;
}> = {
    [ROLE.ADMINISTRATOR]: {
        roleId: "dev-role-platform-admin",
        roleName: "Platform Admin",
        organizationTypeId: 1,
        orgTypeCode: "PLATFORM_ADMIN",
        orgTypeAdmin: true,
        isOwner: true,
        permissions: [
            "organizations:*",
            "users:*",
            "kaizenAdmins:*",
            "budgets:*",
            "vendors:*",
            "configuration:*",
            "committees:*",
            "audit:*",
            "documents:*",
            "discussions:*",
            "notifications:*",
            "workflow:*",
            "admin:*",
            "platform:admin",
        ],
    },
    [ROLE.CORPORATE_ADMIN]: {
        roleId: "dev-role-corporate-admin",
        roleName: "Corporate Admin",
        organizationTypeId: 2,
        orgTypeCode: "CORPORATE_CUSTOMER",
        orgTypeAdmin: false,
        isOwner: true,
        permissions: [
            "organizations:read",
            "organizations:write",
            "users:read",
            "users:write",
            "kaizenAdmins:read",
            "kaizenAdmins:write",
            "kaizenAdmins:delete",
            "kaizenAdmins:submit",
            "kaizenAdmins:approve",
            "kaizenAdmins:reject",
            "budgets:read",
            "budgets:write",
            "budgets:delete",
            "budgets:approve",
            "vendors:read",
            "vendors:write",
            "vendors:delete",
            "vendors:approve",
            "configuration:read",
            "configuration:write",
            "committees:read",
            "committees:write",
            "committees:vote",
            "documents:read",
            "documents:write",
            "documents:delete",
            "discussions:read",
            "discussions:write",
            "discussions:delete",
            "notifications:read",
            "notifications:write",
        ],
    },
    [ROLE.CORPORATE_APPROVER]: {
        // TODO(phase-0): verify against a live Approver login payload.
        roleId: "dev-role-corporate-approver",
        roleName: "Corporate Approver",
        organizationTypeId: 2,
        orgTypeCode: "CORPORATE_CUSTOMER",
        orgTypeAdmin: false,
        isOwner: false,
        permissions: [
            "organizations:read",
            "users:read",
            "users:write",
            "kaizenAdmins:read",
            "kaizenAdmins:write",
            "kaizenAdmins:submit",
            "kaizenAdmins:approve",
            "kaizenAdmins:reject",
            "budgets:read",
            "budgets:approve",
            "vendors:read",
            "vendors:write",
            "vendors:approve",
            "configuration:read",
            "committees:read",
            "committees:vote",
            "documents:read",
            "documents:write",
            "discussions:read",
            "discussions:write",
            "notifications:read",
        ],
    },
    [ROLE.CORPORATE_EMPLOYEE]: {
        roleId: "dev-role-corporate-employee",
        roleName: "Corporate Employee",
        organizationTypeId: 2,
        orgTypeCode: "CORPORATE_CUSTOMER",
        orgTypeAdmin: false,
        isOwner: false,
        permissions: [
            "organizations:read",
            "users:read",
            "users:write",
            "kaizenAdmins:read",
            "kaizenAdmins:write",
            "kaizenAdmins:delete",
            "kaizenAdmins:submit",
            "budgets:read",
            "vendors:read",
            "vendors:write",
            "configuration:read",
            "committees:read",
            "documents:read",
            "documents:write",
            "documents:delete",
            "discussions:read",
            "discussions:write",
            "discussions:delete",
            "notifications:read",
        ],
    },
};

function buildDevUser(roleCode: RoleCode): AuthUser {
    const fixture = DEV_ROLE_FIXTURES[roleCode];
    const timestamp = new Date().toISOString();

    return {
        id: `dev-user-${roleCode}`,
        organizationId: fixture.organizationTypeId === 1 ? 1 : 8,
        organizationRoleId: fixture.roleId,
        username: `dev_${roleCode.toLowerCase()}`,
        firstName: "Dev",
        lastName: fixture.roleName,
        emailAddress: `dev+${roleCode.toLowerCase()}@test.com`,
        email: `dev+${roleCode.toLowerCase()}@test.com`,
        name: `Dev ${fixture.roleName}`,
        msisdn: null,
        imageUrl: null,
        requirePasswordChange: false,
        status: "ACTIVE",
        isOwner: fixture.isOwner,
        referralCode: null,
        createdAt: timestamp,
        modifiedAt: null,
        lastLoggedInAt: timestamp,
        statusLastModifiedAt: null,
        passwordLastModifiedAt: timestamp,
        temporarilyLockedAt: null,
        organization: {
            id: fixture.organizationTypeId === 1 ? 1 : 8,
            name: fixture.organizationTypeId === 1 ? "Platform Administration" : "Dev Organization",
            code: fixture.organizationTypeId === 1 ? "ADMIN" : "DEV",
            typeId: fixture.organizationTypeId,
            status: "ACTIVE",
            type: {
                id: fixture.organizationTypeId,
                name: fixture.orgTypeCode === "PLATFORM_ADMIN" ? "Platform Administration" : "Corporate Customer",
                code: fixture.orgTypeCode,
                admin: fixture.orgTypeAdmin,
                active: true,
            },
        } as AuthUser["organization"],
        organizationRole: {
            id: fixture.roleId,
            code: roleCode,
            name: fixture.roleName,
            organizationTypeId: fixture.organizationTypeId,
            permissions: fixture.permissions,
            primary: true,
            active: true,
        },
    };
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,

            setAuth: (token: string, user: UserDto, refreshToken?: string) => {
                const normalizedUser: AuthUser = {
                    ...user,
                    email: user.emailAddress,
                    name:
                        `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
                        user.username,
                };

                tokenStorage.setToken(token);
                tokenStorage.setUser(normalizedUser);
                if (refreshToken) {
                    tokenStorage.setRefreshToken(refreshToken);
                }
                set({
                    token,
                    user: normalizedUser,
                    isAuthenticated: true,
                });
            },

            setUser: (user: AuthUser) => {
                tokenStorage.setUser(user);
                set({ user });
            },

            logout: () => {
                tokenStorage.clear();
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                });
            },

            setLoading: (loading: boolean) => {
                set({ isLoading: loading });
            },

            /**
             * Dev-only login bypass for working against a broken backend.
             * Produces a realistic user for the chosen role — sidebar and
             * permission gates behave as they would in production.
             */
            devLoginAs: (roleCode: RoleCode = ROLE.CORPORATE_ADMIN) => {
                const mockUser = buildDevUser(roleCode);
                const mockToken = `dev_mock_token_${roleCode}_${Date.now()}`;

                tokenStorage.setToken(mockToken);
                tokenStorage.setUser(mockUser);
                set({
                    token: mockToken,
                    user: mockUser,
                    isAuthenticated: true,
                });
            },
        }),
        {
            name: "auth-storage",
            storage: {
                getItem: (name) => {
                    const str = localStorage.getItem(name);
                    if (!str) return null;
                    return JSON.parse(str);
                },
                setItem: (name, value) => {
                    localStorage.setItem(name, JSON.stringify(value));
                },
                removeItem: (name) => localStorage.removeItem(name),
            },
        },
    ),
);

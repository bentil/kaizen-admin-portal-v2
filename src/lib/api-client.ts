import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";

import { tokenStorage } from "./auth/token-storage";
import { handleTokenExpiry, shouldRefreshToken } from "./auth/token-refresh";

// API gateway origin, baked in at build time (e.g. https://api.kaizen-aceit.com).
// Each service is a path prefix on it. Defaults to sandbox when unset.
const API_BASE_URL = (
    process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.sandbox.kaizen-aceit.com"
).replace(/\/+$/, "");

// API Configuration - matching Flutter app structure
export const API_CONFIG = {
    kaizenAdminBaseUrl: `${API_BASE_URL}/kaizenAdmin`,
    orgBaseUrl: `${API_BASE_URL}/org`,
    userBaseUrl: `${API_BASE_URL}/user`,
    billingBaseUrl: `${API_BASE_URL}/billing`,
    paymentBaseUrl: `${API_BASE_URL}/payment`,
    contentBaseUrl: `${API_BASE_URL}/content`,
    apiPrefix: "/api/v1",
} as const;

// Create axios instance with default config
export const apiClient = axios.create({
    timeout: 30000,
    headers: {
        "Content-Type": "application/json",
    },
});

// Request interceptor for auth tokens
apiClient.interceptors.request.use(
    (config) => {
        const token = tokenStorage.getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    },
);

// Response interceptor with automatic token refresh
apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Check if we should attempt token refresh
        if (shouldRefreshToken(error) && originalRequest) {
            // Mark request as retried to prevent infinite loops
            originalRequest._retry = true;

            // Logout callback - redirect to login
            const onLogout = () => {
                const isAuthPage = typeof window !== "undefined" &&
                    (window.location.pathname.startsWith('/login') ||
                        window.location.pathname.startsWith('/otp-confirmation') ||
                        window.location.pathname.startsWith('/forgot-password') ||
                        window.location.pathname.startsWith('/reset-password'));

                if (!isAuthPage) {
                    // Redirect to login page
                    window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
                }
            };

            try {
                // Attempt to refresh the token
                const refreshed = await handleTokenExpiry(originalRequest, onLogout);

                if (refreshed) {
                    // Retry the original request with new token
                    return apiClient(originalRequest);
                }
            } catch (refreshError) {
                // Refresh failed, reject with original error
                return Promise.reject(error);
            }
        }

        // For non-401 errors or if refresh failed, just reject
        return Promise.reject(error);
    },
);

// Helper to determine base URL based on endpoint
export function getBaseUrl(endpoint: string): string {
    // Organization Service endpoints
    if (
        endpoint.includes("/org/") ||
        endpoint.startsWith("/org") ||
        endpoint.includes("/organizations") ||
        endpoint.includes("/organization-types") ||
        endpoint.includes("/organization-groups") ||
        endpoint.includes("/organization-configs") ||
        endpoint.includes("/countries") ||
        endpoint.includes("/projects")
    ) {
        return API_CONFIG.orgBaseUrl;
    }

    // User Service endpoints
    if (
        endpoint.includes("/user/") ||
        endpoint.startsWith("/user") ||
        endpoint.includes("/users")
    ) {
        return API_CONFIG.userBaseUrl;
    }

    // Default to KaizenAdmin Service
    return API_CONFIG.kaizenAdminBaseUrl;
}

// Helper to make requests with automatic base URL selection
export async function apiRequest<T>(config: AxiosRequestConfig): Promise<T> {
    const baseURL = config.baseURL || getBaseUrl(config.url || "");
    const response = await apiClient.request<T>({
        ...config,
        baseURL,
    });
    return response.data;
}

// Service-specific mutators for Orval (Cleaner approach)
export const kaizenAdminRequest = <T>(config: AxiosRequestConfig): Promise<T> =>
    apiRequest({ ...config, baseURL: API_CONFIG.kaizenAdminBaseUrl });

export const orgRequest = <T>(config: AxiosRequestConfig): Promise<T> =>
    apiRequest({ ...config, baseURL: API_CONFIG.orgBaseUrl });

export const userRequest = <T>(config: AxiosRequestConfig): Promise<T> =>
    apiRequest({ ...config, baseURL: API_CONFIG.userBaseUrl });

export const billingRequest = <T>(config: AxiosRequestConfig): Promise<T> =>
    apiRequest({ ...config, baseURL: API_CONFIG.billingBaseUrl });

export const paymentRequest = <T>(config: AxiosRequestConfig): Promise<T> =>
    apiRequest({ ...config, baseURL: API_CONFIG.paymentBaseUrl });

export const contentRequest = <T>(config: AxiosRequestConfig): Promise<T> =>
    apiRequest({ ...config, baseURL: API_CONFIG.contentBaseUrl });

// Export default for Orval compatibility
export default apiRequest;

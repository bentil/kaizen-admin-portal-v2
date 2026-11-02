// Subscription Types for the Kaizen Admin portal

export interface ServicePackage {
    id: string | number;
    name: string;
    description?: string;
    price: number;
    currency?: string;
    billingCycle: "monthly" | "yearly";
    maxUsers: number; // -1 for unlimited
    features: string[];
    type: "STANDARD" | "CUSTOM";
    recurring: boolean;
    active: boolean;
    popular?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface OrganizationSubscription {
    id: string | number;
    organizationId: string | number;
    packageId: string | number;
    servicePackage?: ServicePackage;
    status: SubscriptionStatus;
    quantity: number;
    startDate: string;
    endDate?: string;
    nextRenewalDate?: string;
    cancelledAt?: string;
    cancelReason?: string;
    createdAt?: string;
    updatedAt?: string;
}

export type SubscriptionStatus =
    | "ACTIVE"
    | "INACTIVE"
    | "CANCELLED"
    | "EXPIRED"
    | "FAILED"
    | "TRIALING"
    | "PAST_DUE";

export interface Invoice {
    id: string | number;
    organizationId: string | number;
    subscriptionId?: string | number;
    amount: number;
    currency?: string;
    status: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
    dueDate?: string;
    paidAt?: string;
    invoiceUrl?: string;
    createdAt?: string;
}

export interface CheckoutResponse {
    success: boolean;
    message: string;
    checkoutUrl?: string; // Paystack checkout URL
    data?: {
        checkoutUrl?: string;
        paymentUrl?: string;
        reference?: string;
    };
}

export interface SubscriptionCheckResult {
    requiresSubscription: boolean;
    hasActiveSubscription: boolean;
    activeSubscription: OrganizationSubscription | null;
    subscriptions: OrganizationSubscription[];
    error?: string;
}

export interface SubscriptionWallMessage {
    title: string;
    message: string;
}

// Organization types that are exempt from subscription
export const EXEMPT_ORG_TYPES = ["PLATFORM_ADMIN"] as const;

// Routes exempt from subscription wall
export const EXEMPT_ROUTES = [
    "/pricing",
    "/subscription",
    "/settings/billing",
    "/settings/subscription",
] as const;

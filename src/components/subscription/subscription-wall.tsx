"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Crown, LogOut, Loader2, Zap, AlertTriangle, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useAuthStore } from "@/stores/auth-store";
import { useGetSubscriptions } from "@/lib/generated/billing/subscriptions/subscriptions";
import { PricingCards } from "./pricing-cards";
import { CurrencySelector } from "@/components/currency";

// Logo component - matches public navbar
const Logo = () => (
    <Link href="/" className="flex items-center gap-3 shrink-0 group">
        <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <Image
                src="/logovar6.svg"
                alt="Kaizen Admin"
                width={48}
                height={48}
                className="h-10 w-auto relative z-10 group-hover:scale-110 transition-transform duration-500"
                priority
            />
        </div>
        <span className="text-lg font-bold tracking-tight text-slate-900">
            Kaizen Admin
        </span>
    </Link>
);

interface SubscriptionWallProps {
    organizationName?: string;
    message?: string;
    onRetry?: () => void;
    onDevBypass?: () => void;
}

export function SubscriptionWall({ organizationName = "your organization", message, onRetry, onDevBypass }: SubscriptionWallProps) {
    const { logout } = useAuth();
    const user = useAuthStore((state) => state.user);
    const organizationId = user?.organizationId;

    const [isLocalhost, setIsLocalhost] = React.useState(false);

    React.useEffect(() => {
        setIsLocalhost(window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    }, []);

    // Get existing subscriptions to check for errors
    const {
        error: subscriptionsError,
        isError: isSubscriptionsError,
        refetch: refetchSubscriptions
    } = useGetSubscriptions(
        organizationId as number,
        { limit: 1 },
        { query: { enabled: typeof organizationId === 'number' && organizationId > 0 } }
    );

    // Check if organizationId is missing
    if (!organizationId) {
        return (
            <div className="min-h-screen bg-white flex flex-col">
                <div className="w-full h-20 flex justify-between items-center px-8 max-w-7xl mx-auto grow-0 shrink-0">
                    <Logo />
                    <Button
                        variant="ghost"
                        onClick={logout}
                        className="text-slate-500 hover:text-red-600 hover:bg-red-50 gap-2 border border-slate-200 rounded-xl"
                    >
                        <LogOut className="h-4 w-4" />
                        Sign out
                    </Button>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center px-4">
                    <div className="h-20 w-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="h-10 w-10 text-amber-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Organization Not Found</h2>
                    <p className="text-slate-500 mb-8 max-w-md text-center">
                        We could not find your organization. Please try logging out and logging back in.
                    </p>
                    <Button asChild className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl h-12 px-8 font-bold">
                        <a href="/login">Sign In Again</a>
                    </Button>
                </div>
            </div>
        );
    }

    // Handle API error (e.g., 404 - endpoint not found)
    if (isSubscriptionsError) {
        const errorMessage = subscriptionsError instanceof Error ? subscriptionsError.message : "Failed to load subscription data";
        const is404 = errorMessage.includes("404") || errorMessage.includes("Not Found");

        return (
            <div className="min-h-screen bg-white flex flex-col">
                <div className="w-full h-20 flex justify-between items-center px-8 max-w-7xl mx-auto grow-0 shrink-0">
                    <Logo />
                    <Button
                        variant="ghost"
                        onClick={logout}
                        className="text-slate-500 hover:text-red-600 hover:bg-red-50 gap-2 border border-slate-200 rounded-xl"
                    >
                        <LogOut className="h-4 w-4" />
                        Sign out
                    </Button>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center px-4">
                    <div className="h-20 w-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle className="h-10 w-10 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">
                        {is404 ? "Subscription Service Unavailable" : "Error Loading Subscription"}
                    </h2>
                    <p className="text-slate-500 mb-8 max-w-md text-center">
                        {is404
                            ? "The subscription service is currently unavailable. Please try again later or contact support."
                            : errorMessage
                        }
                    </p>
                    <div className="flex items-center gap-4">
                        <Button variant="outline" onClick={() => refetchSubscriptions()} className="rounded-xl h-12 px-8 font-semibold">
                            Try Again
                        </Button>
                        {(isLocalhost || process.env.NODE_ENV === "development") && onDevBypass && (
                            <Button onClick={onDevBypass} className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl h-12 px-8 font-bold">
                                <Zap className="h-4 w-4 mr-2" />
                                Skip (Dev Only)
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Minimalist Top Nav with Logout */}
            <div className="w-full h-20 flex justify-between items-center px-8 max-w-7xl mx-auto grow-0 shrink-0">
                <Logo />
                <div className="flex items-center gap-4">
                    <CurrencySelector variant="ghost" size="sm" allowedCurrency="GHS" />
                    <Button
                        variant="ghost"
                        onClick={logout}
                        className="text-slate-500 hover:text-red-600 hover:bg-red-50 gap-2 border border-slate-200 rounded-xl"
                    >
                        <LogOut className="h-4 w-4" />
                        Sign out
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 overflow-y-auto w-full max-w-7xl mx-auto">
                <div className="text-center max-w-3xl mb-16">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-6">
                        {organizationName} needs a <span className="text-indigo-600">Plan</span>
                    </h1>
                    <p className="text-lg text-slate-500 font-medium max-w-xl mx-auto">
                        {message || `Choose a plan below to continue accessing your organization's tools and features.`}
                    </p>
                </div>

                {/* Shared Pricing Cards Component */}
                <PricingCards
                    onCheckoutSuccess={onRetry}
                    variant="default"
                />

                <div className="mt-12 text-center h-8">
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="text-[12px] font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest"
                        >
                            Refresh Status
                        </button>
                    )}
                </div>

                {(isLocalhost || process.env.NODE_ENV === "development") && onDevBypass && (
                    <div className="mt-8 p-6 border-2 border-dashed border-amber-300 bg-amber-50 rounded-[24px] w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="flex items-center gap-2 mb-4">
                            <Zap className="h-4 w-4 fill-amber-500 text-amber-500" />
                            <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">Developer Mode</span>
                        </div>
                        <p className="text-[13px] text-amber-700 mb-4 font-medium">
                            Bypass the subscription wall to continue testing the dashboard features locally.
                        </p>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onDevBypass}
                            className="w-full bg-white hover:bg-amber-100 text-amber-800 border-amber-300 font-bold h-11 rounded-xl shadow-sm transition-all active:scale-[0.98]"
                        >
                            Skip Subscription Check (Dev Only)
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default SubscriptionWall;
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, ArrowRight, CreditCard, Loader2, Tag, Users, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { useGetApplicableServicePackages } from "@/lib/generated/billing/packages/packages";
import { useCreateSubscription, useGetSubscriptions, useChangeSubscription } from "@/lib/generated/billing/subscriptions/subscriptions";
import type { DetailedServicePackageDto } from "@/lib/generated/billing/models/detailedServicePackageDto";
import { useAuthStore } from "@/stores/auth-store";
import { useCurrency } from "@/lib/currency";

export interface PricingCardsProps {
    /** Called when checkout completes successfully */
    onCheckoutSuccess?: () => void;
    /** Show billing cycle toggle (monthly/yearly) */
    showBillingToggle?: boolean;
    /** Show FAQ section */
    showFaq?: boolean;
    /** Variant style: "default" for subscription wall, "marketing" for public page */
    variant?: "default" | "marketing";
    /** Pre-selected billing cycle */
    defaultBillingCycle?: "monthly" | "yearly";
}

const faqs = [
    {
        question: "Can I change my plan later?",
        answer: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately and we'll prorate your billing.",
    },
    {
        question: "What payment methods do you accept?",
        answer: "We accept all major credit cards, debit cards, and mobile money through Paystack. For enterprise plans, we also offer invoice-based billing.",
    },
    {
        question: "Is there a free trial?",
        answer: "Yes! All plans come with a 14-day free trial. No credit card required to start.",
    },
];

export function PricingCards({
    onCheckoutSuccess,
    showBillingToggle = false,
    showFaq = false,
    variant = "default",
    defaultBillingCycle = "monthly",
}: PricingCardsProps) {
    const user = useAuthStore((state) => state.user);
    const organizationId = user?.organizationId;
    const { code: currencyCode } = useCurrency();

    const [billingCycle, setBillingCycle] = React.useState<"monthly" | "yearly">(defaultBillingCycle);
    const [selectedPackage, setSelectedPackage] = React.useState<DetailedServicePackageDto | null>(null);
    const [isCheckoutOpen, setIsCheckoutOpen] = React.useState(false);
    const [userQuantity, setUserQuantity] = React.useState(1);

    const queryParams = React.useMemo(() => ({
        recurring: true,
        limit: 10
    }), []);

    const { data: packagesData, isLoading, refetch: refetchPackages } = useGetApplicableServicePackages(queryParams, {
        query: {
            staleTime: 0, // Always fetch fresh data
            refetchOnMount: true,
        }
    });

    // Filter to only show GHS packages (currencyId = 1) and packages with offers
    const packages = ((packagesData?.data || []) as DetailedServicePackageDto[])
        .filter(pkg => pkg.currencyId === 1 && pkg.offers && pkg.offers.length > 0);

    // Get existing subscriptions - fetch more to find active one
    const { data: existingSubscriptions } = useGetSubscriptions(
        organizationId as number,
        { limit: 10 },
        { query: { enabled: typeof organizationId === 'number' && organizationId > 0 } }
    );
    
    // Find ACTIVE subscription specifically - change subscription API only works with active subscription
    const allSubscriptions = existingSubscriptions?.data || [];
    const activeSubscription = allSubscriptions.find(sub => sub.status === 'ACTIVE');
    const hasActiveSubscription = !!activeSubscription;

    // Mutations
    const createSubscriptionMutation = useCreateSubscription();
    const changeSubscriptionMutation = useChangeSubscription();

    const canUserSetQuantity = (pkg: DetailedServicePackageDto) => {
        const orgMaxUsers = user?.organization?.config?.maxUsers as number | undefined;
        const pkgMaxTeamSize = pkg.maximumTeamSize;
        if (pkgMaxTeamSize && pkgMaxTeamSize > 1) return false;
        if ((!orgMaxUsers || orgMaxUsers === 0) && pkgMaxTeamSize === 1) return true;
        return false;
    };

    const getSubscriptionQuantity = (pkg: DetailedServicePackageDto) => {
        if (pkg.maximumTeamSize && pkg.maximumTeamSize > 1) return 1;
        if (canUserSetQuantity(pkg)) return userQuantity;
        return 1;
    };

    const getPrice = (pkg: DetailedServicePackageDto) => {
        // Use package.amount (total price) - this is the authoritative price
        const basePrice = parseFloat(pkg.amount || '0');

        let finalPrice = basePrice;
        if (pkg.discount?.percentage) {
            const percentageValue = typeof pkg.discount.percentage === 'string'
                ? parseFloat(pkg.discount.percentage)
                : pkg.discount.percentage;
            finalPrice = basePrice * (1 - percentageValue / 100);
        } else if (pkg.discount?.fixedValue) {
            const fixedAmount = typeof pkg.discount.fixedValue === 'string'
                ? parseFloat(pkg.discount.fixedValue)
                : parseFloat(String(pkg.discount.fixedValue));
            finalPrice = basePrice - fixedAmount;
        }

        if (billingCycle === "yearly") {
            finalPrice = finalPrice * 0.8;
        }

        return Math.max(0, finalPrice).toFixed(2);
    };

    const getTotalPrice = (pkg: DetailedServicePackageDto, quantity: number) => {
        // Use package.amount (total price) - this is the authoritative price
        const basePrice = parseFloat(pkg.amount || '0');
        const total = basePrice * quantity;
        return `${total.toFixed(2)}`;
    };

    const hasDiscount = (pkg: DetailedServicePackageDto) => !!pkg.discount;

    const getDiscountLabel = (pkg: DetailedServicePackageDto) => {
        if (!pkg.discount) return null;
        if (pkg.discount.percentage) return `${pkg.discount.percentage}% OFF`;
        if (pkg.discount.fixedValue) return `${pkg.discount.fixedValue} OFF`;
        return "DISCOUNT";
    };

    const handleSelectPlan = (pkg: DetailedServicePackageDto) => {
        setSelectedPackage(pkg);
        setIsCheckoutOpen(true);
    };

    const handleCheckout = async () => {
        if (!selectedPackage) return;

        // Enterprise - just show success
        if (selectedPackage.name.toLowerCase().includes("enterprise")) {
            toast.success("Our sales team will contact you shortly!");
            setIsCheckoutOpen(false);
            return;
        }

        if (!organizationId) {
            toast.error("Please log in to subscribe to a plan");
            setIsCheckoutOpen(false);
            return;
        }

        const quantity = getSubscriptionQuantity(selectedPackage);
        const subscriptionData = {
            packageId: selectedPackage.id,
            quantity,
        };

        try {
            let response;
            // Only use changeSubscription if there's an ACTIVE subscription
            // Otherwise, use createSubscription
            if (hasActiveSubscription && activeSubscription) {
                response = await changeSubscriptionMutation.mutateAsync({
                    organizationId,
                    subscriptionId: activeSubscription.id,
                    data: subscriptionData,
                });
            } else {
                response = await createSubscriptionMutation.mutateAsync({
                    organizationId,
                    data: subscriptionData,
                });
            }

            // Extract checkout URL from response (similar to spaces-b2b-portal)
            // Response data can be a string (the URL) or an object containing the URL
            const responseData = response?.data;
            const checkoutUrl = typeof responseData === 'string' ? responseData : (responseData as any)?.checkoutUrl;

            console.log("Checkout URL found:", checkoutUrl);

            if (checkoutUrl && typeof checkoutUrl === "string") {
                // Redirect to payment checkout page
                toast.success("Redirecting to payment...");
                window.location.href = checkoutUrl;
                return;
            }

            // If no checkout URL, show success and redirect
            toast.success(hasActiveSubscription ? "Subscription updated successfully!" : "Subscription created successfully!");
            setIsCheckoutOpen(false);
            if (onCheckoutSuccess) {
                onCheckoutSuccess();
            } else {
                window.location.reload();
            }
        } catch (error) {
            console.error("Subscription error:", error);
            const message = error instanceof Error ? error.message : "Failed to process subscription. Please try again.";
            toast.error(message);
        }
    };

    const getPackageDescription = (pkg: DetailedServicePackageDto) => {
        if (pkg.description) return pkg.description;
        if (pkg.name.toLowerCase().includes("starter")) return "Perfect for small teams getting started";
        if (pkg.name.toLowerCase().includes("pro")) return "Best for growing organizations";
        return "Custom solutions for large organizations";
    };

    const getPackageCta = (pkg: DetailedServicePackageDto) => {
        return pkg.name.toLowerCase().includes("enterprise") ? "Contact Sales" : "Start Free Trial";
    };

    const isProcessing = createSubscriptionMutation.isPending || changeSubscriptionMutation.isPending;

    if (isLoading) {
        return (
            <div className="flex flex-col items-center gap-4 py-12">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                <p className="text-sm font-medium text-slate-500">Loading plans...</p>
            </div>
        );
    }

    const isMarketing = variant === "marketing";

    return (
        <>
            {/* Billing Toggle */}
            {showBillingToggle && (
                <div className="flex items-center justify-center gap-4 mb-12">
                    <span className={`text-sm font-semibold ${billingCycle === "monthly" ? "text-slate-900" : "text-slate-400"}`}>Monthly</span>
                    <div
                        onClick={() => setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")}
                        className="w-14 h-7 bg-slate-100 rounded-full p-1 cursor-pointer relative transition-colors duration-300"
                    >
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 transform ${billingCycle === "yearly" ? "translate-x-7" : "translate-x-0"}`} />
                    </div>
                    <span className={`text-sm font-semibold ${billingCycle === "yearly" ? "text-slate-900" : "text-slate-400"}`}>
                        Yearly
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 text-[11px]">Save 20%</span>
                    </span>
                </div>
            )}

            {/* Pricing Cards */}
            <div className={`grid gap-6 w-full ${isMarketing ? 'md:grid-cols-3' : 'md:grid-cols-3'}`}>
                {packages.length === 0 ? (
                    <div className="col-span-3 text-center py-12">
                        <p className="text-slate-500">No plans available at this time.</p>
                    </div>
                ) : (
                    packages.map((pkg) => {
                        const isMainPlan = pkg.name.toLowerCase().includes("pro");
                        return (
                            <div
                                key={pkg.id}
                                className={`relative p-8 rounded-[32px] transition-all duration-500 flex flex-col group ${isMainPlan
                                    ? "bg-slate-900 text-white shadow-2xl scale-[1.02] ring-1 ring-white/10"
                                    : "bg-white border border-slate-100 hover:border-indigo-200 hover:shadow-xl hover:scale-[1.01]"
                                    }`}
                            >
                                {isMainPlan && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                        <span className="bg-indigo-600 font-bold text-white text-[10px] px-3 py-1 rounded-full uppercase tracking-widest shadow-lg whitespace-nowrap">
                                            Most Popular
                                        </span>
                                    </div>
                                )}

                                {hasDiscount(pkg) && (
                                    <div className="absolute top-4 right-4">
                                        <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg">
                                            <Tag className="mr-1 h-3 w-3" />
                                            {getDiscountLabel(pkg)}
                                        </Badge>
                                    </div>
                                )}

                                <div className="mb-8">
                                    <h3 className={`text-lg font-bold mb-2 ${isMainPlan ? "text-white" : "text-slate-900"}`}>
                                        {pkg.name}
                                    </h3>
                                    <p className={`text-[13px] leading-relaxed line-clamp-2 ${isMainPlan ? "text-slate-400" : "text-slate-500"}`}>
                                        {getPackageDescription(pkg)}
                                    </p>
                                </div>

                                <div className="mb-8">
                                    <div className="flex items-baseline gap-1">
                                        <span className={`text-lg font-bold ${isMainPlan ? "text-slate-300" : "text-slate-600"}`}>
                                            {(pkg.currencyId === 1 || pkg.name.includes("(GHS)")) ? "GHS" : (pkg.currency?.symbol || pkg.currency?.code || currencyCode)}
                                        </span>
                                        <span className="text-4xl font-bold tracking-tight">{getPrice(pkg)}</span>
                                        <span className={`text-[12px] font-medium ${isMainPlan ? "text-slate-400" : "text-slate-500"}`}>
                                            /{billingCycle === "monthly" ? "mo" : "yr"}
                                        </span>
                                    </div>
                                    {(pkg as any).freeDays > 0 && (
                                        <div className="mt-2 flex items-center gap-1.5">
                                            <Badge variant="outline" className={`text-[10px] uppercase font-bold py-0 h-5 border-indigo-500/30 ${isMainPlan ? "bg-indigo-500/10 text-indigo-300" : "bg-indigo-50 text-indigo-600"}`}>
                                                Trial
                                            </Badge>
                                            <span className={`text-[11px] font-semibold ${isMainPlan ? "text-slate-400" : "text-slate-500"}`}>
                                                {(pkg as any).freeDays} Days Free Trial
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 space-y-4 mb-8">
                                    {(pkg.offers && pkg.offers.length > 0) ? (
                                        pkg.offers.slice(0, 4).map((offer, i) => (
                                            <div key={i} className="flex items-start gap-3">
                                                <div className={`mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${isMainPlan ? "bg-violet-500/20 text-violet-400" : "bg-green-50 text-green-600"}`}>
                                                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                                                </div>
                                                <span className={`text-[13px] font-medium ${isMainPlan ? "text-slate-300" : "text-slate-600"}`}>
                                                    {offer.name}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex items-start gap-3">
                                            <div className={`mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${isMainPlan ? "bg-violet-500/20 text-violet-400" : "bg-green-50 text-green-600"}`}>
                                                <Check className="h-2.5 w-2.5" strokeWidth={3} />
                                            </div>
                                            <span className={`text-[13px] font-medium ${isMainPlan ? "text-slate-300" : "text-slate-600"}`}>
                                                Full Workspace Access
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <Button
                                    onClick={() => handleSelectPlan(pkg)}
                                    variant={isMainPlan ? "default" : "outline"}
                                    className={`w-full h-12 rounded-xl font-bold text-sm transition-all duration-300 ${isMainPlan
                                        ? "bg-indigo-600 hover:bg-indigo-700 text-white border-0"
                                        : "border-slate-200 hover:border-indigo-600 hover:text-indigo-600 hover:bg-indigo-50"
                                        }`}
                                >
                                    {getPackageCta(pkg)}
                                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                </Button>
                            </div>
                        );
                    })
                )}
            </div>

            {/* FAQ */}
            {showFaq && (
                <div className="mt-16 max-w-3xl mx-auto">
                    <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">Common Questions</h2>
                    <div className="grid gap-4">
                        {faqs.map((faq, i) => (
                            <div key={i} className="p-6 rounded-2xl bg-slate-50">
                                <h3 className="font-bold text-slate-900 mb-2">{faq.question}</h3>
                                <p className="text-slate-500 text-sm">{faq.answer}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Checkout Dialog */}
            <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
                <DialogContent className="sm:max-w-md rounded-[24px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-indigo-600" />
                            {selectedPackage?.name.toLowerCase().includes("enterprise") ? "Contact Sales" : "Complete Your Subscription"}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedPackage?.name.toLowerCase().includes("enterprise")
                                ? "Our team will reach out to discuss your enterprise needs."
                                : `You're subscribing to the ${selectedPackage?.name} plan.`}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedPackage && !selectedPackage.name.toLowerCase().includes("enterprise") && (
                        <div className="py-4">
                            <div className="bg-slate-50 rounded-2xl p-4 mb-4 border border-slate-100">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-slate-500 text-sm">Plan</span>
                                    <span className="font-bold text-slate-900">{selectedPackage.name}</span>
                                </div>

                                {canUserSetQuantity(selectedPackage) && (
                                    <div className="flex justify-between items-center py-3 border-t border-slate-200">
                                        <div className="flex items-center gap-2">
                                            <Users className="h-4 w-4 text-slate-500" />
                                            <span className="text-slate-500 text-sm">Team Size</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setUserQuantity(Math.max(1, userQuantity - 1))} disabled={userQuantity <= 1}>
                                                <Minus className="h-4 w-4" />
                                            </Button>
                                            <span className="w-12 text-center font-bold">{userQuantity}</span>
                                            <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setUserQuantity(userQuantity + 1)}>
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {!canUserSetQuantity(selectedPackage) && selectedPackage.maximumTeamSize && selectedPackage.maximumTeamSize > 1 && (
                                    <div className="flex justify-between items-center py-3 border-t border-slate-200">
                                        <div className="flex items-center gap-2">
                                            <Users className="h-4 w-4 text-slate-500" />
                                            <span className="text-slate-500 text-sm">Team Size</span>
                                        </div>
                                        <span className="font-bold text-slate-900">Up to {selectedPackage.maximumTeamSize} users</span>
                                    </div>
                                )}

                                <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                                    <span className="text-slate-500 text-sm">Total</span>
                                    <span className="text-xl font-bold text-slate-900">
                                        <span className="text-sm mr-1">{selectedPackage.currency?.symbol || selectedPackage.currency?.code || currencyCode}</span>
                                        {getTotalPrice(selectedPackage, canUserSetQuantity(selectedPackage) ? userQuantity : 1)}
                                        <span className="text-xs font-normal text-slate-400">/mo</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsCheckoutOpen(false)}>Cancel</Button>
                        <Button onClick={handleCheckout} disabled={isProcessing} className="bg-indigo-600 hover:bg-indigo-700">
                            {isProcessing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    Proceed
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
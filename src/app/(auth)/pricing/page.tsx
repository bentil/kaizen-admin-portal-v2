"use client";

import * as React from "react";
import { Sparkles, Shield, CreditCard, Clock } from "lucide-react";
import { PricingCards } from "@/components/subscription/pricing-cards";
import { PublicNavbar } from "@/components/layout/public-navbar";

export default function PricingPage() {
    return (
        <div className="min-h-screen bg-white">
            <PublicNavbar />

            {/* Editorial Header */}
            <div className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 border border-violet-100/50 text-violet-600 text-[13px] font-medium mb-8">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Flexible plans for any organization size</span>
                </div>

                <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-slate-900 mb-6 max-w-3xl mx-auto leading-[1.1]">
                    Scaled for growth, <br />
                    <span className="text-violet-600">designed for control.</span>
                </h1>

                <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-12 font-medium">
                    Start your 14-day free trial. No credit card required. Upgrade, downgrade, or cancel at any time.
                </p>
            </div>

            {/* Pricing Cards - Shared Component */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
                <PricingCards
                    showBillingToggle={true}
                    showFaq={true}
                    variant="marketing"
                />

                {/* Corporate Trust Badges */}
                <div className="mt-8 flex flex-wrap items-center justify-center gap-12 text-slate-400 opacity-80">
                    <div className="flex items-center gap-3 grayscale hover:grayscale-0 transition-all cursor-default group">
                        <Shield className="h-5 w-5 text-slate-400 group-hover:text-green-500 transition-colors" />
                        <span className="text-[13px] font-semibold tracking-wide uppercase">Enterprise Grade Security</span>
                    </div>
                    <div className="flex items-center gap-3 grayscale hover:grayscale-0 transition-all cursor-default group">
                        <CreditCard className="h-5 w-5 text-slate-400 group-hover:text-violet-500 transition-colors" />
                        <span className="text-[13px] font-semibold tracking-wide uppercase">Secure Payments</span>
                    </div>
                    <div className="flex items-center gap-3 grayscale hover:grayscale-0 transition-all cursor-default group">
                        <Clock className="h-5 w-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                        <span className="text-[13px] font-semibold tracking-wide uppercase">Priority Onboarding</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
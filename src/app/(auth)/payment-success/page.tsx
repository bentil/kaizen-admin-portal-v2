"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Sparkles, ArrowRight, PartyPopper, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicPageLayout } from "@/components/layout/public-layout";
import { confetti } from "@/lib/confetti";
import { useAuthStore } from "@/stores/auth-store";

// Session storage key for payment grace period
const PAYMENT_GRACE_KEY = "kaizenAdmin_payment_grace";
const PAYMENT_GRACE_DURATION = 10 * 60 * 1000; // 10 minutes grace period

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const organizationId = user?.organizationId;

  const [showContent, setShowContent] = useState(false);
  const [showCheck, setShowCheck] = useState(false);
  const [showText, setShowText] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'failed'>('pending');
  const [countdown, setCountdown] = useState(5);

  // Get Paystack params (for potential verification/logging)
  const reference = searchParams.get("reference");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const trxref = searchParams.get("trxref");

  useEffect(() => {
    // Trigger confetti burst
    confetti();

    // Staggered animations
    const timer1 = setTimeout(() => setShowContent(true), 100);
    const timer2 = setTimeout(() => setShowCheck(true), 400);
    const timer3 = setTimeout(() => setShowText(true), 700);
    const timer4 = setTimeout(() => setShowButton(true), 1000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, []);

  // Set payment grace period in session storage
  const setPaymentGracePeriod = useCallback(() => {
    if (organizationId) {
      const graceData = {
        organizationId,
        timestamp: Date.now(),
        reference,
        expiresAt: Date.now() + PAYMENT_GRACE_DURATION,
      };
      sessionStorage.setItem(PAYMENT_GRACE_KEY, JSON.stringify(graceData));
    }
  }, [organizationId, reference]);

  // Verify subscription status with a single API call
  const verifySubscriptionStatus = useCallback(async () => {
    if (!organizationId) {
      // No org ID, set grace period and proceed
      setPaymentGracePeriod();
      setVerificationStatus('success');
      setIsVerifying(false);
      return;
    }

    try {
      const { SubscriptionService } = await import("@/services/subscription");

      // Make ONE call to check subscription status
      const result = await SubscriptionService.checkSubscriptionStatus({
        organizationId: organizationId as number,
        user,
      });

      if (result.hasActiveSubscription) {
        // Subscription confirmed - clear any existing grace period
        sessionStorage.removeItem(PAYMENT_GRACE_KEY);
        setVerificationStatus('success');
      } else {
        // No active subscription found, but payment was successful on Paystack
        // Set grace period to allow access while backend processes
        setPaymentGracePeriod();
        setVerificationStatus('success');
      }
    } catch (error) {
      console.error("Failed to verify subscription status:", error);
      // On error, set grace period and allow proceeding
      setPaymentGracePeriod();
      setVerificationStatus('success');
    } finally {
      setIsVerifying(false);
    }
  }, [organizationId, setPaymentGracePeriod, user]);

  useEffect(() => {
    verifySubscriptionStatus();
  }, [verifySubscriptionStatus]);

  // Auto-redirect countdown - only start after verification
  useEffect(() => {
    if (isVerifying || verificationStatus !== 'success') return;

    if (countdown <= 0) {
      router.push("/admin");
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, router, isVerifying, verificationStatus]);

  const handleGoToDashboard = () => {
    if (!isVerifying && verificationStatus === 'success') {
      router.push("/admin");
    }
  };

  return (
    <PublicPageLayout showNavbar={false} showFooter={false}>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-green-50 via-white to-emerald-50">
        {/* Main Content */}
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
          <div
            className={`w-full max-w-md text-center transition-all duration-700 ease-out ${showContent
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8"
              }`}
          >
            {/* Logo */}
            <Link href="/" className="inline-block mb-8">
              <Image
                src="/kaizen-logo.svg"
                alt="Kaizen Admin"
                width={80}
                height={80}
                className="h-16 w-auto mx-auto"
                priority
              />
            </Link>

            {/* Success Icon with Animation */}
            <div
              className={`relative mx-auto mb-8 transition-all duration-500 ease-out ${showCheck
                ? "opacity-100 scale-100"
                : "opacity-0 scale-50"
                }`}
            >
              {/* Glow effect */}
              <div className="absolute inset-0 animate-pulse">
                <div className="absolute inset-0 bg-green-400/20 rounded-full blur-2xl scale-150" />
              </div>

              {/* Main circle */}
              <div className="relative w-32 h-32 mx-auto bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/30">
                {/* Animated ring */}
                <div className="absolute inset-0 rounded-full border-4 border-green-300/50 animate-ping" />

                {/* Checkmark */}
                <CheckCircle2 className="w-16 h-16 text-white" strokeWidth={2.5} />
              </div>

              {/* Sparkles around the icon */}
              <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-yellow-400 animate-bounce" />
              <Sparkles className="absolute -bottom-1 -left-3 w-6 h-6 text-yellow-400 animate-bounce delay-150" />
              <PartyPopper className="absolute top-0 -left-6 w-7 h-7 text-purple-400 animate-bounce delay-300" />
            </div>

            {/* Text Content */}
            <div
              className={`space-y-4 transition-all duration-500 ease-out ${showText
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
                }`}
            >
              <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
                Payment Successful!
              </h1>

              <p className="text-lg text-gray-600 max-w-sm mx-auto">
                Thank you for your subscription. Your account has been upgraded and you now have access to all premium features.
              </p>

              {/* Transaction Reference */}
              {reference && (
                <div className="mt-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-sm text-gray-500 mb-1">Transaction Reference</p>
                  <p className="font-mono text-sm font-medium text-gray-700 break-all">
                    {reference}
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div
              className={`mt-10 space-y-4 transition-all duration-500 ease-out ${showButton
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
                }`}
            >
              <Button
                onClick={handleGoToDashboard}
                disabled={isVerifying}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold rounded-full h-14 text-lg transition-all active:scale-95 shadow-lg shadow-green-500/25 disabled:opacity-90 disabled:cursor-wait"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Verifying Payment...
                  </>
                ) : (
                  <>
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>

              {isVerifying ? (
                <p className="text-sm text-gray-500">
                  <Loader2 className="inline-block mr-1 h-3 w-3 animate-spin" />
                  Verifying your subscription...
                </p>
              ) : (
                <p className="text-sm text-gray-500">
                  Redirecting in{" "}
                  <span className="font-semibold text-green-600">{countdown}</span>{" "}
                  seconds...
                </p>
              )}
            </div>

            {/* Additional Info */}
            <div
              className={`mt-12 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 transition-all duration-500 delay-300 ${showText
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
                }`}
            >
              <h3 className="font-semibold text-gray-900 mb-2">What{"'"}s Next?</h3>
              <ul className="text-left text-sm text-gray-600 space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <span>You{"'"}ll receive a confirmation email shortly</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <span>Access all premium features immediately</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <span>Manage your subscription from Settings</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </PublicPageLayout>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <PublicPageLayout showNavbar={false} showFooter={false}>
        <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50">
          <div className="animate-pulse text-gray-400">Loading...</div>
        </div>
      </PublicPageLayout>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}

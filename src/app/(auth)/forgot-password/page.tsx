"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useForgotPassword } from "@/lib/generated/user/auth/auth";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PublicPageLayout } from "@/components/layout/public-layout";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [username, setUsername] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push("/admin");
    }
  }, [isAuthenticated, authLoading, router]);

  const forgotPasswordMutation = useForgotPassword({
    mutation: {
      onSuccess: () => {
        setSuccess(true);
        setError(null);
      },
      onError: (error: any) => {
        setError(
          error?.response?.data?.message ||
          error?.message ||
          "Failed to send reset link. Please try again."
        );
      },
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    forgotPasswordMutation.mutate({
      data: {
        username: username,
        confirmationUrl: `${window.location.origin}/reset-password`,
      },
    });
  };

  if (authLoading) return null;

  if (success) {
    return (
      <PublicPageLayout showNavbar={false} showFooter={false}>
        <div className="flex min-h-screen items-center justify-center px-4 relative z-10">
          <div className="w-full max-w-md space-y-8 text-center bg-white/50 backdrop-blur-sm border border-black/5 rounded-3xl p-10 shadow-sm">
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-black">
                Check your inbox
              </h1>
              <p className="text-base text-[#4A4A4A]">
                If an account exists for <span className="font-bold text-black">{username}</span>, we&apos;ve sent a password reset link to the associated email address.
              </p>
            </div>
            <Link href="/login">
              <Button variant="outline" className="rounded-full px-8 h-12">
                Back to login
              </Button>
            </Link>
          </div>
        </div>
      </PublicPageLayout>
    );
  }

  return (
    <PublicPageLayout showNavbar={false} showFooter={false}>
      <div className="flex min-h-screen items-center justify-center px-4 relative z-10">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <Link href="/" className="inline-flex items-center justify-center mb-6">
              <Image
                src="/kaizen-logo.svg"
                alt="Kaizen Admin"
                width={48}
                height={48}
                className="h-12 w-auto"
                priority
              />
            </Link>
            <h1 className="text-4xl font-bold tracking-tight text-black">
              Forgot password
            </h1>
            <p className="mt-3 text-base text-[#4A4A4A]">
              Enter your username or email address and we&apos;ll send you a link to reset your
              password
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 bg-white/50 backdrop-blur-sm border border-black/5 rounded-3xl p-8 shadow-sm">
            {!!error && (
              <div className="rounded-2xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Input
                id="username"
                type="text"
                placeholder="Enter your username or email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={forgotPasswordMutation.isPending}
                className="h-12 rounded-xl border-black/10 text-black"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold rounded-full h-12 transition-all active:scale-95"
              disabled={forgotPasswordMutation.isPending}
            >
              {forgotPasswordMutation.isPending
                ? "Sending..."
                : "Send reset link"}
            </Button>
          </form>

          <div className="text-center text-sm text-[#4A4A4A]">
            <Link href="/login" className="text-primary hover:underline font-semibold">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </PublicPageLayout>
  );
}

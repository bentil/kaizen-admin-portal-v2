"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { useConfirmAccount } from "@/lib/generated/user/auth/auth";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PublicPageLayout } from "@/components/layout/public-layout";
import { PasswordGuidelines } from "@/components/auth/password-guidelines";

function OTPConfirmationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setAuth } = useAuth();

  // Get params directly - Suspense handles the loading
  const token = searchParams.get("code");
  const username = searchParams.get("username");

  const confirmMutation = useConfirmAccount({
    mutation: {
      onSuccess: (data) => {
        setAuth(data.access_token, data.user);
        router.push("/admin");
      },
      onError: (error: unknown) => {
        const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
        setError(
          axiosError?.response?.data?.message ||
          axiosError?.message ||
          "Invalid confirmation code. Please try again."
        );
      },
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Invalid confirmation token");
      return;
    }

    if (!otp) {
      setError("Password is required");
      return;
    }

    confirmMutation.mutate({
      data: {
        token,
        password: otp,
      },
    });
  };

  // Show error page if no token
  if (!token) {
    return (
      <PublicPageLayout showNavbar={false} showFooter={false}>
        <div className="flex h-screen items-center justify-center relative z-10">
          <div className="w-full max-w-md text-center space-y-6">
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
            <h1 className="text-2xl font-bold text-black">Invalid Link</h1>
            <p className="text-[#4A4A4A]">
              This confirmation link is invalid or has expired. Please request a new one.
            </p>
            <Button
              onClick={() => router.push("/login")}
              className="bg-primary hover:bg-primary/90 text-white font-bold rounded-full h-12"
            >
              Go to Login
            </Button>
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
              Confirm your account
            </h1>
            <p className="mt-3 text-base text-[#4A4A4A]">
              Set your password to complete account confirmation
              {username && (
                <span>
                  {" "}
                  for <strong className="text-black font-semibold">{username}</strong>
                </span>
              )}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 bg-white/50 backdrop-blur-sm border border-black/5 rounded-3xl p-8 shadow-sm">
            {!!error && (
              <div className="rounded-2xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <div className="relative">
                <Input
                  id="otp"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  disabled={confirmMutation.isPending}
                  className="h-12 rounded-xl border-black/10 pr-10 text-black"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              <PasswordGuidelines password={otp} />
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold rounded-full h-12 transition-all active:scale-95"
              disabled={confirmMutation.isPending}
            >
              {confirmMutation.isPending ? "Confirming..." : "Confirm account"}
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

export default function OTPConfirmationPage() {
  return (
    <Suspense
      fallback={
        <PublicPageLayout showNavbar={false} showFooter={false}>
          <div className="flex h-screen items-center justify-center relative z-10">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
              <p className="mt-4 text-sm text-[#4A4A4A]">
                Loading confirmation...
              </p>
            </div>
          </div>
        </PublicPageLayout>
      }
    >
      <OTPConfirmationContent />
    </Suspense>
  );
}

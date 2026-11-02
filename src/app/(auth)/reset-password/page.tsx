"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { useSetNewPassword } from "@/lib/generated/user/auth/auth";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PublicPageLayout } from "@/components/layout/public-layout";
import { PasswordGuidelines } from "@/components/auth/password-guidelines";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setAuth } = useAuth();
  const setPasswordMutation = useSetNewPassword({
    mutation: {
      onSuccess: (data) => {
        setAuth(data.access_token, data.user);
        router.push("/admin");
      },
      onError: (error: any) => {
        setError(
          error?.response?.data?.message ||
          error?.message ||
          "Failed to reset password. Please try again."
        );
      },
    },
  });

  useEffect(() => {
    if (!token) {
      router.push("/forgot-password");
    }
  }, [token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!token) {
      setError("Invalid reset token");
      return;
    }

    setPasswordMutation.mutate({
      data: {
        token,
        password,
      },
    });
  };

  if (!token) {
    return null;
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
              Reset password
            </h1>
            <p className="mt-3 text-base text-[#4A4A4A]">
              Enter your new password below
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
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={setPasswordMutation.isPending}
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
            </div>

            <div className="space-y-2">
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={setPasswordMutation.isPending}
                  className="h-12 rounded-xl border-black/10 pr-10 text-black"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              <PasswordGuidelines password={password} showAlways={true} />
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold rounded-full h-12 transition-all active:scale-95"
              disabled={setPasswordMutation.isPending}
            >
              {setPasswordMutation.isPending
                ? "Resetting..."
                : "Reset password"}
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <PublicPageLayout showNavbar={false} showFooter={false}>
          <div className="flex h-screen items-center justify-center relative z-10">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
              <p className="mt-4 text-sm text-[#4A4A4A]">
                Loading reset form...
              </p>
            </div>
          </div>
        </PublicPageLayout>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}

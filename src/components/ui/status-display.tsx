"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// ============================================================================
// USER STATUS BADGES
// ============================================================================

export type UserStatusValue = "active" | "inactive" | "pending" | "disabled" | "suspended" | "verified" | "unverified";

const userStatusVariants = cva(
  "capitalize",
  {
    variants: {
      variant: {
        active: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
        inactive: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
        pending: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
        disabled: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
        suspended: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
        verified: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
        unverified: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
      },
    },
    defaultVariants: {
      variant: "inactive",
    },
  }
);

const USER_STATUS_COLORS: Record<UserStatusValue, { indicator: string; bg: string; text: string }> = {
  active: {
    indicator: "bg-green-500",
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-400",
  },
  inactive: {
    indicator: "bg-slate-400",
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-700 dark:text-slate-400",
  },
  pending: {
    indicator: "bg-amber-500",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-400",
  },
  disabled: {
    indicator: "bg-red-500",
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-400",
  },
  suspended: {
    indicator: "bg-orange-500",
    bg: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-700 dark:text-orange-400",
  },
  verified: {
    indicator: "bg-blue-500",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-400",
  },
  unverified: {
    indicator: "bg-gray-400",
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-700 dark:text-gray-400",
  },
};

export interface UserStatusBadgeProps {
  /** The status to display */
  status: UserStatusValue;
  /** Whether to show an icon */
  showIcon?: boolean;
  /** Custom label (defaults to status) */
  label?: string;
  /** Custom class name */
  className?: string;
  /** Optional id attribute */
  id?: string;
  /** Test id for testing */
  "data-testid"?: string;
}

/**
 * UserStatusBadge - A standardized badge for displaying user account statuses
 *
 * @example
 * ```tsx
 * <UserStatusBadge status="active" />
 * <UserStatusBadge status="pending" showIcon />
 * <UserStatusBadge status="disabled" label="Account Disabled" />
 * ```
 */
export function UserStatusBadge({
  status,
  showIcon = false,
  label,
  className,
  ...props
}: UserStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(userStatusVariants({ variant: status }), className)}
      {...props}
    >
      {showIcon && (
        <span
          className={cn(
            "size-2 rounded-full mr-1.5",
            USER_STATUS_COLORS[status]?.indicator || "bg-slate-400"
          )}
        />
      )}
      {label || status}
    </Badge>
  );
}

/**
 * getUserStatusVariant - Helper function to get the badge variant for a user status
 */
export function getUserStatusVariant(status: string): UserStatusValue {
  const normalizedStatus = status?.toLowerCase() as UserStatusValue;
  if (["active", "inactive", "pending", "disabled", "suspended", "verified", "unverified"].includes(normalizedStatus)) {
    return normalizedStatus;
  }
  return "inactive";
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  USER_STATUS_COLORS,
};
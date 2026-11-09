"use client";

import * as React from "react";

/**
 * The latest non-null value it was given. A dialog whose content comes from a
 * target that is cleared on close can use it to keep showing that content while
 * the closing animation plays, instead of flashing an empty or zeroed version.
 */
export function useLastDefined<T>(value: T | null | undefined): T | null {
  const [last, setLast] = React.useState<T | null>(value ?? null);
  if (value != null && value !== last) {
    setLast(value);
  }
  return value ?? last;
}

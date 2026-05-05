import React from "react";
import { cn } from "../../lib/cn";

interface SkeletonProps {
  className?: string;
  height?: string;
  width?: string;
}

export function Skeleton({ className, height = "h-4", width = "w-full" }: SkeletonProps) {
  return (
    <div
      className={cn(
        "skeleton rounded-md",
        height,
        width,
        className
      )}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-vault-border bg-vault-surface p-5">
      <Skeleton height="h-3" width="w-24" className="mb-4" />
      <Skeleton height="h-8" width="w-32" className="mb-2" />
      <Skeleton height="h-3" width="w-20" />
    </div>
  );
}

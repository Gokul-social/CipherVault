"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "../../lib/cn";

interface VaultHealthIndicatorProps {
  score:      number;   // 0–100
  healthFactor: string; // display string e.g. "2.41" or "∞"
  ltv:        string;   // e.g. "43%"
  isFrozen?:  boolean;
  className?: string;
}

function scoreToColor(score: number, frozen: boolean): string {
  if (frozen) return "#E05470";
  if (score >= 65) return "#1DB87A";
  if (score >= 35) return "#E6963C";
  return "#E05470";
}

function scoreToLabel(score: number, frozen: boolean): string {
  if (frozen) return "Frozen";
  if (score >= 65) return "Healthy";
  if (score >= 35) return "At Risk";
  return "Critical";
}

function scoreToVariantClass(score: number, frozen: boolean): string {
  if (frozen) return "text-vault-danger";
  if (score >= 65) return "text-vault-success";
  if (score >= 35) return "text-vault-warning";
  return "text-vault-danger";
}

export function VaultHealthIndicator({
  score,
  healthFactor,
  ltv,
  isFrozen = false,
  className,
}: VaultHealthIndicatorProps) {
  const circleRef = useRef<SVGCircleElement>(null);

  const radius          = 52;
  const circumference   = 2 * Math.PI * radius;
  const arcLength       = circumference * 0.75; // 270° arc
  const offset          = arcLength - (arcLength * Math.min(score, 100)) / 100;
  const color           = scoreToColor(score, isFrozen);
  const label           = scoreToLabel(score, isFrozen);
  const variantClass    = scoreToVariantClass(score, isFrozen);

  useEffect(() => {
    if (!circleRef.current) return;
    // Animate from full-offset (empty) to computed offset on mount
    circleRef.current.style.strokeDashoffset = String(arcLength);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (circleRef.current) {
          circleRef.current.style.strokeDashoffset = String(offset);
        }
      });
    });
  }, [offset, arcLength]);

  return (
    <div className={cn(
      "flex flex-col items-center rounded-xl border border-vault-border bg-vault-surface p-6",
      "transition-all duration-200 hover:border-vault-muted hover:-translate-y-px hover:shadow-card-hover",
      className
    )}>
      {/* Arc SVG */}
      <div className="relative">
        <svg
          width="140" height="110"
          viewBox="0 0 140 110"
          className="-mb-4"
          style={{ overflow: "visible" }}
        >
          {/* Background arc */}
          <circle
            cx="70" cy="90"
            r={radius}
            fill="none"
            stroke="#1E2A3A"
            strokeWidth="8"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            transform="rotate(-225 70 90)"
          />
          {/* Foreground arc */}
          <circle
            ref={circleRef}
            cx="70" cy="90"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={arcLength}
            strokeLinecap="round"
            transform="rotate(-225 70 90)"
            className="health-arc-fill"
            style={{ filter: `drop-shadow(0 0 6px ${color}66)` }}
          />
        </svg>

        {/* Centre labels */}
        <div className="absolute inset-x-0 bottom-2 flex flex-col items-center">
          <span className={cn("text-display-sm font-mono leading-none", variantClass)}>
            {healthFactor}
          </span>
          <span className="mt-1 text-label-sm uppercase tracking-widest text-vault-muted">
            Health
          </span>
        </div>
      </div>

      {/* Bottom row */}
      <div className="mt-5 flex w-full items-center justify-between border-t border-vault-border-subtle pt-4">
        <div className="text-center">
          <div className="text-label-md uppercase tracking-widest text-vault-muted">Status</div>
          <div className={cn("mt-1 text-body-sm font-medium", variantClass)}>{label}</div>
        </div>
        <div className="h-8 w-px bg-vault-border" />
        <div className="text-center">
          <div className="text-label-md uppercase tracking-widest text-vault-muted">LTV</div>
          <div className="mt-1 text-body-sm font-medium font-mono text-vault-text">{ltv}</div>
        </div>
        <div className="h-8 w-px bg-vault-border" />
        <div className="text-center">
          <div className="text-label-md uppercase tracking-widest text-vault-muted">Score</div>
          <div className={cn("mt-1 text-body-sm font-medium font-mono", variantClass)}>
            {score}<span className="text-vault-muted">/100</span>
          </div>
        </div>
      </div>
    </div>
  );
}

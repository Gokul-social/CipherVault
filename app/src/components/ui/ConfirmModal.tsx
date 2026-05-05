"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "../../lib/cn";
import { Button } from "./Button";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "accent";
  loading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
}: ConfirmModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: "text-vault-danger",
      iconBg: "bg-vault-danger-dim",
      button: "danger" as const,
    },
    warning: {
      icon: "text-vault-warning",
      iconBg: "bg-vault-warning-dim",
      button: "danger" as const,
    },
    accent: {
      icon: "text-vault-accent",
      iconBg: "bg-vault-accent-glow",
      button: "primary" as const,
    },
  };

  const vs = variantStyles[variant];

  return (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2",
          "rounded-2xl border border-vault-border bg-vault-surface shadow-modal",
          "animate-fade-in p-6"
        )}
      >
        {/* Icon */}
        <div className={cn("mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl", vs.iconBg)}>
          <WarningTriangle className={cn("h-6 w-6", vs.icon)} />
        </div>

        {/* Content */}
        <h3 className="text-center text-heading-md text-vault-text">{title}</h3>
        <p className="mt-2 text-center text-body-sm text-vault-subtext">{description}</p>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <Button
            variant="secondary"
            size="md"
            className="flex-1"
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={vs.button}
            size="md"
            className="flex-1"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </>
  );
}

function WarningTriangle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

import React from "react";
import { cn } from "../../lib/cn";

interface SectionContainerProps {
  title?:     string;
  subtitle?:  string;
  action?:    React.ReactNode;
  children:   React.ReactNode;
  className?: string;
  noPad?:     boolean;
}

export function SectionContainer({
  title,
  subtitle,
  action,
  children,
  className,
  noPad = false,
}: SectionContainerProps) {
  const hasHeader = title || subtitle || action;

  return (
    <section className={cn("animate-fade-in", className)}>
      {hasHeader && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title && (
              <h2 className="text-heading-md text-vault-text">{title}</h2>
            )}
            {subtitle && (
              <p className="mt-0.5 text-body-xs text-vault-subtext">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn(!noPad && "")}>
        {children}
      </div>
    </section>
  );
}

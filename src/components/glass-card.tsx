import type { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
}

export function GlassCard({ children, className = "" }: GlassCardProps) {
  return (
    <div className={`glass rounded-2xl p-5 transition hover:-translate-y-0.5 ${className}`}>
      {children}
    </div>
  );
}

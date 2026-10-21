import type { ReactNode } from "react";
import { AlertTriangle, SearchX } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface StateProps {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

function StatePanel({ title, description, action, icon, className, role }: StateProps & { role?: "alert" | "status" }) {
  return (
    <div
      role={role}
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border-strong bg-surface px-6 py-14 text-center",
        className,
      )}
    >
      {icon && (
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-surface-hover text-muted">{icon}</div>
      )}
      <h2 className="font-display text-lg font-semibold text-text">{title}</h2>
      {description && <div className="mt-2 max-w-md text-sm text-muted">{description}</div>}
      {action && <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}

export function ErrorState({ icon, className, ...props }: StateProps) {
  return (
    <StatePanel
      {...props}
      role="alert"
      icon={icon ?? <AlertTriangle className="size-6 text-danger" aria-hidden="true" />}
      className={cn("border-danger/40", className)}
    />
  );
}

export function EmptyState({ icon, ...props }: StateProps) {
  return <StatePanel role="status" icon={icon ?? <SearchX className="size-6" aria-hidden="true" />} {...props} />;
}

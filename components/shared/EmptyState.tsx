import { ReactNode } from "react";

interface EmptyStateProps {
  icon?: string;
  iconNode?: ReactNode;
  title: string;
  description: string;
}

export function EmptyState({
  icon,
  iconNode,
  title,
  description,
}: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <div className="mb-4">
        {iconNode ?? (icon && <span className="text-4xl">{icon}</span>)}
      </div>
      <h3 className="text-title font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-body text-muted-foreground">{description}</p>
    </div>
  );
}

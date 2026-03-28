import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

export function WidgetHeader({
  icon: Icon,
  title,
  editLink,
  editLabel = "Edit ↗",
  badge,
}: {
  icon: LucideIcon;
  title: string;
  editLink?: string;
  editLabel?: string;
  badge?: React.ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-4 w-4 text-primary shrink-0" />
      <h3 className="text-sm font-semibold text-foreground flex-1">{title}</h3>
      {badge}
      {editLink && (
        <button
          onClick={() => navigate(editLink)}
          className="text-xs text-primary hover:text-primary/80 font-medium shrink-0 transition-colors"
        >
          {editLabel}
        </button>
      )}
    </div>
  );
}

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusLabels = {
  to_edit: "To Edit",
  in_progress: "In Progress",
  completed: "Completed",
} as const;

const statusVariants = {
  to_edit: "secondary",
  in_progress: "default",
  completed: "outline",
} as const;

export function VideoStatusBadge({
  status,
  className,
}: {
  status: keyof typeof statusLabels;
  className?: string;
}) {
  return (
    <Badge variant={statusVariants[status]} className={cn(className)}>
      {statusLabels[status]}
    </Badge>
  );
}

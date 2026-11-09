import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DeadLetterStatus } from "@/lib/generated/billing/models";

export function DeadLetterStatusBadge({ status }: { status: DeadLetterStatus }) {
  const pending = status === DeadLetterStatus.PENDING;
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full border px-3 py-0.5 font-bold",
        pending
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-green-200 bg-green-50 text-green-700",
      )}
    >
      {pending ? "Pending" : "Replayed"}
    </Badge>
  );
}

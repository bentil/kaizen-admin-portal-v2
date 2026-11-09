"use client";

import { Eye, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeadLetterStatus, type DeadLetterMessage } from "@/lib/generated/billing/models";

interface RowActionsProps {
  message: Pick<DeadLetterMessage, "id" | "status">;
  onView: () => void;
  onReplay: () => void;
  onDelete: () => void;
}

/** View, replay (while pending) and delete buttons for one failed message */
export function RowActions({ message, onView, onReplay, onDelete }: RowActionsProps) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`View message ${message.id}`}
        title="View details"
        onClick={onView}
        className="rounded-xl text-slate-500 hover:bg-violet-50 hover:text-violet-600"
      >
        <Eye />
      </Button>
      {message.status === DeadLetterStatus.PENDING && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Replay message ${message.id}`}
          title="Replay"
          onClick={onReplay}
          className="rounded-xl text-slate-500 hover:bg-violet-50 hover:text-violet-600"
        >
          <RotateCcw />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Delete message ${message.id}`}
        title="Delete"
        onClick={onDelete}
        className="rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 />
      </Button>
    </div>
  );
}

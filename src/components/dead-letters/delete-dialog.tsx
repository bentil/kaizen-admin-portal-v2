"use client";

import * as React from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { extractErrorMessage } from "@/lib/api-error";
import {
  useDeleteDeadLetter,
  usePurgeDeadLetters,
} from "@/lib/generated/billing/admin/admin";
import { DeadLetterStatus } from "@/lib/generated/billing/models";
import { invalidateDeadLetters } from "./queries";
import { useLastDefined } from "./use-last-defined";

export interface DeleteTarget {
  /** The messages to delete, with whether each is still pending */
  messages: { id: number; status: DeadLetterStatus }[];
}

interface DeleteDialogProps {
  target: DeleteTarget | null;
  onClose: () => void;
  /** Called after the messages are deleted */
  onDeleted: () => void;
}

export function DeleteDialog({ target, onClose, onDeleted }: DeleteDialogProps) {
  const deleteOne = useDeleteDeadLetter();
  const purge = usePurgeDeadLetters();
  const [running, setRunning] = React.useState(false);

  // Keep showing the last target while the dialog animates closed
  const shown = useLastDefined(target);

  const messages = shown?.messages ?? [];
  const pending = messages.filter((m) => m.status === DeadLetterStatus.PENDING).length;
  const single = messages.length === 1;

  const confirm = async () => {
    // Nothing to delete would be sent as an empty purge, which the API refuses
    if (!target || messages.length === 0) return;
    setRunning(true);
    try {
      if (single) {
        await deleteOne.mutateAsync({ id: messages[0].id });
        toast.success(`Message #${messages[0].id} deleted`);
      } else {
        // Naming the messages is what allows pending ones to be deleted
        const response = await purge.mutateAsync({ data: { ids: messages.map((m) => m.id) } });
        const { deleted } = response.data;
        toast.success(`${deleted} message${deleted === 1 ? "" : "s"} deleted`);
      }
      invalidateDeadLetters();
      onDeleted();
      onClose();
    } catch (err) {
      toast.error(extractErrorMessage(err, "Failed to delete the message(s)"));
    } finally {
      setRunning(false);
    }
  };

  return (
    <Dialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open && !running) onClose();
      }}
    >
      <DialogContent className="rounded-[2rem] border-none bg-white p-10 shadow-2xl sm:max-w-[480px]">
        <DialogHeader>
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <Trash2 className="h-8 w-8" />
          </div>
          <DialogTitle className="text-3xl font-black text-slate-900">
            {single ? `Delete message #${messages[0]?.id}` : `Delete ${messages.length} messages`}
          </DialogTitle>
          <DialogDescription className="mt-2 text-lg font-medium text-slate-500">
            {pending > 0 ? (
              <>
                <span className="font-bold text-red-600">
                  {pending === messages.length
                    ? single
                      ? "This message has not been replayed."
                      : "None of these messages have been replayed."
                    : `${pending} of these have not been replayed.`}
                </span>{" "}
                Deleting means the event is lost for good and its change is never applied.
              </>
            ) : (
              `${single ? "This message was" : "These messages were"} already replayed. This action cannot be undone.`
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={running}
            className="h-12 flex-1 rounded-2xl bg-slate-50 font-bold text-slate-600"
          >
            Keep {single ? "message" : "messages"}
          </Button>
          <Button
            onClick={confirm}
            disabled={running || messages.length === 0}
            className="h-12 flex-1 rounded-2xl bg-red-600 font-black text-white shadow-lg shadow-red-500/20 hover:bg-red-700"
          >
            {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Confirm delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

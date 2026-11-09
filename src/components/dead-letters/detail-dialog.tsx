"use client";

import * as React from "react";
import { Copy, Loader2, RotateCcw, Trash2 } from "lucide-react";
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
import { useGetDeadLetter } from "@/lib/generated/billing/admin/admin";
import { DeadLetterStatus, type DeadLetterMessage } from "@/lib/generated/billing/models";
import { formatAge, formatDateTime, prettyJson } from "./format";
import { DeadLetterStatusBadge } from "./status-badge";
import { useLastDefined } from "./use-last-defined";

interface DetailDialogProps {
  id: number | null;
  onClose: () => void;
  onReplay: (message: DeadLetterMessage) => void;
  onDelete: (message: DeadLetterMessage) => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <div className="mt-1 break-words text-sm font-medium text-slate-800">{children}</div>
    </div>
  );
}

function copy(text: string, what: string): void {
  const failed = () => toast.error(`Could not copy the ${what.toLowerCase()}`);
  // The clipboard is missing outside secure contexts, where calling it would throw
  if (!navigator.clipboard?.writeText) {
    failed();
    return;
  }
  navigator.clipboard
    .writeText(text)
    .then(() => toast.success(`${what} copied`))
    .catch(failed);
}

function replayedBy(message: DeadLetterMessage): string | null {
  const by = message.lastReplayedBy as { username?: string; name?: string } | null;
  if (!by) return null;
  return by.name ? `${by.name} (${by.username ?? "unknown"})` : (by.username ?? null);
}

export function DetailDialog({ id, onClose, onReplay, onDelete }: DetailDialogProps) {
  // Keep showing the last message while the dialog animates closed
  const shownId = useLastDefined(id);

  const { data, isLoading, error } = useGetDeadLetter(shownId ?? 0, {
    query: { enabled: shownId !== null },
  });
  const message = data?.data;
  const pending = message?.status === DeadLetterStatus.PENDING;

  return (
    <Dialog open={id !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[2rem] border-none bg-white p-0 shadow-2xl sm:max-w-3xl">
        <div className="p-8 pb-0 sm:p-10 sm:pb-0">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-3 text-3xl font-black text-slate-900">
              Message #{shownId}
              {message && <DeadLetterStatusBadge status={message.status} />}
            </DialogTitle>
            <DialogDescription className="font-mono text-sm text-slate-500">
              {message?.topic ?? "Loading…"}
            </DialogDescription>
          </DialogHeader>

          {message && (
            <div className="mt-4 flex flex-wrap gap-2">
              {pending && (
                <Button
                  onClick={() => onReplay(message)}
                  className="h-10 rounded-xl bg-[#8B5CF6] px-5 font-black text-white shadow-lg shadow-violet-500/20 hover:bg-[#7C3AED]"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Replay
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={() => onDelete(message)}
                className="h-10 rounded-xl bg-red-50 px-5 font-bold text-red-600 hover:bg-red-100"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-6 p-8 sm:p-10">
          {isLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
            </div>
          )}

          {error && !isLoading && (
            <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
              {extractErrorMessage(error, "Could not load this message.")}
            </p>
          )}

          {message && (
            <>
              <div className="rounded-2xl border border-red-100 bg-red-50/60 p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-red-400">
                  Why it failed
                </p>
                <p className="mt-1 break-words font-mono text-sm text-red-900">{message.error}</p>
                {message.errorStack && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-bold text-red-700">
                      Stack trace
                    </summary>
                    <pre className="mt-2 max-h-60 overflow-auto rounded-xl bg-white p-3 text-xs text-slate-700">
                      {message.errorStack}
                    </pre>
                  </details>
                )}
              </div>

              <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
                <Field label="Failed">
                  {formatDateTime(message.failedAt)}
                  <span className="block text-xs text-slate-400">{formatAge(message.failedAt)}</span>
                </Field>
                <Field label="Attempts">{message.attempts}</Field>
                <Field label="Request ID">{message.requestId ?? "—"}</Field>
                <Field label="Message key">{message.messageKey ?? "—"}</Field>
                <Field label="Partition / offset">
                  {message.kafkaPartition} / {message.kafkaOffset}
                </Field>
                <Field label="Payload hash">
                  <span className="font-mono text-xs">{message.payloadHash.slice(0, 16)}…</span>
                </Field>
              </div>

              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Replay history
                </p>
                <div className="mt-3 grid grid-cols-2 gap-5 sm:grid-cols-3">
                  <Field label="Times replayed">{message.replayCount}</Field>
                  <Field label="Last replay">{formatDateTime(message.lastReplayedAt)}</Field>
                  <Field label="By">{replayedBy(message) ?? "—"}</Field>
                  {message.replayedAt && (
                    <Field label="Replayed successfully">{formatDateTime(message.replayedAt)}</Field>
                  )}
                </div>
                {message.lastReplayError && (
                  <div className="mt-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Last replay error
                    </p>
                    <p className="mt-1 break-words font-mono text-xs text-red-800">
                      {message.lastReplayError}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Payload
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => copy(prettyJson(message.payload), "Payload")}
                    className="rounded-xl font-bold text-slate-500"
                  >
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                    Copy
                  </Button>
                </div>
                <pre
                  data-testid="dead-letter-payload"
                  className="max-h-72 overflow-auto rounded-2xl bg-slate-900 p-4 text-xs leading-relaxed text-slate-100"
                >
                  {prettyJson(message.payload)}
                </pre>
              </div>

              {message.headers && Object.keys(message.headers as object).length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                    Headers
                  </p>
                  <pre className="max-h-40 overflow-auto rounded-2xl bg-slate-50 p-4 text-xs text-slate-700">
                    {prettyJson(message.headers)}
                  </pre>
                </div>
              )}

            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

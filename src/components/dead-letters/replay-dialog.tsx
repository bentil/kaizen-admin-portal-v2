"use client";

import * as React from "react";
import { CircleCheck, Loader2, RotateCcw, TriangleAlert, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { extractErrorMessage } from "@/lib/api-error";
import {
  useReplayDeadLetter,
  useReplayDeadLetters,
} from "@/lib/generated/billing/admin/admin";
import type {
  BulkReplayResultDto,
  ReplayDeadLettersDto,
  ReplayResultDto,
} from "@/lib/generated/billing/models";
import { formatDateTime, isTimeoutOrNetworkError } from "./format";
import { invalidateDeadLetters } from "./queries";
import { useLastDefined } from "./use-last-defined";

export type ReplayTarget =
  | { kind: "one"; id: number; topic: string; failedAt: string }
  | { kind: "selected"; ids: number[] }
  | {
      kind: "pending";
      topic?: string;
      /** How many are pending in that scope */
      pendingCount: number;
      /** Whether the list is filtered by more than the topic, which a replay ignores */
      otherFiltersActive: boolean;
    };

/**
 * How many messages "replay all pending" takes on at once. Each runs through its
 * handler inside a single request, so a big batch could outlast the request's
 * timeout; a smaller one finishes comfortably and can simply be run again.
 */
export const BULK_REPLAY_LIMIT = 25;

interface ReplayDialogProps {
  target: ReplayTarget | null;
  onClose: () => void;
  /** Called once a replay has finished, whatever its outcome */
  onFinished?: () => void;
}

function title(target: ReplayTarget): string {
  switch (target.kind) {
    case "one":
      return `Replay message #${target.id}`;
    case "selected":
      return `Replay ${target.ids.length} selected message${target.ids.length === 1 ? "" : "s"}`;
    case "pending":
      return target.topic ? `Replay pending messages for ${target.topic}` : "Replay pending messages";
  }
}

function description(target: ReplayTarget): string {
  switch (target.kind) {
    case "one":
      return `This message failed on ${formatDateTime(target.failedAt)} (${target.topic}). Replaying runs it through its handler again.`;
    case "selected":
      return "Each message is replayed one at a time, oldest first. A message that is no longer pending is reported as failed.";
    case "pending": {
      const batch = Math.min(BULK_REPLAY_LIMIT, target.pendingCount);
      const scope = target.topic ? ` for ${target.topic}` : "";
      return (
        `Replays the ${batch} oldest of ${target.pendingCount} pending message${
          target.pendingCount === 1 ? "" : "s"
        }${scope}, one at a time. ` +
        (target.pendingCount > batch ? "Run it again to continue. " : "") +
        (target.otherFiltersActive
          ? "The list's status, date and request ID filters are not applied; only the topic is."
          : "")
      ).trim();
    }
  }
}

export function ReplayDialog({ target, onClose, onFinished }: ReplayDialogProps) {
  const [acknowledged, setAcknowledged] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [single, setSingle] = React.useState<ReplayResultDto | null>(null);
  const [bulk, setBulk] = React.useState<BulkReplayResultDto | null>(null);
  // The request may have reached the server, but we never saw its answer
  const [uncertain, setUncertain] = React.useState(false);

  // Keep showing the last target while the dialog animates closed
  const shown = useLastDefined(target);

  const replayOne = useReplayDeadLetter();
  const replayMany = useReplayDeadLetters();

  // Start every replay from a clean slate
  React.useEffect(() => {
    if (!target) return;
    setAcknowledged(false);
    setRunning(false);
    setError(null);
    setSingle(null);
    setBulk(null);
    setUncertain(false);
  }, [target]);

  const finished = single !== null || bulk !== null || uncertain;

  const run = async () => {
    if (!target) return;
    setRunning(true);
    setError(null);
    try {
      if (target.kind === "one") {
        const response = await replayOne.mutateAsync({
          id: target.id,
          params: { force: true },
        });
        if (response.data.replayed) {
          toast.success(`Message #${target.id} replayed`);
          onClose();
        } else {
          setSingle(response.data);
        }
      } else {
        const data: ReplayDeadLettersDto =
          target.kind === "selected"
            ? { ids: target.ids, force: true }
            : { topic: target.topic, force: true, limit: BULK_REPLAY_LIMIT };
        const response = await replayMany.mutateAsync({ data });
        setBulk(response.data);
      }
    } catch (err) {
      if (isTimeoutOrNetworkError(err)) {
        // It may still be running. Offering Replay again could run it twice at
        // once, so just say so and look again shortly.
        setUncertain(true);
        window.setTimeout(invalidateDeadLetters, 15_000);
      } else {
        setError(extractErrorMessage(err, "The replay could not be started."));
      }
    } finally {
      setRunning(false);
      invalidateDeadLetters();
      onFinished?.();
    }
  };

  return (
    <Dialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open && !running) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[2rem] border-none bg-white p-10 shadow-2xl sm:max-w-[560px]">
        {shown && (
          <>
            <DialogHeader>
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                <RotateCcw className="h-7 w-7" />
              </div>
              <DialogTitle className="text-3xl font-black text-slate-900">
                {title(shown)}
              </DialogTitle>
              <DialogDescription className="mt-2 text-base font-medium text-slate-500">
                {description(shown)}
              </DialogDescription>
            </DialogHeader>

            {!finished && (
              <div className="mt-6 space-y-5">
                <div
                  role="alert"
                  className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
                >
                  <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div className="space-y-1">
                    <p className="font-bold">Replaying can overwrite newer changes</p>
                    <p>
                      A message is applied exactly as it was received, over whatever the data
                      looks like now. If the record has been updated since the message failed, the
                      replay can undo those updates.
                      {shown.kind === "one" && " Review the message details before replaying."}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="replay-ack"
                    checked={acknowledged}
                    onCheckedChange={(v) => setAcknowledged(v === true)}
                    disabled={running}
                    className="mt-0.5 size-5 rounded-md data-[state=checked]:border-violet-600 data-[state=checked]:bg-violet-600 data-[state=checked]:text-white"
                  />
                  <Label htmlFor="replay-ack" className="cursor-pointer text-sm font-semibold leading-snug text-slate-700">
                    I understand that replaying can overwrite newer changes, and I want to go ahead.
                  </Label>
                </div>

                {error && (
                  <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
                    {error}
                  </p>
                )}

                <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                  <Button
                    variant="ghost"
                    onClick={onClose}
                    disabled={running}
                    className="h-12 flex-1 rounded-2xl bg-slate-50 font-bold text-slate-600"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={run}
                    disabled={!acknowledged || running}
                    className="h-12 flex-1 rounded-2xl bg-[#8B5CF6] font-black text-white shadow-lg shadow-violet-500/20 hover:bg-[#7C3AED]"
                  >
                    {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Replay
                  </Button>
                </div>
              </div>
            )}

            {uncertain && (
              <div className="mt-6 space-y-5">
                <div role="alert" className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div className="space-y-1">
                    <p className="font-bold">No answer came back in time</p>
                    <p>
                      The server may still be working through the messages. Wait a minute, then
                      refresh the list to see which were replayed. Don&apos;t start the replay again
                      until then, or the same messages could be replayed twice at once.
                    </p>
                  </div>
                </div>
                <Button onClick={onClose} className="h-12 w-full rounded-2xl bg-slate-900 font-black text-white hover:bg-slate-800">
                  Done
                </Button>
              </div>
            )}

            {single && !single.replayed && (
              <div className="mt-6 space-y-5">
                <div role="alert" className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                  <div className="min-w-0 space-y-1">
                    <p className="font-bold">The replay failed</p>
                    <p className="break-words font-mono text-xs">{single.error}</p>
                    <p>The message is still pending, so you can fix the cause and try again.</p>
                  </div>
                </div>
                <Button onClick={onClose} className="h-12 w-full rounded-2xl bg-slate-900 font-black text-white hover:bg-slate-800">
                  Done
                </Button>
              </div>
            )}

            {bulk && (
              <div className="mt-6 space-y-5">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-2xl font-black text-slate-900">{bulk.attempted}</p>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Attempted</p>
                  </div>
                  <div className="rounded-2xl bg-green-50 p-4">
                    <p className="text-2xl font-black text-green-700">{bulk.replayed}</p>
                    <p className="text-xs font-bold uppercase tracking-wider text-green-600">Replayed</p>
                  </div>
                  <div className={bulk.failed > 0 ? "rounded-2xl bg-red-50 p-4" : "rounded-2xl bg-slate-50 p-4"}>
                    <p className={bulk.failed > 0 ? "text-2xl font-black text-red-700" : "text-2xl font-black text-slate-900"}>
                      {bulk.failed}
                    </p>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Failed</p>
                  </div>
                </div>

                {bulk.attempted === 0 && (
                  <p className="flex items-center gap-2 text-sm font-medium text-slate-500">
                    <CircleCheck className="h-4 w-4 text-green-600" />
                    There were no pending messages to replay.
                  </p>
                )}

                {bulk.failed > 0 && (
                  <div className="max-h-48 space-y-2 overflow-y-auto rounded-2xl border border-red-100 bg-red-50/50 p-3">
                    {bulk.results
                      .filter((r) => !r.replayed)
                      .map((r) => (
                        <div key={r.id} className="text-sm">
                          <span className="font-bold text-red-700">#{r.id}</span>{" "}
                          <span className="break-words font-mono text-xs text-red-800">{r.error}</span>
                        </div>
                      ))}
                  </div>
                )}

                <Button onClick={onClose} className="h-12 w-full rounded-2xl bg-slate-900 font-black text-white hover:bg-slate-800">
                  Done
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

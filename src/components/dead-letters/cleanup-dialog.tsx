"use client";

import * as React from "react";
import { Eraser, Loader2 } from "lucide-react";
import { subDays } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { extractErrorMessage } from "@/lib/api-error";
import { usePurgeDeadLetters } from "@/lib/generated/billing/admin/admin";
import { DeadLetterStatus } from "@/lib/generated/billing/models";
import { invalidateDeadLetters } from "./queries";

// Not a plausible topic name, so it can't be mistaken for one
const ALL = "__all__";
// Age counts from when the message failed, not from when it was replayed
const AGES = [
  { value: ALL, label: "Any age" },
  { value: "7", label: "Failed over 7 days ago" },
  { value: "30", label: "Failed over 30 days ago" },
  { value: "90", label: "Failed over 90 days ago" },
];

interface CleanupDialogProps {
  open: boolean;
  topics: string[];
  initialTopic: string;
  onClose: () => void;
}

/**
 * Deletes messages that were already replayed. Pending messages are never
 * touched: the API only deletes those when they are named one by one.
 */
export function CleanupDialog({ open, topics, initialTopic, onClose }: CleanupDialogProps) {
  const purge = usePurgeDeadLetters();
  const [age, setAge] = React.useState(ALL);
  const [topic, setTopic] = React.useState(ALL);
  const [running, setRunning] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setAge(ALL);
      setTopic(initialTopic || ALL);
    }
  }, [open, initialTopic]);

  const confirm = async () => {
    setRunning(true);
    try {
      const response = await purge.mutateAsync({
        data: {
          status: DeadLetterStatus.REPLAYED,
          topic: topic === ALL ? undefined : topic,
          failedBefore: age === ALL ? undefined : subDays(new Date(), Number(age)).toISOString(),
        },
      });
      const { deleted } = response.data;
      toast.success(
        deleted === 0
          ? "No replayed messages matched"
          : `${deleted} replayed message${deleted === 1 ? "" : "s"} deleted`,
      );
      invalidateDeadLetters();
      onClose();
    } catch (err) {
      toast.error(extractErrorMessage(err, "Failed to clean up replayed messages"));
    } finally {
      setRunning(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !running) onClose();
      }}
    >
      <DialogContent className="rounded-[2rem] border-none bg-white p-10 shadow-2xl sm:max-w-[520px]">
        <DialogHeader>
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
            <Eraser className="h-7 w-7" />
          </div>
          <DialogTitle className="text-3xl font-black text-slate-900">
            Clear replayed messages
          </DialogTitle>
          <DialogDescription className="mt-2 text-base font-medium text-slate-500">
            Permanently deletes messages that were already replayed.{" "}
            <span className="font-bold text-slate-700">
              Pending messages are never deleted here.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label className="font-bold text-slate-800">Which messages</Label>
            <Select value={age} onValueChange={setAge}>
              <SelectTrigger aria-label="Age" className="w-full rounded-xl border-slate-200 data-[size=default]:h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-xl">
                {AGES.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-400">
              Counted from when the message failed, not from when it was replayed.
            </p>
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-slate-800">Topic</Label>
            <Select value={topic} onValueChange={setTopic}>
              <SelectTrigger aria-label="Topic" className="w-full rounded-xl border-slate-200 data-[size=default]:h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-xl">
                <SelectItem value={ALL}>All topics</SelectItem>
                {topics.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={running}
            className="h-12 flex-1 rounded-2xl bg-slate-50 font-bold text-slate-600"
          >
            Cancel
          </Button>
          <Button
            onClick={confirm}
            disabled={running}
            className="h-12 flex-1 rounded-2xl bg-red-600 font-black text-white shadow-lg shadow-red-500/20 hover:bg-red-700"
          >
            {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Delete replayed messages
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import * as React from "react";
import { CircleCheck, Clock, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DeadLetterSummaryDto } from "@/lib/generated/billing/models";
import { formatAge } from "./format";

interface SummaryPanelProps {
  topics: DeadLetterSummaryDto[];
  activeTopic: string;
  onSelectTopic: (topic: string) => void;
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", tone)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="truncate text-2xl font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}

export function SummaryPanel({ topics, activeTopic, onSelectTopic }: SummaryPanelProps) {
  const pending = topics.reduce((sum, t) => sum + t.pending, 0);
  const replayed = topics.reduce((sum, t) => sum + t.replayed, 0);
  const oldest = topics
    .map((t) => t.oldestPendingFailedAt)
    .filter((d): d is string => !!d)
    .sort()[0];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          icon={<TriangleAlert className="h-6 w-6" />}
          label="Pending"
          value={pending.toLocaleString()}
          tone={pending > 0 ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-400"}
        />
        <Stat
          icon={<CircleCheck className="h-6 w-6" />}
          label="Replayed"
          value={replayed.toLocaleString()}
          tone="bg-green-50 text-green-600"
        />
        <Stat
          icon={<Clock className="h-6 w-6" />}
          label="Oldest pending"
          value={oldest ? formatAge(oldest) : "None"}
          tone="bg-violet-50 text-violet-600"
        />
      </div>

      {topics.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-bold uppercase tracking-wider text-slate-400">
            By topic
          </span>
          {topics.map((t) => {
            const active = activeTopic === t.topic;
            return (
              <button
                key={t.topic}
                type="button"
                aria-pressed={active}
                onClick={() => onSelectTopic(active ? "" : t.topic)}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "border-violet-300 bg-violet-50 text-violet-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:bg-violet-50/50",
                )}
              >
                <span className="font-mono text-xs">{t.topic}</span>
                {t.pending > 0 && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                    {t.pending}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

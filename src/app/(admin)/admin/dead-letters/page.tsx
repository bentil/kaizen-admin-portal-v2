"use client";

import * as React from "react";
import { keepPreviousData } from "@tanstack/react-query";
import {
  Eraser,
  Inbox,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaginationController } from "@/components/ui/pagination-controller";
import { cn } from "@/lib/utils";
import { extractErrorMessage } from "@/lib/api-error";
import {
  useGetDeadLetterSummary,
  useGetDeadLetters,
} from "@/lib/generated/billing/admin/admin";
import {
  DeadLetterOrderBy,
  DeadLetterStatus,
  type GetDeadLettersParams,
} from "@/lib/generated/billing/models";
import { CleanupDialog } from "@/components/dead-letters/cleanup-dialog";
import { DeleteDialog, type DeleteTarget } from "@/components/dead-letters/delete-dialog";
import { DetailDialog } from "@/components/dead-letters/detail-dialog";
import {
  endOfDayIso,
  formatAge,
  formatDateTime,
  httpStatus,
  startOfDayIso,
  truncate,
} from "@/components/dead-letters/format";
import {
  invalidateDeadLetters,
  pollUnlessForbidden,
  refetchOnFocusUnlessForbidden,
} from "@/components/dead-letters/queries";
import { ReplayDialog, type ReplayTarget } from "@/components/dead-letters/replay-dialog";
import { RowActions } from "@/components/dead-letters/row-actions";
import { DeadLetterStatusBadge } from "@/components/dead-letters/status-badge";
import { SummaryPanel } from "@/components/dead-letters/summary-panel";

const PAGE_LIMIT = 20;

type StatusFilter = typeof DeadLetterStatus.PENDING | typeof DeadLetterStatus.REPLAYED | "ALL";

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: DeadLetterStatus.PENDING, label: "Pending" },
  { value: DeadLetterStatus.REPLAYED, label: "Replayed" },
  { value: "ALL", label: "All" },
];

// Not a plausible topic name, so it can't be mistaken for one
const ALL_TOPICS = "__all__";

// Violet when checked; when only some rows are selected, a bar instead of the tick
const checkboxClass =
  "size-5 rounded-md data-[state=checked]:border-violet-600 data-[state=checked]:bg-violet-600 data-[state=checked]:text-white " +
  "data-[state=indeterminate]:border-violet-600 data-[state=indeterminate]:bg-violet-600 data-[state=indeterminate]:[&_svg]:hidden " +
  "data-[state=indeterminate]:before:absolute data-[state=indeterminate]:before:h-0.5 data-[state=indeterminate]:before:w-2.5 " +
  "data-[state=indeterminate]:before:rounded data-[state=indeterminate]:before:bg-white data-[state=indeterminate]:before:content-['']";

export default function AdminFailedMessagesPage() {
  const [status, setStatus] = React.useState<StatusFilter>(DeadLetterStatus.PENDING);
  const [topic, setTopic] = React.useState("");
  const [requestIdInput, setRequestIdInput] = React.useState("");
  const [requestId, setRequestId] = React.useState("");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [orderBy, setOrderBy] = React.useState<DeadLetterOrderBy>(DeadLetterOrderBy["failedAt:desc"]);
  const [page, setPage] = React.useState(1);
  const [selected, setSelected] = React.useState<Set<number>>(new Set());

  const [detailId, setDetailId] = React.useState<number | null>(null);
  const [replayTarget, setReplayTarget] = React.useState<ReplayTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<DeleteTarget | null>(null);
  const [cleanupOpen, setCleanupOpen] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setRequestId(requestIdInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [requestIdInput]);

  // A different set of messages: go back to the first page and drop the selection
  React.useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [status, topic, requestId, from, to, orderBy]);
  React.useEffect(() => setSelected(new Set()), [page]);

  // The API refuses a range that ends before it starts; say so instead of asking it
  const rangeInvalid = from !== "" && to !== "" && from > to;

  const params: GetDeadLettersParams = {
    page,
    limit: PAGE_LIMIT,
    status: status === "ALL" ? undefined : status,
    topic: topic || undefined,
    requestId: requestId || undefined,
    failedFrom: rangeInvalid ? undefined : startOfDayIso(from),
    failedTo: rangeInvalid ? undefined : endOfDayIso(to),
    orderBy,
  };

  const list = useGetDeadLetters(params, { query: { placeholderData: keepPreviousData } });
  const summary = useGetDeadLetterSummary({
    query: {
      refetchInterval: pollUnlessForbidden(30_000),
      refetchOnWindowFocus: refetchOnFocusUnlessForbidden,
    },
  });

  const rows = list.data?.data ?? [];
  const pagination = list.data?.pagination;
  const topics = summary.data?.data ?? [];
  const forbidden = httpStatus(list.error) === 403;

  // Rows leave the list when they are replayed or deleted (here or elsewhere).
  // Forget selected ones that are gone, so the count and the actions agree.
  React.useEffect(() => {
    const visible = new Set(rows.map((r) => r.id));
    setSelected((prev) => {
      const kept = new Set([...prev].filter((id) => visible.has(id)));
      return kept.size === prev.size ? prev : kept;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rows only changes with list.data
  }, [list.data]);

  // Removing the last row of a page beyond the first leaves that page empty:
  // step back to the last page that still has messages
  React.useEffect(() => {
    if (pagination && page > Math.max(1, pagination.totalPages)) {
      setPage(Math.max(1, pagination.totalPages));
    }
  }, [pagination, page]);

  const pendingForScope = topic
    ? (topics.find((t) => t.topic === topic)?.pending ?? 0)
    : topics.reduce((sum, t) => sum + t.pending, 0);

  const selectedRows = rows.filter((r) => selected.has(r.id));
  const selectedPendingIds = selectedRows
    .filter((r) => r.status === DeadLetterStatus.PENDING)
    .map((r) => r.id);
  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const someOnPageSelected = selectedRows.length > 0 && !allOnPageSelected;

  const filtersChanged =
    status !== DeadLetterStatus.PENDING ||
    topic !== "" ||
    requestIdInput !== "" ||
    from !== "" ||
    to !== "" ||
    orderBy !== DeadLetterOrderBy["failedAt:desc"];

  const resetFilters = () => {
    setStatus(DeadLetterStatus.PENDING);
    setTopic("");
    setRequestIdInput("");
    setFrom("");
    setTo("");
    setOrderBy(DeadLetterOrderBy["failedAt:desc"]);
  };

  const toggleRow = (id: number, checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

  const toggleAll = (checked: boolean) =>
    setSelected(checked ? new Set(rows.map((r) => r.id)) : new Set());

  const refresh = () => {
    invalidateDeadLetters();
  };

  const actionsFor = (m: (typeof rows)[number]) => (
    <RowActions
      message={m}
      onView={() => setDetailId(m.id)}
      onReplay={() =>
        setReplayTarget({ kind: "one", id: m.id, topic: m.topic, failedAt: m.failedAt })
      }
      onDelete={() => setDeleteTarget({ messages: [{ id: m.id, status: m.status }] })}
    />
  );

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-violet-600">
            <TriangleAlert className="h-4 w-4" />
            Operations
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Failed Messages</h1>
          <p className="max-w-2xl text-lg text-slate-500">
            Messages from other Kaizen services that could not be processed. Review why each
            failed, then replay it once the cause is fixed, or delete it.
          </p>
        </div>
        {!forbidden && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            aria-label="Refresh"
            onClick={refresh}
            className="h-12 w-12 rounded-2xl border-slate-200"
          >
            <RefreshCw className={cn("h-5 w-5", (list.isFetching || summary.isFetching) && "animate-spin")} />
          </Button>
          <Button
            variant="outline"
            onClick={() => setCleanupOpen(true)}
            className="h-12 rounded-2xl border-slate-200 px-5 font-bold"
          >
            <Eraser className="mr-2 h-4 w-4" />
            Clear replayed
          </Button>
          <Button
            onClick={() =>
              setReplayTarget({
                kind: "pending",
                topic: topic || undefined,
                pendingCount: pendingForScope,
                // A replay is scoped by topic only; the rest of the filters don't apply
                otherFiltersActive:
                  status !== DeadLetterStatus.PENDING || requestId !== "" || from !== "" || to !== "",
              })
            }
            disabled={pendingForScope === 0}
            className="h-12 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 text-base font-black text-white shadow-xl shadow-violet-500/25 hover:from-violet-700 hover:to-indigo-700"
          >
            <RotateCcw className="mr-2 h-5 w-5" />
            Replay all pending
            {pendingForScope > 0 && (
              <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-sm">
                {pendingForScope}
              </span>
            )}
          </Button>
        </div>
        )}
      </div>

      {!forbidden && (
        <SummaryPanel topics={topics} activeTopic={topic} onSelectTopic={setTopic} />
      )}

      {/* Filters */}
      {!forbidden && (
      <div className="space-y-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div role="group" aria-label="Status" className="flex rounded-2xl bg-slate-100 p-1">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                aria-pressed={status === tab.value}
                onClick={() => setStatus(tab.value)}
                className={cn(
                  "rounded-xl px-4 py-2 text-sm font-bold transition-all",
                  status === tab.value
                    ? "bg-white text-violet-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-800",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <Select value={topic || ALL_TOPICS} onValueChange={(v) => setTopic(v === ALL_TOPICS ? "" : v)}>
            <SelectTrigger aria-label="Topic" className="w-full rounded-xl border-slate-200 data-[size=default]:h-11 sm:w-64">
              <SelectValue placeholder="All topics" />
            </SelectTrigger>
            <SelectContent className="rounded-xl shadow-xl">
              <SelectItem value={ALL_TOPICS}>All topics</SelectItem>
              {topics.map((t) => (
                <SelectItem key={t.topic} value={t.topic}>
                  {t.topic}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              aria-label="Request ID"
              placeholder="Search by request ID"
              value={requestIdInput}
              onChange={(e) => setRequestIdInput(e.target.value)}
              className="h-11 rounded-xl border-slate-200 pl-10"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-500">
            Failed from
            <Input
              type="date"
              aria-label="Failed from"
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
              className="h-11 w-40 rounded-xl border-slate-200"
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-500">
            to
            <Input
              type="date"
              aria-label="Failed to"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
              className="h-11 w-40 rounded-xl border-slate-200"
            />
          </label>

          <Select value={orderBy} onValueChange={(v) => setOrderBy(v as DeadLetterOrderBy)}>
            <SelectTrigger aria-label="Order" className="w-44 rounded-xl border-slate-200 data-[size=default]:h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl shadow-xl">
              <SelectItem value={DeadLetterOrderBy["failedAt:desc"]}>Newest first</SelectItem>
              <SelectItem value={DeadLetterOrderBy["failedAt:asc"]}>Oldest first</SelectItem>
            </SelectContent>
          </Select>

          {filtersChanged && (
            <Button variant="ghost" onClick={resetFilters} className="rounded-xl font-bold text-slate-500">
              Reset filters
            </Button>
          )}
        </div>
        {rangeInvalid && (
          <p role="alert" className="text-sm font-medium text-red-600">
            &ldquo;To&rdquo; must be on or after &ldquo;From&rdquo;. The date range is ignored until it is fixed.
          </p>
        )}
      </div>
      )}

      {/* Bulk actions */}
      {selectedRows.length > 0 && (
        <div
          role="region"
          aria-label="Selected messages"
          className="flex flex-wrap items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-5 py-3"
        >
          <span className="font-bold text-violet-800">{selectedRows.length} selected</span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              disabled={selectedPendingIds.length === 0}
              onClick={() => setReplayTarget({ kind: "selected", ids: selectedPendingIds })}
              className="h-10 rounded-xl bg-[#8B5CF6] font-bold text-white hover:bg-[#7C3AED]"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Replay selected
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setDeleteTarget({
                  messages: selectedRows.map((r) => ({ id: r.id, status: r.status })),
                })
              }
              className="h-10 rounded-xl border-red-200 font-bold text-red-600 hover:bg-red-50"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete selected
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} className="h-10 rounded-xl font-bold">
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      {forbidden ? (
        <div className="rounded-3xl border border-slate-100 bg-white p-12 text-center shadow-sm">
          <ShieldAlert className="mx-auto h-12 w-12 text-slate-300" />
          <h2 className="mt-4 text-xl font-black text-slate-900">You don&apos;t have access to failed messages</h2>
          <p className="mt-1 text-slate-500">
            Ask an administrator for the operations permission if you need to manage them.
          </p>
        </div>
      ) : list.isLoading ? (
        <div className="flex justify-center rounded-3xl border border-slate-100 bg-white py-20 shadow-sm">
          <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
        </div>
      ) : list.error ? (
        <div role="alert" className="rounded-3xl border border-red-100 bg-red-50 p-10 text-center">
          <p className="font-bold text-red-700">
            {extractErrorMessage(list.error, "Failed messages could not be loaded.")}
          </p>
          <Button variant="outline" onClick={() => list.refetch()} className="mt-4 rounded-xl font-bold">
            Try again
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-3xl border border-slate-100 bg-white p-14 text-center shadow-sm">
          <Inbox className="mx-auto h-12 w-12 text-slate-300" />
          <h2 className="mt-4 text-xl font-black text-slate-900">
            {filtersChanged ? "No messages match these filters" : "All caught up"}
          </h2>
          <p className="mt-1 text-slate-500">
            {filtersChanged
              ? "Try widening the filters."
              : "There are no pending failed messages right now."}
          </p>
          {filtersChanged && (
            <Button variant="outline" onClick={resetFilters} className="mt-5 rounded-xl font-bold">
              Reset filters
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          {/* Phones: one card per message, so every action stays reachable */}
          <div className="md:hidden">
            <label className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-500">
              <Checkbox
                aria-label="Select all on this page"
                checked={allOnPageSelected ? true : someOnPageSelected ? "indeterminate" : false}
                onCheckedChange={(v) => toggleAll(v === true)}
                className={checkboxClass}
              />
              Select all on this page
            </label>
            <ul className="divide-y divide-slate-100">
              {rows.map((m) => (
                <li key={m.id} data-testid={`dead-letter-card-${m.id}`} className="space-y-2 p-4">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      aria-label={`Select message ${m.id}`}
                      checked={selected.has(m.id)}
                      onCheckedChange={(v) => toggleRow(m.id, v === true)}
                      className={checkboxClass}
                    />
                    <span className="font-mono text-sm font-bold text-slate-700">#{m.id}</span>
                    <DeadLetterStatusBadge status={m.status} />
                    <div className="ml-auto">{actionsFor(m)}</div>
                  </div>
                  <p className="break-all font-mono text-xs text-slate-600">{m.topic}</p>
                  <p className="line-clamp-2 break-words font-mono text-xs text-red-800">{m.error}</p>
                  {m.lastReplayError && (
                    <p className="line-clamp-2 break-words text-xs text-slate-500">
                      Last replay: {m.lastReplayError}
                    </p>
                  )}
                  <p className="text-xs text-slate-400">
                    {formatAge(m.failedAt)} · {m.attempts} attempts · replayed {m.replayCount}×
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {/* Larger screens: a table */}
          <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 pl-5">
                  <Checkbox
                    aria-label="Select all on this page"
                    checked={allOnPageSelected ? true : someOnPageSelected ? "indeterminate" : false}
                    onCheckedChange={(v) => toggleAll(v === true)}
                    className={checkboxClass}
                  />
                </TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Failed</TableHead>
                <TableHead className="text-center">Attempts</TableHead>
                <TableHead className="text-center">Replays</TableHead>
                <TableHead>Error</TableHead>
                <TableHead className="pr-5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((m) => (
                <TableRow key={m.id} data-testid={`dead-letter-row-${m.id}`} data-state={selected.has(m.id) ? "selected" : undefined}>
                  <TableCell className="pl-5">
                    <Checkbox
                      aria-label={`Select message ${m.id}`}
                      checked={selected.has(m.id)}
                      onCheckedChange={(v) => toggleRow(m.id, v === true)}
                      className={checkboxClass}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm font-bold text-slate-700">#{m.id}</TableCell>
                  <TableCell className="font-mono text-xs text-slate-600">{m.topic}</TableCell>
                  <TableCell>
                    <DeadLetterStatusBadge status={m.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    <div className="font-medium text-slate-800">{formatDateTime(m.failedAt)}</div>
                    <div className="text-xs text-slate-400">{formatAge(m.failedAt)}</div>
                  </TableCell>
                  <TableCell className="text-center font-medium">{m.attempts}</TableCell>
                  <TableCell className="text-center font-medium">{m.replayCount}</TableCell>
                  <TableCell className="max-w-xs">
                    <span className="block truncate font-mono text-xs text-red-800" title={m.error}>
                      {truncate(m.error, 80)}
                    </span>
                    {m.lastReplayError && (
                      <span className="mt-0.5 block truncate text-xs text-slate-400" title={m.lastReplayError}>
                        Last replay: {truncate(m.lastReplayError, 60)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="pr-5">{actionsFor(m)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>

          <PaginationController
            currentPage={page}
            totalPages={pagination?.totalPages || 1}
            totalCount={pagination?.totalCount || 0}
            limit={PAGE_LIMIT}
            onPageChange={setPage}
            itemName="messages"
            className="border-t border-slate-100 p-4"
          />
        </div>
      )}

      <DetailDialog
        id={detailId}
        onClose={() => setDetailId(null)}
        onReplay={(m) => {
          setDetailId(null);
          setReplayTarget({ kind: "one", id: m.id, topic: m.topic, failedAt: m.failedAt });
        }}
        onDelete={(m) => {
          setDetailId(null);
          setDeleteTarget({ messages: [{ id: m.id, status: m.status }] });
        }}
      />
      <ReplayDialog
        target={replayTarget}
        onClose={() => setReplayTarget(null)}
        onFinished={() => setSelected(new Set())}
      />
      <DeleteDialog
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={() => setSelected(new Set())}
      />
      <CleanupDialog
        open={cleanupOpen}
        topics={topics.map((t) => t.topic)}
        initialTopic={topic}
        onClose={() => setCleanupOpen(false)}
      />
    </div>
  );
}

"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookOpen, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useGetProduct, type Product } from "@/lib/api/content-api";

interface ProductCoursesDialogProps {
  product: Product | null;
  onOpenChange: (open: boolean) => void;
}

export function ProductCoursesDialog({
  product,
  onOpenChange,
}: ProductCoursesDialogProps) {
  const { data: detailResp, isLoading, error } = useGetProduct(product?.id ?? null);
  const detailedProduct = detailResp?.data ?? product;
  const courses = detailedProduct?.courses ?? [];

  return (
    <Dialog open={!!product} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl rounded-[2rem] p-0 border-none shadow-2xl bg-white max-h-[85vh] flex flex-col overflow-hidden">
        <div className="p-8 pb-4">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black text-slate-900">
                  {detailedProduct?.name || "Product Courses"}
                </DialogTitle>
                <DialogDescription className="text-slate-500 font-medium text-xs mt-0.5">
                  <code className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded mr-2">
                    {detailedProduct?.code}
                  </code>
                  {courses.length} course{courses.length === 1 ? "" : "s"} enrolled in this track
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-8 pt-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-500 gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
              <p className="text-sm font-medium">Loading courses...</p>
            </div>
          ) : error ? (
            <div className="py-12 flex flex-col items-center justify-center text-red-500 gap-2">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <p className="text-sm font-medium">Failed to load courses for this product</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2 border border-dashed border-slate-200 rounded-2xl">
              <BookOpen className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">No courses in this product yet</p>
              <p className="text-xs text-slate-400">Courses are added by content creators or providers.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="text-xs font-bold">Course Title</TableHead>
                    <TableHead className="text-xs font-bold">Code</TableHead>
                    <TableHead className="text-xs font-bold text-center">Required</TableHead>
                    <TableHead className="text-xs font-bold text-right">Completion Threshold</TableHead>
                    <TableHead className="text-xs font-bold text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses.map((c) => (
                    <TableRow key={c.id} className="hover:bg-slate-50/50">
                      <TableCell className="text-sm font-semibold text-slate-900">
                        {c.title}
                      </TableCell>
                      <TableCell>
                        <code className="rounded bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600">
                          {c.code}
                        </code>
                      </TableCell>
                      <TableCell className="text-center">
                        {c.requiredForCertification ? (
                          <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-none font-bold text-[0.625rem]">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            CERTIFICATE
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-400">Optional</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold text-slate-600">
                        {c.contentConsumptionThreshold ?? 80}%
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[0.625rem] font-bold ${
                            c.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {c.status || "ACTIVE"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 flex justify-end bg-slate-50/50">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-10 rounded-xl px-6 font-bold text-slate-600 hover:bg-slate-100"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

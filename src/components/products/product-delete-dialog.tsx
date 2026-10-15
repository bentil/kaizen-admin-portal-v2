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
import { Trash2, Loader2 } from "lucide-react";
import { useDeleteProduct, type Product } from "@/lib/api/content-api";

interface ProductDeleteDialogProps {
  product: Product | null;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ProductDeleteDialog({
  product,
  onOpenChange,
  onSuccess,
}: ProductDeleteDialogProps) {
  const deleteMutation = useDeleteProduct();

  const handleDelete = () => {
    if (!product) return;
    deleteMutation.mutate(product.id, {
      onSuccess: () => {
        onOpenChange(false);
        onSuccess?.();
      },
    });
  };

  return (
    <Dialog open={!!product} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-[2rem] p-10 border-none shadow-2xl bg-white">
        <DialogHeader>
          <div className="h-16 w-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-6">
            <Trash2 className="h-8 w-8" />
          </div>
          <DialogTitle className="text-3xl font-black text-slate-900">
            Delete Product
          </DialogTitle>
          <DialogDescription className="text-slate-500 font-medium text-base mt-2 leading-relaxed">
            Are you sure you want to delete{" "}
            <span className="text-slate-900 font-bold">{product?.name}</span> (
            <code className="text-xs font-mono">{product?.code}</code>)? This
            action cannot be undone and will detach associated curriculum links.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col sm:flex-row gap-3 mt-10">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="flex-1 h-12 rounded-2xl font-bold bg-slate-50 text-slate-600 hover:bg-slate-100"
          >
            Keep Product
          </Button>
          <Button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="flex-1 h-12 rounded-2xl font-black bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20"
          >
            {deleteMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Confirm Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

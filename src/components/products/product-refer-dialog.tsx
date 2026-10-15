"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CornerUpLeft, Loader2 } from "lucide-react";
import { useReferProduct, type Product } from "@/lib/api/content-api";

interface ProductReferDialogProps {
  product: Product | null;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ProductReferDialog({
  product,
  onOpenChange,
  onSuccess,
}: ProductReferDialogProps) {
  const [feedback, setFeedback] = React.useState("");
  const referMutation = useReferProduct();

  React.useEffect(() => {
    if (product) {
      setFeedback(product.referralFeedback || "");
    }
  }, [product]);

  const handleRefer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    referMutation.mutate(
      {
        productId: product.id,
        data: feedback.trim() ? { referralFeedback: feedback.trim() } : undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setFeedback("");
          onSuccess?.();
        },
      }
    );
  };

  return (
    <Dialog open={!!product} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-[2rem] p-0 border-none shadow-2xl bg-white overflow-hidden">
        <form onSubmit={handleRefer}>
          <div className="p-8 pb-4">
            <DialogHeader>
              <div className="h-14 w-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                <CornerUpLeft className="h-7 w-7" />
              </div>
              <DialogTitle className="text-2xl font-black text-slate-900">
                Refer Product for Revision
              </DialogTitle>
              <DialogDescription className="text-slate-500 font-medium text-sm mt-1 leading-relaxed">
                Send <span className="text-slate-900 font-bold">{product?.name}</span> back
                to the content provider with revision notes.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-8 pt-0 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                Revision Feedback (Optional)
              </Label>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Explain what needs to be updated before approval..."
                className="rounded-xl border-slate-200 resize-none h-28 text-sm"
              />
            </div>
          </div>

          <DialogFooter className="p-8 pt-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-11 rounded-xl px-6 font-bold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={referMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700 h-11 rounded-xl px-8 font-black text-white shadow-lg shadow-amber-500/20"
            >
              {referMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Refer Back
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

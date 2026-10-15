"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { useGetProductCategories } from "@/lib/generated/billing/product-categories/product-categories";
import { useGetServiceCategories } from "@/lib/generated/billing/service-categories/service-categories";
import { useGetServiceSubcategories } from "@/lib/generated/billing/service-subcategories/service-subcategories";
import {
  useCreateProduct,
  useUpdateProduct,
  type Product,
  type ProductStatus,
} from "@/lib/api/content-api";

const productSchema = z.object({
  name: z.string().trim().min(2, "Product name must be at least 2 characters"),
  code: z
    .string()
    .trim()
    .min(2, "Code must be at least 2 characters")
    .transform((v) => v.toUpperCase()),
  description: z.string().optional(),
  productCategoryId: z.string().min(1, "Product category is required"),
  serviceCategoryId: z.string().min(1, "Service category is required"),
  serviceSubcategoryId: z.string().min(1, "Subcategory / level is required"),
  passCriteria: z
    .string()
    .min(1, "Pass criteria is required")
    .refine((val) => {
      const num = Number(val);
      return !isNaN(num) && num >= 0 && num <= 100;
    }, "Pass criteria must be between 0 and 100"),
  isDefault: z.boolean(),
  status: z.enum(["ACTIVE", "INACTIVE", "DRAFT"]),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  defaultProductCategoryId?: number | null;
  onSuccess?: () => void;
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  defaultProductCategoryId,
  onSuccess,
}: ProductFormDialogProps) {
  const isEditing = !!product;

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();

  const { data: productCatsResp, isLoading: isLoadingProductCats } = useGetProductCategories({
    limit: 100,
  });
  const productCategories = (productCatsResp?.data as unknown as Array<{ id: number; code: string; name?: string }> | undefined) ?? [];

  const { data: serviceCatsResp, isLoading: isLoadingServiceCats } = useGetServiceCategories({
    limit: 100,
  });
  const serviceCategories = (serviceCatsResp?.data as unknown as Array<{ id: number; code: string; name?: string }> | undefined) ?? [];

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      productCategoryId: defaultProductCategoryId ? String(defaultProductCategoryId) : "",
      serviceCategoryId: "",
      serviceSubcategoryId: "",
      passCriteria: "60",
      isDefault: false,
      status: "ACTIVE",
    },
  });

  const selectedServiceCategoryId = watch("serviceCategoryId");

  const { data: serviceSubsResp, isLoading: isLoadingServiceSubs } = useGetServiceSubcategories(
    selectedServiceCategoryId ? Number(selectedServiceCategoryId) : 0,
    { limit: 100 },
    { query: { enabled: !!selectedServiceCategoryId && Number(selectedServiceCategoryId) > 0 } }
  );
  const serviceSubcategories = (serviceSubsResp?.data as unknown as Array<{ id: number; code: string; name?: string }> | undefined) ?? [];

  // Reset or initialize form when opened or product changes
  React.useEffect(() => {
    if (open) {
      if (product) {
        const servCatId = product.serviceSubcategory?.serviceCategoryId
          ? String(product.serviceSubcategory.serviceCategoryId)
          : "";
        reset({
          name: product.name || "",
          code: product.code || "",
          description: product.description || "",
          productCategoryId: String(product.productCategoryId || ""),
          serviceCategoryId: servCatId,
          serviceSubcategoryId: String(product.serviceSubcategoryId || ""),
          passCriteria: String(product.passCriteria ?? 60),
          isDefault: !!product.isDefault,
          status: product.status || "ACTIVE",
        });
      } else {
        reset({
          name: "",
          code: "",
          description: "",
          productCategoryId: defaultProductCategoryId ? String(defaultProductCategoryId) : "",
          serviceCategoryId: "",
          serviceSubcategoryId: "",
          passCriteria: "60",
          isDefault: false,
          status: "ACTIVE",
        });
      }
    }
  }, [open, product, defaultProductCategoryId, reset]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: ProductFormValues) => {
    if (isEditing && product) {
      updateMutation.mutate(
        {
          productId: product.id,
          data: {
            name: values.name,
            description: values.description || undefined,
            productCategoryId: Number(values.productCategoryId),
            serviceSubcategoryId: Number(values.serviceSubcategoryId),
            passCriteria: Number(values.passCriteria),
            isDefault: values.isDefault,
            status: values.status as ProductStatus,
          },
        },
        {
          onSuccess: () => {
            onOpenChange(false);
            onSuccess?.();
          },
        }
      );
    } else {
      createMutation.mutate(
        {
          code: values.code,
          name: values.name,
          description: values.description || undefined,
          productCategoryId: Number(values.productCategoryId),
          serviceSubcategoryId: Number(values.serviceSubcategoryId),
          passCriteria: Number(values.passCriteria),
          isDefault: values.isDefault,
          status: values.status as ProductStatus,
        },
        {
          onSuccess: () => {
            onOpenChange(false);
            onSuccess?.();
          },
        }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl rounded-[2rem] p-0 border-none shadow-2xl overflow-hidden bg-white max-h-[90vh] flex flex-col">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-8 pb-4">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-slate-900">
                {isEditing ? "Edit Product" : "New Learning Product"}
              </DialogTitle>
              <DialogDescription className="text-slate-500 font-medium text-sm mt-1">
                {isEditing
                  ? `Update configuration and metadata for ${product?.code}`
                  : "Create a learning product bundling courses for learners under a subject and level."}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-8 pt-0 space-y-4 overflow-y-auto flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Product Name *</Label>
                <Input
                  {...register("name")}
                  placeholder="e.g. BECE Mathematics Core"
                  className="h-10 rounded-xl border-slate-200"
                />
                {errors.name && <p className="text-xs font-bold text-red-500">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Product Code *</Label>
                <Input
                  {...register("code")}
                  placeholder="e.g. PROD-BECE-MATH"
                  disabled={isEditing}
                  className="h-10 rounded-xl border-slate-200 font-mono uppercase bg-slate-50 disabled:opacity-75"
                />
                {errors.code && <p className="text-xs font-bold text-red-500">{errors.code.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Subject Category *</Label>
              <Controller
                control={control}
                name="productCategoryId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-10 rounded-xl border-slate-200">
                      <SelectValue placeholder={isLoadingProductCats ? "Loading categories..." : "Select subject category"} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {productCategories.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name ? `${c.name} (${c.code})` : c.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.productCategoryId && (
                <p className="text-xs font-bold text-red-500">{errors.productCategoryId.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Service Category (Area) *</Label>
                <Controller
                  control={control}
                  name="serviceCategoryId"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(val) => {
                        field.onChange(val);
                        setValue("serviceSubcategoryId", "");
                      }}
                    >
                      <SelectTrigger className="h-10 rounded-xl border-slate-200">
                        <SelectValue placeholder={isLoadingServiceCats ? "Loading..." : "Select area"} />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {serviceCategories.map((sc) => (
                          <SelectItem key={sc.id} value={String(sc.id)}>
                            {sc.name ? `${sc.name} (${sc.code})` : sc.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.serviceCategoryId && (
                  <p className="text-xs font-bold text-red-500">{errors.serviceCategoryId.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Subcategory / Examination *</Label>
                <Controller
                  control={control}
                  name="serviceSubcategoryId"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!selectedServiceCategoryId}
                    >
                      <SelectTrigger className="h-10 rounded-xl border-slate-200">
                        <SelectValue
                          placeholder={
                            !selectedServiceCategoryId
                              ? "Pick area first"
                              : isLoadingServiceSubs
                              ? "Loading levels..."
                              : "Select subcategory"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {serviceSubcategories.map((sub) => (
                          <SelectItem key={sub.id} value={String(sub.id)}>
                            {sub.name ? `${sub.name} (${sub.code})` : sub.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.serviceSubcategoryId && (
                  <p className="text-xs font-bold text-red-500">{errors.serviceSubcategoryId.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Pass Criteria (%) *</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  {...register("passCriteria")}
                  placeholder="60"
                  className="h-10 rounded-xl border-slate-200"
                />
                {errors.passCriteria && (
                  <p className="text-xs font-bold text-red-500">{errors.passCriteria.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Status</Label>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-10 rounded-xl border-slate-200">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                        <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                        <SelectItem value="DRAFT">DRAFT</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Description</Label>
              <Textarea
                {...register("description")}
                placeholder="Brief description of the product or syllabus coverage..."
                className="rounded-xl border-slate-200 resize-none h-20"
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Controller
                control={control}
                name="isDefault"
                render={({ field }) => (
                  <Checkbox
                    id="isDefault"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="rounded-md"
                  />
                )}
              />
              <label
                htmlFor="isDefault"
                className="text-xs font-semibold text-slate-700 cursor-pointer select-none"
              >
                Set as default product for this subject category
              </label>
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
              className="bg-[#8B5CF6] hover:bg-[#7C3AED] h-11 rounded-xl px-8 font-black text-white shadow-lg shadow-violet-500/20"
              disabled={isPending}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {isEditing ? "Save Changes" : "Create Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

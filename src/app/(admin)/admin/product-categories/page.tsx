"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useGetProductCategories,
  useAddProductCategory,
  useUpdateProductCategory,
  useDeleteProductCategory,
  getGetProductCategoriesQueryKey,
} from "@/lib/generated/billing/product-categories/product-categories";
import type { ProductCategory, CreateProductCategoryDto, UpdateProductCategoryDto } from "@/lib/generated/billing/models";
import { ProductCategoryOrderBy } from "@/lib/generated/billing/models";
import { useGetServiceCategories } from "@/lib/generated/billing/service-categories/service-categories";
import { useGetServiceSubcategories } from "@/lib/generated/billing/service-subcategories/service-subcategories";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { FileText, Search, Loader2, Plus, Pencil, Trash2, AlertCircle, ChevronUp, ChevronDown, ChevronsUpDown, ChevronRight, Package, MoreHorizontal, Check, CornerUpLeft, Star } from "lucide-react";
import { PaginationController } from "@/components/ui/pagination-controller";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryClient } from "@/lib/react-query-provider";
import { extractErrorMessage } from "@/lib/api-error";
import {
  useGetProductsByCategory,
  useApproveProduct,
  useReferProduct,
  useSetDefaultProduct,
  type ProductReviewStatus,
} from "@/lib/api/content-api";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const categorySchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  code: z
    .string()
    .trim()
    .min(2, "Code must be at least 2 characters")
    .transform((value) => value.toUpperCase()),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

type SortField = "name" | "code" | "createdAt";

function SortableHead({
  label,
  field,
  activeField,
  direction,
  onSort,
  className,
}: {
  label: string;
  field: SortField;
  activeField: SortField;
  direction: "asc" | "desc";
  onSort: (field: SortField) => void;
  className?: string;
}) {
  const isActive = activeField === field;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-1 font-bold hover:text-violet-600 transition-colors"
      >
        {label}
        {isActive ? (
          direction === "asc" ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 text-slate-300" />
        )}
      </button>
    </TableHead>
  );
}

const PRODUCT_REVIEW_STYLES: Record<string, string> = {
  APPROVED: "bg-emerald-50 text-emerald-700",
  SUBMITTED: "bg-blue-50 text-blue-700",
  REFERRED: "bg-red-50 text-red-700",
  DRAFT: "bg-slate-100 text-slate-600",
};

const REVIEW_STATUS_OPTIONS: ProductReviewStatus[] = ["DRAFT", "SUBMITTED", "REFERRED", "APPROVED"];

function CategoryProductsRow({ categoryId }: { categoryId: number }) {
  const [page, setPage] = React.useState(1);
  const [serviceCategoryFilter, setServiceCategoryFilter] = React.useState<string>("all");
  const [subcategoryFilter, setSubcategoryFilter] = React.useState<string>("all");
  const [reviewFilter, setReviewFilter] = React.useState<string>("all");

  React.useEffect(() => {
    setPage(1);
  }, [serviceCategoryFilter, subcategoryFilter, reviewFilter]);

  const queryParams = {
    page,
    ...(subcategoryFilter !== "all" ? { serviceSubcategoryId: Number(subcategoryFilter) } : {}),
    ...(reviewFilter !== "all" ? { reviewStatus: reviewFilter as ProductReviewStatus } : {}),
  };
  const { data, isLoading, error, refetch } = useGetProductsByCategory(categoryId, queryParams);
  const products = data?.data ?? [];
  const productsPageSize = data?.pageSize ?? products.length;
  const productsTotalCount = data?.totalCount ?? products.length;
  const productsTotalPages = productsPageSize > 0
    ? Math.ceil(productsTotalCount / productsPageSize)
    : 1;

  const { data: serviceCatsResp } = useGetServiceCategories({ limit: 100 });
  const serviceCategoryOptions = (
    (serviceCatsResp?.data as unknown as Array<{ id: number; code: string; name?: string }> | undefined) ?? []
  );

  const selectedServiceCategoryId =
    serviceCategoryFilter !== "all" ? Number(serviceCategoryFilter) : 0;
  const { data: serviceSubsResp } = useGetServiceSubcategories(
    selectedServiceCategoryId,
    { limit: 100 },
    { query: { enabled: selectedServiceCategoryId > 0 } },
  );
  const subcategoryOptions = (
    (serviceSubsResp?.data as unknown as Array<{ id: number; code: string; name?: string }> | undefined) ?? []
  );

  const approveProduct = useApproveProduct();
  const referProduct = useReferProduct();
  const setDefaultProduct = useSetDefaultProduct();

  const actingId =
    [approveProduct, referProduct, setDefaultProduct].find((m) => m.isPending)?.variables ?? null;

  return (
    <TableRow className="bg-slate-50/40 hover:bg-slate-50/40">
      <TableCell colSpan={4} className="p-0">
        <div className="px-6 py-4">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs font-bold uppercase text-slate-500">Service Category</Label>
              <Select
                value={serviceCategoryFilter}
                onValueChange={(v) => {
                  setServiceCategoryFilter(v);
                  setSubcategoryFilter("all");
                }}
              >
                <SelectTrigger className="h-9 w-44 rounded-lg border-slate-200 bg-white text-xs">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All</SelectItem>
                  {serviceCategoryOptions.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs font-bold uppercase text-slate-500">Subcategory</Label>
              <Select
                value={subcategoryFilter}
                onValueChange={setSubcategoryFilter}
                disabled={serviceCategoryFilter === "all"}
              >
                <SelectTrigger className="h-9 w-44 rounded-lg border-slate-200 bg-white text-xs">
                  <SelectValue placeholder={serviceCategoryFilter === "all" ? "Pick service category" : "All"} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All</SelectItem>
                  {subcategoryOptions.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs font-bold uppercase text-slate-500">Review Status</Label>
              <Select value={reviewFilter} onValueChange={setReviewFilter}>
                <SelectTrigger className="h-9 w-40 rounded-lg border-slate-200 bg-white text-xs">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All</SelectItem>
                  {REVIEW_STATUS_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(serviceCategoryFilter !== "all" || subcategoryFilter !== "all" || reviewFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-xs text-slate-500 hover:text-slate-900"
                onClick={() => {
                  setServiceCategoryFilter("all");
                  setSubcategoryFilter("all");
                  setReviewFilter("all");
                }}
              >
                Clear filters
              </Button>
            )}
            {serviceCategoryFilter !== "all" && subcategoryFilter === "all" && (
              // The products endpoint only filters by serviceSubcategoryId, so the
              // service category alone narrows nothing — say so instead of leaving
              // an unfiltered list looking filtered.
              <span className="text-xs font-medium text-amber-600">
                Pick a subcategory to filter — service category alone shows all products.
              </span>
            )}
          </div>
          {isLoading ? (
            <div className="flex items-center gap-2 text-slate-500 text-sm py-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading products...
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-sm text-red-500 py-4">
              <AlertCircle className="h-4 w-4" /> Failed to load products
              <Button variant="link" className="h-auto p-0 text-sm" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          ) : products.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
              <Package className="h-4 w-4" /> No products in this category
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="text-xs font-bold">Product</TableHead>
                    <TableHead className="text-xs font-bold">Code</TableHead>
                    <TableHead className="text-xs font-bold">Subcategory</TableHead>
                    <TableHead className="text-xs font-bold">Review</TableHead>
                    <TableHead className="text-xs font-bold text-right">Pass criteria</TableHead>
                    <TableHead className="text-xs font-bold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => (
                    <TableRow key={p.id} className="hover:bg-slate-50/50">
                      <TableCell className="text-sm font-semibold text-slate-900">
                        {p.name}
                        {p.isDefault && (
                          <span className="ml-2 rounded bg-violet-50 px-1.5 py-0.5 text-[0.625rem] font-bold text-violet-600">
                            DEFAULT
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <code className="rounded bg-slate-100 px-2 py-1 font-mono text-xs uppercase text-slate-600">
                          {p.code}
                        </code>
                      </TableCell>
                      <TableCell>
                        {p.serviceSubcategory?.code ? (
                          <code className="rounded bg-slate-100 px-2 py-1 font-mono text-xs uppercase text-slate-600">
                            {p.serviceSubcategory.code}
                          </code>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`rounded-full px-2 py-0.5 text-[0.625rem] font-bold ${PRODUCT_REVIEW_STYLES[p.reviewStatus] ?? "bg-slate-100 text-slate-600"}`}>
                          {p.reviewStatus}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm text-slate-500">{p.passCriteria}%</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              disabled={actingId === p.id}
                            >
                              {actingId === p.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem
                              disabled={p.reviewStatus === "APPROVED"}
                              onClick={() => approveProduct.mutate(p.id)}
                            >
                              <Check className="mr-2 h-4 w-4 text-emerald-600" />
                              Approve product
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={p.reviewStatus === "DRAFT" || p.reviewStatus === "REFERRED"}
                              onClick={() => referProduct.mutate(p.id)}
                            >
                              <CornerUpLeft className="mr-2 h-4 w-4 text-amber-600" />
                              Refer back for changes
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              disabled={p.isDefault}
                              onClick={() => setDefaultProduct.mutate(p.id)}
                            >
                              <Star className="mr-2 h-4 w-4 text-violet-600" />
                              Set as default
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {!isLoading && !error && productsTotalPages > 1 && (
            <div className="mt-4">
              <PaginationController
                currentPage={page}
                totalPages={productsTotalPages}
                totalCount={productsTotalCount}
                limit={productsPageSize}
                onPageChange={setPage}
                itemName="products"
              />
            </div>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function ProductCategoriesPage() {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const limit = 20;
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<ProductCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = React.useState<ProductCategory | null>(null);
  const [sortField, setSortField] = React.useState<SortField>("createdAt");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");
  const [expandedId, setExpandedId] = React.useState<number | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  React.useEffect(() => {
    setCurrentPage(1);
    setExpandedId(null);
  }, [debouncedSearch, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", code: "" },
  });

  const { data: categoriesResp, isLoading, error, refetch } = useGetProductCategories({
    q: debouncedSearch || undefined,
    page: currentPage,
    limit,
    orderBy: `${sortField}:${sortDir}` as ProductCategoryOrderBy,
  });

  const categories = Array.isArray(categoriesResp?.data) ? categoriesResp.data : [];

  const createMutation = useAddProductCategory({
    mutation: {
      onSuccess: () => {
        toast.success("Product category created");
        queryClient.invalidateQueries({ queryKey: getGetProductCategoriesQueryKey() });
        setIsCreateOpen(false);
        reset();
      },
      onError: (err) => toast.error(extractErrorMessage(err, "Failed to create category")),
    },
  });

  const updateMutation = useUpdateProductCategory({
    mutation: {
      onSuccess: () => {
        toast.success("Product category updated");
        queryClient.invalidateQueries({ queryKey: getGetProductCategoriesQueryKey() });
        setEditingCategory(null);
        reset();
      },
      onError: (err) => toast.error(extractErrorMessage(err, "Failed to update category")),
    },
  });

  const deleteMutation = useDeleteProductCategory({
    mutation: {
      onSuccess: () => {
        toast.success("Product category deleted");
        queryClient.invalidateQueries({ queryKey: getGetProductCategoriesQueryKey() });
        setDeletingCategory(null);
      },
      onError: (err) => toast.error(extractErrorMessage(err, "Failed to delete category")),
    },
  });

  const onSubmit = (data: CategoryFormValues) => {
    if (editingCategory) {
      const updateData: UpdateProductCategoryDto = {
        name: data.name,
        code: data.code,
      };
      updateMutation.mutate({ id: editingCategory.id, data: updateData });
    } else {
      const createData: CreateProductCategoryDto = {
        name: data.name,
        code: data.code,
      };
      createMutation.mutate({ data: createData });
    }
  };

  const openEdit = (cat: ProductCategory) => {
    setEditingCategory(cat);
    reset({ name: cat.name, code: cat.code });
  };

  const pagination = categoriesResp?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Product Categories</h1>
          <p className="text-slate-500 text-lg">Product categories map subjects to examination type</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (open) reset(); }}>
          <DialogTrigger asChild>
            <Button className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white shadow-lg shadow-violet-500/20 h-11 px-6 rounded-xl font-black text-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
              <Plus className="mr-2 h-4 w-4 stroke-[3px]" />
              Create Category
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl rounded-[2rem] p-0 border-none shadow-2xl overflow-hidden bg-white">
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="p-10 pb-0">
                <DialogHeader>
                  <DialogTitle className="text-3xl font-black text-slate-900">
                    New product category
                  </DialogTitle>
                  <DialogDescription className="text-slate-500 font-medium text-base mt-2">
                    Create a template for organizations to build packages from.
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="p-10 space-y-6">
                <div className="space-y-2">
                  <Label className="font-bold text-slate-800">Category name</Label>
                  <Input {...register("name")} placeholder="Eg: Starter Package" className="h-12 rounded-xl border-slate-200" />
                  {errors.name && <p className="text-sm font-bold text-red-500">{errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-slate-800">System code</Label>
                  <Input {...register("code")} placeholder="Eg: STARTER" className="h-12 rounded-xl border-slate-200 bg-slate-50 font-mono uppercase" />
                  {errors.code && <p className="text-sm font-bold text-red-500">{errors.code.message}</p>}
                </div>
              </div>

              <DialogFooter className="p-10 pt-0 flex items-center justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="h-12 rounded-2xl px-8 font-bold bg-slate-50 text-slate-600">Cancel</Button>
                <Button type="submit" className="bg-[#8B5CF6] hover:bg-[#7C3AED] h-12 rounded-2xl px-10 font-black text-white shadow-lg shadow-violet-500/20" disabled={createMutation.isPending}>
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Category
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative w-full md:w-80">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search categories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-11 rounded-xl border-slate-200"
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
          <p className="text-slate-500 font-medium">Loading categories...</p>
        </div>
      ) : error ? (
        <div className="text-center py-20 text-red-500 font-medium bg-red-50 rounded-2xl border border-red-100">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          Failed to load categories
          <Button variant="link" onClick={() => refetch()} className="block mx-auto mt-2">Try again</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <Card className="border-slate-200 shadow-sm overflow-hidden rounded-2xl">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <SortableHead label="Name" field="name" activeField={sortField} direction={sortDir} onSort={toggleSort} />
                  <SortableHead label="Code" field="code" activeField={sortField} direction={sortDir} onSort={toggleSort} />
                  <SortableHead label="Created" field="createdAt" activeField={sortField} direction={sortDir} onSort={toggleSort} className="hidden md:table-cell" />
                  <TableHead className="text-right font-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-20 text-slate-500">
                      <FileText className="h-10 w-10 mx-auto mb-3 text-slate-200" />
                      No product categories found
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((cat) => (
                    <React.Fragment key={cat.id}>
                      <TableRow className="hover:bg-slate-50/50 transition-colors group">
                        <TableCell className="font-semibold text-slate-900">
                          <button
                            type="button"
                            onClick={() => setExpandedId(expandedId === cat.id ? null : cat.id)}
                            className="inline-flex items-center gap-2 hover:text-violet-600 transition-colors"
                            aria-expanded={expandedId === cat.id}
                          >
                            <ChevronRight
                              className={`h-4 w-4 text-slate-400 transition-transform ${expandedId === cat.id ? "rotate-90" : ""}`}
                            />
                            {cat.name}
                          </button>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded tracking-wider uppercase">
                            {cat.code}
                          </code>
                        </TableCell>
                        <TableCell className="text-sm text-slate-500 hidden md:table-cell">
                          {new Date(cat.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-violet-50 hover:text-violet-600" onClick={() => openEdit(cat)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => setDeletingCategory(cat)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedId === cat.id && <CategoryProductsRow categoryId={cat.id} />}
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          {pagination && pagination.totalPages > 1 && (
            <PaginationController
              currentPage={currentPage}
              totalPages={pagination.totalPages}
              totalCount={pagination.totalCount}
              limit={limit}
              onPageChange={setCurrentPage}
              itemName="categories"
            />
          )}
        </div>
      )}

      <Dialog open={!!editingCategory} onOpenChange={(open) => { if (!open) setEditingCategory(null); }}>
        <DialogContent className="sm:max-w-xl rounded-[2rem] p-0 border-none shadow-2xl overflow-hidden bg-white">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="p-10 pb-0">
              <DialogHeader>
                <DialogTitle className="text-3xl font-black text-slate-900">
                  Edit category
                </DialogTitle>
                <DialogDescription className="text-slate-500 font-medium text-base mt-2">
                  Updating information for <span className="text-violet-600 font-bold">{editingCategory?.name}</span>
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="p-10 space-y-6">
              <div className="space-y-2">
                <Label className="font-bold text-slate-800">Category name</Label>
                <Input {...register("name")} className="h-12 rounded-xl border-slate-200" />
                {errors.name && <p className="text-sm font-bold text-red-500">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-slate-800">System code</Label>
                <Input {...register("code")} disabled className="h-12 rounded-xl border-slate-200 bg-slate-50 font-mono" />
              </div>
            </div>

            <DialogFooter className="p-10 pt-0 flex items-center justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setEditingCategory(null)} className="h-12 rounded-2xl px-8 font-bold bg-slate-50 text-slate-600">Cancel</Button>
              <Button type="submit" className="bg-[#8B5CF6] hover:bg-[#7C3AED] h-12 rounded-2xl px-10 font-black text-white shadow-lg shadow-violet-500/20" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingCategory} onOpenChange={(open) => { if (!open) setDeletingCategory(null); }}>
        <DialogContent className="sm:max-w-[480px] rounded-[2rem] p-10 border-none shadow-2xl bg-white">
          <DialogHeader>
            <div className="h-16 w-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-6">
              <Trash2 className="h-8 w-8" />
            </div>
            <DialogTitle className="text-3xl font-black text-slate-900">
              Delete category
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium text-lg mt-2 leading-relaxed">
              Are you sure you want to delete <span className="text-slate-900 font-bold">{deletingCategory?.name}</span>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row gap-3 mt-10">
            <Button variant="ghost" onClick={() => setDeletingCategory(null)} className="flex-1 h-12 rounded-2xl font-bold bg-slate-50 text-slate-600">Keep category</Button>
            <Button
              onClick={() => deletingCategory && deleteMutation.mutate({ id: deletingCategory.id })}
              disabled={deleteMutation.isPending}
              className="flex-1 h-12 rounded-2xl font-black bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20" 
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Confirm Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

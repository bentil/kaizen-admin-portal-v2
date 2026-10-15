"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Search,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  Package,
  MoreHorizontal,
  Check,
  CornerUpLeft,
  Star,
  BookOpen,
} from "lucide-react";
import { PaginationController } from "@/components/ui/pagination-controller";
import {
  useGetProducts,
  useApproveProduct,
  useSetDefaultProduct,
  type Product,
  type ProductReviewStatus,
  type ProductStatus,
} from "@/lib/api/content-api";
import { useGetProductCategories } from "@/lib/generated/billing/product-categories/product-categories";
import { useGetServiceCategories } from "@/lib/generated/billing/service-categories/service-categories";
import { useGetServiceSubcategories } from "@/lib/generated/billing/service-subcategories/service-subcategories";
import { ProductFormDialog } from "@/components/products/product-form-dialog";
import { ProductDeleteDialog } from "@/components/products/product-delete-dialog";
import { ProductReferDialog } from "@/components/products/product-refer-dialog";
import { ProductCoursesDialog } from "@/components/products/product-courses-dialog";

const REVIEW_BADGES: Record<ProductReviewStatus, { label: string; className: string }> = {
  APPROVED: { label: "Approved", className: "bg-emerald-50 text-emerald-700" },
  SUBMITTED: { label: "Submitted", className: "bg-blue-50 text-blue-700 font-bold" },
  REFERRED: { label: "Referred", className: "bg-red-50 text-red-700" },
  DRAFT: { label: "Draft", className: "bg-slate-100 text-slate-600" },
};

export default function ProductsPage() {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const limit = 20;

  // Filters
  const [reviewTab, setReviewTab] = React.useState<string>("ALL");
  const [productCategoryFilter, setProductCategoryFilter] = React.useState<string>("all");
  const [serviceCategoryFilter, setServiceCategoryFilter] = React.useState<string>("all");
  const [subcategoryFilter, setSubcategoryFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = React.useState<Product | null>(null);
  const [referringProduct, setReferringProduct] = React.useState<Product | null>(null);
  const [viewingCoursesProduct, setViewingCoursesProduct] = React.useState<Product | null>(null);

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, reviewTab, productCategoryFilter, subcategoryFilter, statusFilter]);

  // Categories metadata
  const { data: productCatsResp } = useGetProductCategories({ limit: 100 });
  const productCategories = (productCatsResp?.data as unknown as Array<{ id: number; code: string; name?: string }> | undefined) ?? [];

  const { data: serviceCatsResp } = useGetServiceCategories({ limit: 100 });
  const serviceCategories = (serviceCatsResp?.data as unknown as Array<{ id: number; code: string; name?: string }> | undefined) ?? [];

  const selectedServiceCatId = serviceCategoryFilter !== "all" ? Number(serviceCategoryFilter) : 0;
  const { data: serviceSubsResp } = useGetServiceSubcategories(
    selectedServiceCatId,
    { limit: 100 },
    { query: { enabled: selectedServiceCatId > 0 } }
  );
  const serviceSubcategories = (serviceSubsResp?.data as unknown as Array<{ id: number; code: string; name?: string }> | undefined) ?? [];

  // Query products
  const queryParams = {
    page: currentPage,
    limit,
    ...(reviewTab !== "ALL" ? { reviewStatus: reviewTab as ProductReviewStatus } : {}),
    ...(productCategoryFilter !== "all" ? { productCategoryId: Number(productCategoryFilter) } : {}),
    ...(subcategoryFilter !== "all" ? { serviceSubcategoryId: Number(subcategoryFilter) } : {}),
    ...(statusFilter !== "all" ? { status: statusFilter as ProductStatus } : {}),
  };

  const { data: productsResp, isLoading, error, refetch } = useGetProducts(queryParams);

  const approveMutation = useApproveProduct();
  const setDefaultMutation = useSetDefaultProduct();

  const rawProducts = productsResp?.data;

  // Client-side search filtering on name/code if search query provided
  const products = React.useMemo(() => {
    const list = rawProducts ?? [];
    if (!debouncedSearch.trim()) return list;
    const query = debouncedSearch.toLowerCase().trim();
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.code.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query))
    );
  }, [rawProducts, debouncedSearch]);

  const totalCount = productsResp?.totalCount ?? products.length;
  const pageSize = productsResp?.pageSize ?? limit;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const hasActiveFilters =
    reviewTab !== "ALL" ||
    productCategoryFilter !== "all" ||
    serviceCategoryFilter !== "all" ||
    subcategoryFilter !== "all" ||
    statusFilter !== "all" ||
    searchTerm.trim().length > 0;

  const clearFilters = () => {
    setReviewTab("ALL");
    setProductCategoryFilter("all");
    setServiceCategoryFilter("all");
    setSubcategoryFilter("all");
    setStatusFilter("all");
    setSearchTerm("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Products</h1>
          <p className="text-slate-500 text-lg">
            Manage learning tracks, subject packages, courses, and review workflows
          </p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white shadow-lg shadow-violet-500/20 h-11 px-6 rounded-xl font-black text-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="mr-2 h-4 w-4 stroke-[3px]" />
          Create Product
        </Button>
      </div>

      {/* Tabs for Review Status */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <Tabs value={reviewTab} onValueChange={setReviewTab} className="w-full">
          <TabsList className="bg-slate-100 p-1 rounded-xl">
            <TabsTrigger value="ALL" className="rounded-lg text-xs font-bold px-4">
              All Products
            </TabsTrigger>
            <TabsTrigger value="SUBMITTED" className="rounded-lg text-xs font-bold px-4 text-blue-700">
              Submitted (Review Queue)
            </TabsTrigger>
            <TabsTrigger value="APPROVED" className="rounded-lg text-xs font-bold px-4 text-emerald-700">
              Approved
            </TabsTrigger>
            <TabsTrigger value="REFERRED" className="rounded-lg text-xs font-bold px-4 text-amber-700">
              Referred
            </TabsTrigger>
            <TabsTrigger value="DRAFT" className="rounded-lg text-xs font-bold px-4 text-slate-600">
              Drafts
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by product name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 rounded-xl border-slate-200"
          />
        </div>

        {/* Product Category Filter */}
        <Select value={productCategoryFilter} onValueChange={setProductCategoryFilter}>
          <SelectTrigger className="h-10 w-48 rounded-xl border-slate-200 bg-white text-xs">
            <SelectValue placeholder="All Subjects" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All Subjects</SelectItem>
            {productCategories.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name ? `${c.name} (${c.code})` : c.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Service Category (Area) Filter */}
        <Select
          value={serviceCategoryFilter}
          onValueChange={(val) => {
            setServiceCategoryFilter(val);
            setSubcategoryFilter("all");
          }}
        >
          <SelectTrigger className="h-10 w-44 rounded-xl border-slate-200 bg-white text-xs">
            <SelectValue placeholder="All Areas" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All Areas</SelectItem>
            {serviceCategories.map((sc) => (
              <SelectItem key={sc.id} value={String(sc.id)}>
                {sc.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Subcategory (Level) Filter */}
        <Select
          value={subcategoryFilter}
          onValueChange={setSubcategoryFilter}
          disabled={serviceCategoryFilter === "all"}
        >
          <SelectTrigger className="h-10 w-44 rounded-xl border-slate-200 bg-white text-xs">
            <SelectValue
              placeholder={serviceCategoryFilter === "all" ? "Pick area first" : "All Levels"}
            />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All Levels</SelectItem>
            {serviceSubcategories.map((sub) => (
              <SelectItem key={sub.id} value={String(sub.id)}>
                {sub.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-10 w-36 rounded-xl border-slate-200 bg-white text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="ACTIVE">ACTIVE</SelectItem>
            <SelectItem value="INACTIVE">INACTIVE</SelectItem>
            <SelectItem value="DRAFT">DRAFT</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-10 text-xs text-slate-500 hover:text-slate-900 rounded-xl"
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Table Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
          <p className="text-slate-500 font-medium">Loading products...</p>
        </div>
      ) : error ? (
        <div className="text-center py-20 text-red-500 font-medium bg-red-50 rounded-2xl border border-red-100">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          Failed to load products
          <Button variant="link" onClick={() => refetch()} className="block mx-auto mt-2">
            Try again
          </Button>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-slate-200">
          <Package className="h-12 w-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-lg font-bold text-slate-800">No products found</h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto mt-1 mb-6">
            {hasActiveFilters
              ? "Try adjusting or clearing your filters to see more products."
              : "Create your first learning product to start bundling courses for learners."}
          </p>
          {hasActiveFilters ? (
            <Button variant="outline" onClick={clearFilters} className="rounded-xl">
              Clear filters
            </Button>
          ) : (
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-xl shadow-lg shadow-violet-500/20"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Product
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <Card className="border-slate-200 shadow-sm overflow-hidden rounded-2xl">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="text-xs font-bold">Product</TableHead>
                  <TableHead className="text-xs font-bold">Code</TableHead>
                  <TableHead className="text-xs font-bold">Subject Category</TableHead>
                  <TableHead className="text-xs font-bold">Level / Exam</TableHead>
                  <TableHead className="text-xs font-bold text-center">Courses</TableHead>
                  <TableHead className="text-xs font-bold text-right">Pass Criteria</TableHead>
                  <TableHead className="text-xs font-bold">Review Status</TableHead>
                  <TableHead className="text-xs font-bold">Status</TableHead>
                  <TableHead className="text-xs font-bold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => {
                  const reviewBadge = REVIEW_BADGES[p.reviewStatus] ?? {
                    label: p.reviewStatus,
                    className: "bg-slate-100 text-slate-600",
                  };
                  const count = p.courseCount ?? p.courses?.length ?? 0;

                  return (
                    <TableRow key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="text-sm font-semibold text-slate-900 max-w-[240px]">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate">{p.name}</span>
                            {p.isDefault && (
                              <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[0.625rem] font-bold text-violet-600 border border-violet-100">
                                DEFAULT
                              </span>
                            )}
                          </div>
                          {p.description && (
                            <span className="text-xs text-slate-400 font-normal line-clamp-1 mt-0.5">
                              {p.description}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <code className="rounded bg-slate-100 px-2 py-1 font-mono text-xs uppercase text-slate-600">
                          {p.code}
                        </code>
                      </TableCell>

                      <TableCell className="text-xs font-semibold text-slate-700">
                        {p.productCategory?.name || p.productCategory?.code || `ID: ${p.productCategoryId}`}
                      </TableCell>

                      <TableCell className="text-xs">
                        {p.serviceSubcategory?.code ? (
                          <code className="rounded bg-slate-100 px-2 py-1 font-mono text-xs uppercase text-slate-600">
                            {p.serviceSubcategory.code}
                          </code>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewingCoursesProduct(p)}
                          className="h-7 px-2 text-xs font-bold text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded-lg inline-flex items-center gap-1"
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          <span>{count}</span>
                        </Button>
                      </TableCell>

                      <TableCell className="text-right text-sm font-semibold text-slate-700">
                        {p.passCriteria}%
                      </TableCell>

                      <TableCell>
                        <span className={`rounded-full px-2.5 py-0.5 text-[0.6875rem] font-bold ${reviewBadge.className}`}>
                          {reviewBadge.label}
                        </span>
                      </TableCell>

                      <TableCell>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[0.625rem] font-bold ${
                            p.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {p.status}
                        </span>
                      </TableCell>

                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52 rounded-xl">
                            <DropdownMenuItem onClick={() => setViewingCoursesProduct(p)}>
                              <BookOpen className="mr-2 h-4 w-4 text-violet-600" />
                              View Courses ({count})
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditingProduct(p)}>
                              <Pencil className="mr-2 h-4 w-4 text-slate-600" />
                              Edit Product
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              disabled={p.reviewStatus !== "SUBMITTED" || approveMutation.isPending}
                              onClick={() => approveMutation.mutate(p.id)}
                            >
                              <Check className="mr-2 h-4 w-4 text-emerald-600" />
                              Approve Product
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              disabled={p.reviewStatus !== "SUBMITTED"}
                              onClick={() => setReferringProduct(p)}
                            >
                              <CornerUpLeft className="mr-2 h-4 w-4 text-amber-600" />
                              Refer Back for Changes
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              disabled={p.isDefault || setDefaultMutation.isPending}
                              onClick={() => setDefaultMutation.mutate(p.id)}
                            >
                              <Star className="mr-2 h-4 w-4 text-violet-600" />
                              Set as Default
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600 focus:bg-red-50"
                              onClick={() => setDeletingProduct(p)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Product
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          {totalPages > 1 && (
            <div className="mt-4">
              <PaginationController
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={totalCount}
                limit={pageSize}
                onPageChange={setCurrentPage}
                itemName="products"
              />
            </div>
          )}
        </div>
      )}

      {/* Product Form Dialog (Create & Edit) */}
      <ProductFormDialog
        open={isCreateOpen || !!editingProduct}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingProduct(null);
          }
        }}
        product={editingProduct}
        onSuccess={() => refetch()}
      />

      {/* Delete Confirmation Dialog */}
      <ProductDeleteDialog
        product={deletingProduct}
        onOpenChange={(open) => {
          if (!open) setDeletingProduct(null);
        }}
        onSuccess={() => refetch()}
      />

      {/* Refer Product Dialog */}
      <ProductReferDialog
        product={referringProduct}
        onOpenChange={(open) => {
          if (!open) setReferringProduct(null);
        }}
        onSuccess={() => refetch()}
      />

      {/* Courses Drawer / Dialog */}
      <ProductCoursesDialog
        product={viewingCoursesProduct}
        onOpenChange={(open) => {
          if (!open) setViewingCoursesProduct(null);
        }}
      />
    </div>
  );
}

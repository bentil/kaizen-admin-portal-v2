"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import {
  useGetDiscounts,
  useSearchDiscounts,
  useAddDiscount,
  useUpdateDiscount,
  useDeleteDiscount,
  getGetDiscountsQueryKey,
  getSearchDiscountsQueryKey,
} from "@/lib/generated/billing/discounts/discounts";
import { useGetOrganizations } from "@/lib/generated/org/organizations/organizations";
import { useGetOrganizationTypes } from "@/lib/generated/org/organization-types/organization-types";
import type { Discount, UpdateDiscountDto } from "@/lib/generated/billing/models";
import { queryClient } from "@/lib/react-query-provider";
import { Tag, Search, Loader2, Plus, Pencil, Trash2, Calendar as CalendarIcon, Sparkles } from "lucide-react";
import { ViewToggle } from "@/components/ui/view-toggle";
import { PaginationController } from "@/components/ui/pagination-controller";
import { toast } from "sonner";
import { useCurrency } from "@/lib/currency";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const discountSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  code: z.string().min(2, "Code must be at least 2 characters").regex(/^[a-zA-Z0-9]+$/, "Code must only contain alphanumeric characters"),
  description: z.string().min(1, "Description is required"),
  discountType: z.enum(["percentage", "fixed"]),
  value: z.string().min(1, "Value is required"),
  startDate: z.date().optional().nullable(),
  endDate: z.date().optional().nullable(),
  active: z.boolean().default(true),
  organizationId: z.string().optional(),
});

type DiscountFormValues = z.infer<typeof discountSchema>;

export default function AdminDiscountsPage() {
  const { symbol } = useCurrency();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = React.useState(1);
  const limit = 20;

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editingDiscount, setEditingDiscount] = React.useState<Discount | null>(null);
  const [deletingDiscount, setDeletingDiscount] = React.useState<Discount | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(discountSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      discountType: "percentage" as const,
      value: "",
      startDate: new Date(),
      endDate: addDays(new Date(), 1),
      active: true,
      organizationId: "",
    },
  });

  const selectedType = watch("discountType");

  const isSearching = debouncedSearch.trim().length > 0;

  const activeQuery = useGetDiscounts(
    { 
      page: currentPage, 
      limit, 
      code: isSearching ? debouncedSearch : undefined,
      // organizationId: 0 // Optional: Uncomment if we want to default to org-less discounts
    }
  );
  
  const discounts = Array.isArray(activeQuery.data?.data) ? (activeQuery.data.data as Discount[]) : [];
  const pagination = activeQuery.data?.pagination;

  const { data: orgTypesData } = useGetOrganizationTypes();
  const contentProviderTypeId = React.useMemo(() => {
    const types = Array.isArray(orgTypesData?.data) ? orgTypesData.data : [];
    return types.find((t) => t.code === "CONTENT_PROVIDER")?.id;
  }, [orgTypesData]);

  const { data: orgsData } = useGetOrganizations(
    { limit: 100, typeId: contentProviderTypeId },
    { query: { enabled: contentProviderTypeId != null } },
  );
  const orgs = Array.isArray(orgsData?.data) ? orgsData.data : [];

  const createMutation = useAddDiscount({
    mutation: {
      onSuccess: () => {
        toast.success("Discount created successfully");
        queryClient.invalidateQueries({ queryKey: getGetDiscountsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getSearchDiscountsQueryKey() });
        setIsCreateOpen(false);
        reset();
      },
      onError: (error: any) => {
        toast.error(error?.message || "Failed to create discount");
      },
    },
  });

  const updateMutation = useUpdateDiscount({
    mutation: {
      onSuccess: () => {
        toast.success("Discount updated successfully");
        queryClient.invalidateQueries({ queryKey: getGetDiscountsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getSearchDiscountsQueryKey() });
        setEditingDiscount(null);
        reset();
      },
      onError: (error: any) => {
        toast.error(error?.message || "Failed to update discount");
      },
    },
  });

  const deleteMutation = useDeleteDiscount({
    mutation: {
      onSuccess: () => {
        toast.success("Discount deleted successfully");
        queryClient.invalidateQueries({ queryKey: getGetDiscountsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getSearchDiscountsQueryKey() });
        setDeletingDiscount(null);
      },
      onError: (error: any) => {
        toast.error(error?.message || "Failed to delete discount");
      },
    },
  });

  const onSubmit = (data: DiscountFormValues) => {
    const formatDate = (date: Date | null | undefined) => {
      if (!date) return null;
      try {
        return format(date, "yyyy-MM-dd");
      } catch (e) {
        return null;
      }
    };

    const formattedPercentage = data.discountType === "percentage" 
      ? String(Number(data.value) / 100) 
      : null;
    
    const formattedFixedValue = data.discountType === "fixed" 
      ? data.value 
      : null;

    if (editingDiscount) {
      const updateData: UpdateDiscountDto = {
        name: data.name,
        code: data.code,
        description: data.description,
        active: data.active,
        percentage: formattedPercentage,
        fixedValue: formattedFixedValue,
        startDate: formatDate(data.startDate),
        endDate: formatDate(data.endDate),
      };
      updateMutation.mutate({ id: editingDiscount.id, data: updateData });
    } else {
      const createData: any = {
        name: data.name,
        code: data.code,
        description: data.description,
        active: data.active,
        percentage: formattedPercentage,
        fixedValue: formattedFixedValue,
        startDate: formatDate(data.startDate),
        endDate: formatDate(data.endDate),
        organizationId: data.organizationId ? Number(data.organizationId) : null,
      };
      
      createMutation.mutate({ data: createData as any });
    }
  };

  const openEdit = (discount: Discount) => {
    setEditingDiscount(discount);
    reset({
      name: discount.name,
      code: discount.code,
      description: discount.description || "",
      discountType: discount.percentage ? "percentage" : "fixed",
      value: discount.percentage ? formatPercentage(discount.percentage) : String(discount.fixedValue ?? ""),
      startDate: discount.startDate ? new Date(discount.startDate) : null,
      endDate: discount.endDate ? new Date(discount.endDate) : null,
      active: discount.active ?? true,
      organizationId: discount.organizationId ? String(discount.organizationId) : "",
    });
  };

  const confirmDelete = () => {
    if (deletingDiscount) {
      deleteMutation.mutate({ id: deletingDiscount.id });
    }
  };

  const isActive = (discount: Discount) => {
    if (!discount.active) return false;
    const now = new Date();
    if (discount.startDate && new Date(discount.startDate) > now) return false;
    if (discount.endDate && new Date(discount.endDate) < now) return false;
    return true;
  };

  // Percentages are stored as fractions (0.125 = 12.5%). Rounding here would both
  // misreport the value and, via openEdit seeding the form from this same
  // conversion, silently rewrite it on the next save — so keep the fraction and
  // only trim floating-point noise.
  const formatPercentage = (percentage: string | number) =>
    String(Number((Number(percentage) * 100).toFixed(4)));

  const formatFixedValue = (value: string | number, discountName?: string) => {
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    const name = discountName || "";
    let priceSymbol = symbol;
    if (name.includes("GHS")) priceSymbol = "GHS";
    const isUSD = priceSymbol === "$" || priceSymbol === "USD";
    const spacing = (!isUSD && priceSymbol) ? " " : "";
    return `${priceSymbol}${spacing}${numValue.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const onSubmitWrapper = (data: any) => onSubmit(data as DiscountFormValues);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-violet-600 font-bold text-sm uppercase tracking-wider">
            <Tag className="h-4 w-4" />
            Promotion Management
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Discounts</h1>
          <p className="text-slate-500 text-lg">Create and manage your promotional codes and price reductions.</p>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle view={viewMode} onViewChange={setViewMode} />
          <Dialog open={isCreateOpen} onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (open) reset();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-xl shadow-violet-500/25 h-12 px-8 rounded-2xl font-black text-base transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
                <Plus className="mr-2 h-5 w-5 stroke-[3px]" />
                Create Discount
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl rounded-[2rem] p-0 border-none shadow-2xl overflow-hidden bg-white">
              <form onSubmit={handleSubmit(onSubmitWrapper)}>
                <div className="p-10 pb-0">
                  <DialogHeader>
                    <DialogTitle className="text-3xl font-black text-slate-900">
                      New discount
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 font-medium text-base mt-2">
                      Configure a new promotional rule or discount code.
                    </DialogDescription>
                  </DialogHeader>
                </div>

                <div className="p-10 space-y-6 max-h-[60vh] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-bold text-slate-800">Discount name</Label>
                      <Input {...register("name")} className="h-12 rounded-xl border-slate-200" placeholder="Eg: Summer Sale" />
                      {errors.name && <p className="text-sm text-red-500 font-medium">{errors.name.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-slate-800">Internal code</Label>
                      <Input 
                        {...register("code")} 
                        className="h-12 rounded-xl border-slate-200 uppercase font-mono" 
                        placeholder="SUMMER20"
                        onChange={(e) => {
                          e.target.value = e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
                          register("code").onChange(e);
                        }}
                      />
                      {errors.code && <p className="text-sm text-red-500 font-medium">{errors.code.message}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-bold text-slate-800">Type</Label>
                      <Controller
                        name="discountType"
                        control={control}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="h-12 rounded-xl border-slate-200"><SelectValue /></SelectTrigger>
                            <SelectContent className="rounded-xl shadow-xl">
                              <SelectItem value="percentage">Percentage (%)</SelectItem>
                              <SelectItem value="fixed">Fixed Amount</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-slate-800">Value</Label>
                      <div className="relative">
                        {selectedType === "fixed" ? (
                           <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{symbol === "$" ? "GHS" : symbol}</span>
                        ) : null}
                        <Input type="number" {...register("value")} className={`h-12 rounded-xl border-slate-200 ${selectedType === "fixed" ? "pl-14" : ""}`} placeholder="0" />
                        {selectedType === "percentage" ? (
                           <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                        ) : null}
                      </div>
                      {errors.value && <p className="text-sm text-red-500 font-medium">{errors.value.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold text-slate-800">Target Organization</Label>
                    <Controller
                      name="organizationId"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="h-12 rounded-xl border-slate-200 shadow-sm"><SelectValue placeholder="Select organization" /></SelectTrigger>
                          <SelectContent className="rounded-xl shadow-xl">
                            {orgs.map((org) => (
                              <SelectItem key={org.id} value={String(org.id)} className="rounded-lg">{org.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.organizationId && <p className="text-sm text-red-500 font-medium">{errors.organizationId.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold text-slate-800">Description</Label>
                    <textarea
                      {...register("description")}
                      placeholder="Describe when and how this discount applies"
                      className="flex min-h-[80px] w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    {errors.description && <p className="text-sm text-red-500 font-medium">{errors.description.message}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-bold text-slate-800">Start Date</Label>
                      <Controller
                        name="startDate"
                        control={control}
                        render={({ field }) => (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full h-12 rounded-xl justify-start text-left font-normal border-slate-200 bg-white",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl border-none" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value || undefined}
                                onSelect={field.onChange}
                                initialFocus
                                className="rounded-2xl"
                              />
                            </PopoverContent>
                          </Popover>
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-slate-800">End Date</Label>
                      <Controller
                        name="endDate"
                        control={control}
                        render={({ field }) => (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full h-12 rounded-xl justify-start text-left font-normal border-slate-200 bg-white",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl border-none" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value || undefined}
                                onSelect={field.onChange}
                                initialFocus
                                className="rounded-2xl"
                              />
                            </PopoverContent>
                          </Popover>
                        )}
                      />
                    </div>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-3xl flex items-center justify-between border border-slate-100 mt-2">
                    <div>
                      <p className="font-bold text-slate-800">Activate immediately</p>
                      <p className="text-xs text-slate-500 font-medium">Discount will be live upon creation</p>
                    </div>
                    <Controller
                      name="active"
                      control={control}
                      render={({ field }) => (
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      )}
                    />
                  </div>
                </div>

                <DialogFooter className="p-10 pt-0 flex items-center justify-end gap-3">
                  <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="h-12 px-8 rounded-2xl font-bold bg-slate-50 text-slate-600">Cancel</Button>
                  <Button type="submit" className="bg-[#8B5CF6] hover:bg-[#7C3AED] h-12 px-10 rounded-2xl font-black text-white shadow-lg shadow-violet-500/20" disabled={createMutation.isPending}>
                    {createMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                    Add discount
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input 
            placeholder="Search by discount name or code..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="pl-10 h-12 rounded-xl border-slate-200 focus-visible:ring-violet-500" 
          />
        </div>
      </div>

      {activeQuery.isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-violet-600" />
          <p className="text-slate-500 font-medium">Fetching discounts...</p>
        </div>
      ) : activeQuery.error ? (
        <div className="text-center py-20 text-red-500">Failed to load discounts</div>
      ) : (
        <div className="space-y-6">
          {viewMode === "list" ? (
            <Card className="border-slate-200 shadow-sm overflow-hidden rounded-2xl">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="font-bold">Discount</TableHead>
                    <TableHead className="font-bold">Code</TableHead>
                    <TableHead className="font-bold">Value</TableHead>
                    <TableHead className="font-bold">Valid Until</TableHead>
                    <TableHead className="font-bold">Status</TableHead>
                    <TableHead className="text-right font-bold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {discounts.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-20 text-slate-500"><Tag className="h-12 w-12 mx-auto mb-3 text-slate-200" />No discounts found</TableCell></TableRow>
                  ) : discounts.map((discount) => (
                    <TableRow key={discount.id} className="hover:bg-slate-50/50 transition-colors group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center group-hover:bg-violet-600 group-hover:text-white transition-colors duration-300">
                            <Tag className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{discount.name}</div>
                            <div className="text-xs text-slate-400 line-clamp-1">{discount.description}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><code className="text-[10px] font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded tracking-wider uppercase">{discount.code}</code></TableCell>
                      <TableCell className="font-bold text-slate-900">
                        {discount.percentage ? `${formatPercentage(discount.percentage)}% OFF` : formatFixedValue(discount.fixedValue || 0, discount.name)}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 font-medium">
                        {discount.endDate ? (
                          <div className="flex items-center gap-1.5"><CalendarIcon className="h-3.5 w-3.5 text-slate-400" />{formatDate(discount.endDate)}</div>
                        ) : "Never"}
                      </TableCell>
                      <TableCell>
                        <Badge className={isActive(discount) ? "bg-green-100 text-green-700 border-green-200" : "bg-slate-100 text-slate-500 border-slate-200"}>
                          {isActive(discount) ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-violet-50 hover:text-violet-600" onClick={() => openEdit(discount)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => setDeletingDiscount(discount)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {discounts.map((discount) => (
                <Card key={discount.id} className="relative border-none bg-white hover:shadow-2xl transition-all duration-500 rounded-[2rem] overflow-hidden group border border-slate-100/50">
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <CardHeader className="pb-4 relative z-10">
                    <div className="flex items-start justify-between">
                      <div className="h-14 w-14 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center group-hover:bg-violet-600 group-hover:text-white transition-all duration-500 shadow-sm">
                        <Tag className="h-7 w-7 stroke-[2.5px]" />
                      </div>
                      <Badge className={cn(
                        "bg-white/80 backdrop-blur-md px-3 py-1 rounded-full font-bold shadow-sm",
                        isActive(discount) ? "text-green-600 border-green-100" : "text-slate-400 border-slate-100"
                      )}>
                        {isActive(discount) ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6 relative z-10">
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 group-hover:text-violet-600 transition-colors line-clamp-1 leading-tight">{discount.name}</h3>
                      <code className="text-[10px] font-mono text-slate-400 tracking-[0.2em] uppercase mt-2 block font-bold">{discount.code}</code>
                    </div>
                    
                    <div className="flex items-baseline gap-1 pt-2">
                      <span className="text-4xl font-black text-slate-900 tracking-tight">
                        {discount.percentage ? `${formatPercentage(discount.percentage)}%` : formatFixedValue(discount.fixedValue || 0, discount.name)}
                      </span>
                      <span className="text-slate-400 font-bold ml-1 text-sm uppercase tracking-widest">{discount.percentage ? "OFF" : "Discount"}</span>
                    </div>

                    {discount.endDate && (
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium py-2 px-3 bg-slate-50 rounded-xl w-fit">
                        <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
                        Valid until {formatDate(discount.endDate)}
                      </div>
                    )}

                    <div className="flex items-center gap-3 pt-2">
                      <Button variant="outline" size="lg" onClick={() => openEdit(discount)} className="flex-1 rounded-2xl font-black h-12 border-slate-200 hover:bg-violet-50 hover:text-violet-600 hover:border-violet-200 transition-all duration-300">
                        Edit details
                      </Button>
                      <Button variant="ghost" size="icon" className="h-12 w-12 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-colors" onClick={() => setDeletingDiscount(discount)}>
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <PaginationController
            currentPage={currentPage}
            totalPages={pagination?.totalPages || 1}
            totalCount={pagination?.totalCount || 0}
            limit={limit}
            onPageChange={setCurrentPage}
            itemName="discounts"
          />
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingDiscount} onOpenChange={(open) => { if (!open) setEditingDiscount(null); }}>
        <DialogContent className="sm:max-w-xl rounded-[2rem] p-0 border-none shadow-2xl overflow-hidden bg-white">
          <form onSubmit={handleSubmit(onSubmitWrapper)}>
            <div className="p-10 pb-0">
              <DialogHeader>
                <DialogTitle className="text-3xl font-black text-slate-900">
                  Edit discount
                </DialogTitle>
                <DialogDescription className="text-slate-500 font-medium text-base mt-2">
                  Modify the configuration for <span className="text-violet-600 font-bold">{editingDiscount?.name}</span>
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="p-10 space-y-6 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold text-slate-800">Discount name</Label>
                  <Input {...register("name")} className="h-12 rounded-xl border-slate-200" />
                  {errors.name && <p className="text-sm text-red-500 font-medium">{errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-slate-800">Internal code</Label>
                  <Input 
                    {...register("code")} 
                    className="h-12 rounded-xl border-slate-200 uppercase font-mono bg-slate-50" 
                    onChange={(e) => {
                      e.target.value = e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
                      register("code").onChange(e);
                    }}
                  />
                  {errors.code && <p className="text-sm text-red-500 font-medium">{errors.code.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold text-slate-800">Type</Label>
                  <Controller
                    name="discountType"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-12 rounded-xl border-slate-200"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl shadow-xl">
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                          <SelectItem value="fixed">Fixed Amount</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-slate-800">Value</Label>
                  <div className="relative">
                    {selectedType === "fixed" ? (
                       <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{symbol === "$" ? "GHS" : symbol}</span>
                    ) : null}
                    <Input type="number" {...register("value")} className={`h-12 rounded-xl border-slate-200 ${selectedType === "fixed" ? "pl-14" : ""}`} />
                    {selectedType === "percentage" ? (
                       <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                    ) : null}
                  </div>
                  {errors.value && <p className="text-sm text-red-500 font-medium">{errors.value.message}</p>}
                </div>
              </div>

              {/* UpdateDiscountDto carries no organizationId, so the target org can
                  only be set at creation — show it read-only instead of offering a
                  control whose changes are silently dropped on save. */}
              <div className="space-y-2">
                <Label className="font-bold text-slate-800">Target Organization</Label>
                <div className="flex h-12 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-600">
                  {editingDiscount?.organizationId
                    ? orgs.find((org) => String(org.id) === String(editingDiscount.organizationId))?.name
                      ?? `Organization #${editingDiscount.organizationId}`
                    : "All organizations"}
                </div>
                <p className="text-xs text-slate-400">Set at creation and cannot be changed.</p>
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-slate-800">Description</Label>
                <textarea
                  {...register("description")}
                  placeholder="Describe when and how this discount applies"
                  className="flex min-h-[80px] w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                />
                {errors.description && <p className="text-sm text-red-500 font-medium">{errors.description.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold text-slate-800">Start Date</Label>
                  <Controller
                    name="startDate"
                    control={control}
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full h-12 rounded-xl justify-start text-left font-normal border-slate-200 bg-white",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl border-none" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                            initialFocus
                            className="rounded-2xl"
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-slate-800">End Date</Label>
                  <Controller
                    name="endDate"
                    control={control}
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full h-12 rounded-xl justify-start text-left font-normal border-slate-200 bg-white",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl border-none" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                            initialFocus
                            className="rounded-2xl"
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                </div>
              </div>
              
              <div className="bg-slate-50 p-6 rounded-3xl flex items-center justify-between border border-slate-100 mt-2">
                <div>
                  <p className="font-bold text-slate-800">Active status</p>
                  <p className="text-xs text-slate-500 font-medium">Toggle whether this discount is usable</p>
                </div>
                <Controller
                  name="active"
                  control={control}
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
              </div>
            </div>

            <DialogFooter className="p-10 pt-0 flex items-center justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setEditingDiscount(null)} className="h-12 px-8 rounded-2xl font-bold bg-slate-50 text-slate-600">Cancel</Button>
              <Button type="submit" className="bg-[#8B5CF6] hover:bg-[#7C3AED] h-12 px-10 rounded-2xl font-black text-white shadow-lg shadow-violet-500/20" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingDiscount} onOpenChange={(open) => { if (!open) setDeletingDiscount(null); }}>
        <DialogContent className="sm:max-w-[480px] rounded-[2rem] p-10 border-none shadow-2xl bg-white">
          <DialogHeader>
            <div className="h-16 w-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-6">
              <Trash2 className="h-8 w-8" />
            </div>
            <DialogTitle className="text-3xl font-black text-slate-900">
              Delete Discount
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium text-lg mt-2">
              Are you sure you want to delete <span className="text-slate-900 font-bold">"{deletingDiscount?.name}"</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <Button variant="ghost" onClick={() => setDeletingDiscount(null)} className="flex-1 h-12 rounded-2xl font-bold bg-slate-50 text-slate-600">Keep Discount</Button>
            <Button onClick={confirmDelete} className="flex-1 h-12 rounded-2xl font-black bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20" disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useGetDynamicPackageConfigs,
  useAddDynamicPackageConfig,
  useUpdateDynamicPackageConfig,
  useDeleteDynamicPackageConfig,
  getGetDynamicPackageConfigsQueryKey,
} from "@/lib/generated/billing/dynamic-package-configs/dynamic-package-configs";
import { useGetCurrencies } from "@/lib/generated/billing/currencies/currencies";
import { useGetDiscounts } from "@/lib/generated/billing/discounts/discounts";
import type { CreateDynamicPackageConfigDto, UpdateDynamicPackageConfigDto } from "@/lib/generated/billing/models";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Search, Loader2, Plus, Pencil, Trash2, AlertCircle, Layers, Sparkles } from "lucide-react";
import { PaginationController } from "@/components/ui/pagination-controller";
import { queryClient } from "@/lib/react-query-provider";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const packageTemplateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  code: z.string().min(2, "Code must be at least 2 characters").regex(/^[a-zA-Z0-9]+$/, "Code must only contain alphanumeric characters"),
  description: z.string().min(1, "Description is required"),
  currencyId: z.string().min(1, "Currency is required"),
  offersRequired: z.string().optional(),
  validity: z.string().optional(),
  validityTimeUnit: z.enum(["DAY", "MONTH"]).optional(),
  discountId: z.string().optional(),
});

type PackageTemplateFormValues = z.infer<typeof packageTemplateSchema>;

export default function PackageTemplatesPage() {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const limit = 20;
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editingTemplate, setEditingTemplate] = React.useState<any | null>(null);
  const [deletingTemplate, setDeletingTemplate] = React.useState<any | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<PackageTemplateFormValues>({
    resolver: zodResolver(packageTemplateSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      currencyId: "1",
      offersRequired: "1",
      validity: "",
      validityTimeUnit: undefined,
      discountId: "none",
    },
  });

  const { data: configsResp, isLoading, error, refetch } = useGetDynamicPackageConfigs({
    page: currentPage,
    limit,
  });

  const configs = Array.isArray(configsResp?.data) ? configsResp.data : [];

  const { data: currenciesData } = useGetCurrencies({});
  const availableCurrencies = currenciesData?.data || [];

  const { data: discountsData } = useGetDiscounts({ limit: 100 });
  const availableDiscounts = discountsData?.data || [];

  const createMutation = useAddDynamicPackageConfig({
    mutation: {
      onSuccess: () => {
        toast.success("Package template created");
        queryClient.invalidateQueries({ queryKey: getGetDynamicPackageConfigsQueryKey() });
        setIsCreateOpen(false);
        reset();
      },
      onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to create template"),
    },
  });

  const updateMutation = useUpdateDynamicPackageConfig({
    mutation: {
      onSuccess: () => {
        toast.success("Package template updated");
        queryClient.invalidateQueries({ queryKey: getGetDynamicPackageConfigsQueryKey() });
        setEditingTemplate(null);
        reset();
      },
      onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to update template"),
    },
  });

  const deleteMutation = useDeleteDynamicPackageConfig({
    mutation: {
      onSuccess: () => {
        toast.success("Package template deleted");
        queryClient.invalidateQueries({ queryKey: getGetDynamicPackageConfigsQueryKey() });
        setDeletingTemplate(null);
      },
      onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to delete template"),
    },
  });

  const onSubmit = (data: PackageTemplateFormValues) => {
    console.log("Form submitted with data:", data);
    const validity = data.validity && data.validity !== "" ? parseInt(data.validity) : null;
    
    if (editingTemplate) {
      console.log("Updating template:", editingTemplate.id);
      const updateData: UpdateDynamicPackageConfigDto = {
        name: data.name,
        code: data.code,
        description: data.description,
        offersRequired: data.offersRequired ? parseInt(data.offersRequired) : 0,
        validity: validity,
        validityTimeUnit: data.validityTimeUnit as any,
        discountId: data.discountId && data.discountId !== "none" ? parseInt(data.discountId) : null,
      };
      console.log("Update payload:", updateData);
      updateMutation.mutate({ id: editingTemplate.id, data: updateData });
    } else {
      console.log("Creating new template");
      const createData: CreateDynamicPackageConfigDto = {
        name: data.name,
        code: data.code,
        description: data.description,
        currencyId: parseInt(data.currencyId),
        offersRequired: data.offersRequired ? parseInt(data.offersRequired) : 0,
        validity: validity,
        validityTimeUnit: data.validityTimeUnit as any,
        discountId: data.discountId && data.discountId !== "none" ? parseInt(data.discountId) : undefined,
      };
      console.log("Create payload:", createData);
      createMutation.mutate({ data: createData });
    }
  };

  const openEdit = (cfg: any) => {
    setEditingTemplate(cfg);
    reset({
      name: cfg.name || "",
      code: cfg.code || "",
      description: cfg.description || "",
      currencyId: String(cfg.currencyId || "1"),
      offersRequired: String(cfg.offersRequired || "1"),
      validity: cfg.validity ? String(cfg.validity) : "",
      validityTimeUnit: cfg.validityTimeUnit as any,
      discountId: cfg.discountId ? String(cfg.discountId) : "none",
    });
  };

  const pagination = configsResp?.pagination;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider">
            <Layers className="h-4 w-4" />
            Configuration Portal
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Package Templates</h1>
          <p className="text-slate-500 text-lg">Define dynamic package structures and offering requirements.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              placeholder="Search templates..."
              className="pl-12 h-12 rounded-2xl bg-white border-slate-200 focus:ring-violet-500 transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (open) reset(); }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-xl shadow-primary/25 h-12 px-8 rounded-2xl font-black text-base transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
                <Plus className="mr-2 h-5 w-5 stroke-[3px]" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl rounded-[2rem] p-0 border-none shadow-2xl overflow-hidden bg-white">
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="p-10 pb-0">
                  <DialogHeader>
                    <DialogTitle className="text-3xl font-black text-slate-900">
                      New template
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 font-medium text-base mt-2">
                      Design a new dynamic package configuration.
                    </DialogDescription>
                  </DialogHeader>
                </div>

                <div className="p-10 space-y-6 max-h-[60vh] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-bold text-slate-800">Template name</Label>
                      <Input {...register("name")} placeholder="Eg: Enterprise Suite" className="h-12 rounded-xl border-slate-200" />
                      {errors.name && <p className="text-sm text-red-500 font-medium">{errors.name.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-slate-800">Internal code</Label>
                      <Input 
                        {...register("code")} 
                        placeholder="PKG-001" 
                        className="h-12 rounded-xl border-slate-200 uppercase font-mono bg-slate-50" 
                        onChange={(e) => {
                          e.target.value = e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
                          register("code").onChange(e);
                        }}
                      />
                      {errors.code && <p className="text-sm text-red-500 font-medium">{errors.code.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold text-slate-800">Description</Label>
                    <textarea 
                      {...register("description")} 
                      placeholder="Describe this template"
                      className="flex min-h-[80px] w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    {errors.description && <p className="text-sm text-red-500 font-medium">{errors.description.message}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-bold text-slate-800">Currency</Label>
                      <Controller
                        name="currencyId"
                        control={control}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="h-12 rounded-xl border-slate-200"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent className="rounded-xl shadow-xl">
                              {availableCurrencies.map((c: any) => (
                                <SelectItem key={c.id} value={String(c.id)}>{c.code} ({c.symbol})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.currencyId && <p className="text-sm text-red-500 font-medium">{errors.currencyId.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-slate-800">Required Offers</Label>
                      <Input {...register("offersRequired")} type="number" min="0" className="h-12 rounded-xl border-slate-200" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-bold text-slate-800">Validity</Label>
                      <Input {...register("validity")} type="number" min="1" className="h-12 rounded-xl border-slate-200" placeholder="0" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-slate-800">Time Unit</Label>
                      <Controller
                        name="validityTimeUnit"
                        control={control}
                        render={({ field }) => (
                          <Select value={field.value || ""} onValueChange={field.onChange}>
                            <SelectTrigger className="h-12 rounded-xl border-slate-200"><SelectValue placeholder="Select unit" /></SelectTrigger>
                            <SelectContent className="rounded-xl shadow-xl">
                              <SelectItem value="DAY">Day</SelectItem>
                              <SelectItem value="MONTH">Month</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-bold text-slate-800">Discount (optional)</Label>
                    <Controller
                      name="discountId"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value || "none"} onValueChange={field.onChange}>
                          <SelectTrigger className="h-12 rounded-xl border-slate-200"><SelectValue placeholder="No discount" /></SelectTrigger>
                          <SelectContent className="rounded-xl shadow-xl">
                            <SelectItem value="none">No Discount</SelectItem>
                            {availableDiscounts.map((d: any) => (
                              <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>

                <DialogFooter className="p-10 pt-0 flex items-center justify-end gap-3">
                  <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="h-12 px-8 rounded-2xl font-bold bg-slate-50 text-slate-600">Cancel</Button>
                  <Button type="submit" className="bg-[#8B5CF6] hover:bg-[#7C3AED] h-12 px-10 rounded-2xl font-black text-white shadow-lg shadow-violet-500/20" disabled={createMutation.isPending}>
                    {createMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                    Create Template
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
          <p className="text-slate-500 font-medium">Loading templates...</p>
        </div>
      ) : error ? (
        <div className="text-center py-20 text-red-500 font-medium bg-red-50 rounded-2xl border border-red-100">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          Failed to load templates
          <Button variant="link" onClick={() => refetch()} className="block mx-auto mt-2">Try again</Button>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {configs.map((template: any) => (
              <Card key={template.id} className="relative border-none bg-white hover:shadow-2xl transition-all duration-500 rounded-[2rem] overflow-hidden group border border-slate-100/50">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <CardHeader className="pb-4 relative z-10">
                  <div className="flex items-start justify-between">
                    <div className="h-14 w-14 rounded-2xl bg-violet-50 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-sm">
                      <Layers className="h-7 w-7 stroke-[2.5px]" />
                    </div>
                    <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 px-3 py-1 rounded-full font-bold">
                      {template.offersRequired} Offers Req.
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 relative z-10">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 group-hover:text-primary transition-colors line-clamp-1 leading-tight">{template.name}</h3>
                    <code className="text-[10px] font-mono text-slate-400 tracking-[0.2em] uppercase mt-2 block font-bold">{template.code}</code>
                  </div>
                  
                  <p className="text-slate-500 line-clamp-2 text-sm leading-relaxed">{template.description}</p>

                  <div className="pt-4 border-t border-slate-50 flex items-center gap-3">
                    <Button variant="outline" size="lg" onClick={() => openEdit(template)} className="flex-1 rounded-2xl font-black h-12 border-slate-200 hover:bg-violet-50 hover:text-primary hover:border-primary/20 transition-all duration-300">
                      Edit Template
                    </Button>
                    <Button variant="ghost" size="icon" className="h-12 w-12 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-colors" onClick={() => setDeletingTemplate(template)}>
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <PaginationController
              currentPage={currentPage}
              totalPages={pagination.totalPages}
              totalCount={pagination.totalCount}
              limit={limit}
              onPageChange={setCurrentPage}
              itemName="templates"
            />
          )}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => { if (!open) setEditingTemplate(null); }}>
        <DialogContent className="sm:max-w-xl rounded-[2rem] p-0 border-none shadow-2xl overflow-hidden bg-white">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="p-10 pb-0">
              <DialogHeader>
                <DialogTitle className="text-3xl font-black text-slate-900">
                  Edit template
                </DialogTitle>
                <DialogDescription className="text-slate-500 font-medium text-base mt-2">
                  Updating configuration for <span className="text-violet-600 font-bold">{editingTemplate?.name}</span>
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="p-10 space-y-6 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold text-slate-800">Template name</Label>
                  <Input {...register("name")} className="h-12 rounded-xl border-slate-200" />
                  {errors.name && <p className="text-sm text-red-500 font-medium">{errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-slate-800">Internal code</Label>
                  <Input {...register("code")} disabled className="h-12 rounded-xl border-slate-200 bg-slate-50 font-mono" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-slate-800">Description</Label>
                <textarea 
                  {...register("description")} 
                  className="flex min-h-[80px] w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold text-slate-800">Currency</Label>
                  <Input value={editingTemplate?.currency?.code || "—"} disabled className="h-12 rounded-xl border-slate-200 bg-slate-50 font-mono" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-slate-800">Required Offers</Label>
                  <Input {...register("offersRequired")} type="number" min="0" className="h-12 rounded-xl border-slate-200" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold text-slate-800">Validity</Label>
                  <Input {...register("validity")} type="number" min="1" className="h-12 rounded-xl border-slate-200" />
                  {errors.validity && <p className="text-sm text-red-500 font-medium mt-1">{errors.validity.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-slate-800">Time Unit</Label>
                  <Controller
                    name="validityTimeUnit"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <SelectTrigger className="h-12 rounded-xl border-slate-200"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl shadow-xl">
                          <SelectItem value="DAY">Day</SelectItem>
                          <SelectItem value="MONTH">Month</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-slate-800">Discount (optional)</Label>
                <Controller
                  name="discountId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || "none"} onValueChange={field.onChange}>
                      <SelectTrigger className="h-12 rounded-xl border-slate-200"><SelectValue placeholder="No discount" /></SelectTrigger>
                      <SelectContent className="rounded-xl shadow-xl">
                        <SelectItem value="none">No Discount</SelectItem>
                        {availableDiscounts.map((d: any) => (
                          <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <DialogFooter className="p-10 pt-0 flex items-center justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setEditingTemplate(null)} className="h-12 px-8 rounded-2xl font-bold bg-slate-50 text-slate-600">Cancel</Button>
              <Button type="submit" className="bg-[#8B5CF6] hover:bg-[#7C3AED] h-12 px-10 rounded-2xl font-black text-white shadow-lg shadow-violet-500/20" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deletingTemplate} onOpenChange={(open) => { if (!open) setDeletingTemplate(null); }}>
        <DialogContent className="sm:max-w-[480px] rounded-[2rem] p-10 border-none shadow-2xl bg-white">
          <DialogHeader>
            <div className="h-16 w-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-6">
              <Trash2 className="h-8 w-8" />
            </div>
            <DialogTitle className="text-3xl font-black text-slate-900">
              Delete Template
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium text-lg mt-2">
              Are you sure you want to delete <span className="text-slate-900 font-bold">"{deletingTemplate?.name}"</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <Button variant="ghost" onClick={() => setDeletingTemplate(null)} className="flex-1 h-12 rounded-2xl font-bold bg-slate-50 text-slate-600">Keep Template</Button>
            <Button onClick={() => deletingTemplate && deleteMutation.mutate({ id: deletingTemplate.id })} className="flex-1 h-12 rounded-2xl font-black bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20" disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

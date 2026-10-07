"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  useGetOrganizations, 
  useAddOrganization, 
  useUpdateOrganization, 
  useRemoveOrganization,
  getGetOrganizationsQueryKey 
} from "@/lib/generated/org/organizations/organizations";
import { useGetOrganizationTypes } from "@/lib/generated/org/organization-types/organization-types";
import { useGetCountries } from "@/lib/generated/org/countries/countries";
import { 
  Building2, 
  Plus, 
  Search, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Loader2, 
  Mail, 
  Phone, 
  Globe, 
  MapPin,
  ExternalLink,
  ShieldCheck,
  Building,
  LayoutGrid,
  List as ListIcon,
  CalendarDays,
  UserCheck,
  UserX,
  UserPlus2,
  ChevronDown,
  User as UserIcon,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ViewToggle } from "@/components/ui/view-toggle";
import { PaginationController } from "@/components/ui/pagination-controller";
import { queryClient } from "@/lib/react-query-provider";
import { toast } from "sonner";
import type { OrganizationDto } from "@/lib/generated/org/models/organizationDto";
import type { OrganizationStatus } from "@/lib/generated/org/models/organizationStatus";
import type { UpdateOrganizationDto, UpdateOrganizationDtoStatus, UpdateOrganizationDtoSpaceType } from "@/lib/generated/org/models";
import { 
  useGetSubAccounts, 
  useEnableSubAccount, 
  useDisableSubAccount,
  SubAccount
} from "@/lib/api/content-api";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function AdminAccountsPage() {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<OrganizationStatus | "">("");
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("list");
  const [currentPage, setCurrentPage] = React.useState(1);
  const limit = 20;

  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [selectedOrg, setSelectedOrg] = React.useState<OrganizationDto | null>(null);
  
  const [formData, setFormData] = React.useState({ 
    name: "", 
    code: "",
    contactEmail: "",
    alternateEmail: "",
    contactMsisdn: "",
    address: "", 
    city: "", 
    region: "",
    logoUrl: "",
    domain: "", 
    webUrl: "",
    status: "ACTIVE" as UpdateOrganizationDtoStatus, 
    statusReason: "",
    countryId: "", 
    typeId: "",
    spaceType: "LOW" as UpdateOrganizationDtoSpaceType,
    adminFirstName: "",
    adminLastName: "",
    adminEmail: "",
    adminUsername: "",
    projectId: "",
    groupId: "",
  });

  const { data: orgsData, isLoading } = useGetOrganizations({ 
    page: currentPage,
    limit, 
    status: statusFilter || undefined,
  });
  const { data: typesData } = useGetOrganizationTypes();
  const { data: countriesData } = useGetCountries();

  const addOrgMutation = useAddOrganization({
    mutation: {
      onSuccess: () => {
        toast.success("Organization created successfully");
        queryClient.invalidateQueries({ queryKey: getGetOrganizationsQueryKey() });
        setIsAddDialogOpen(false);
        resetForm();
      },
      onError: (error: any) => {
        const data = error?.response?.data;
        const detail = typeof data === "string" ? data : data?.message ?? data?.detail;
        toast.error(typeof detail === "string" && detail ? detail : "Failed to create organization");
      }
    }
  });

  const updateOrgMutation = useUpdateOrganization({
    mutation: {
      onSuccess: () => {
        toast.success("Organization updated successfully");
        queryClient.invalidateQueries({ queryKey: getGetOrganizationsQueryKey() });
        setIsEditDialogOpen(false);
        resetForm();
      },
      onError: () => toast.error("Failed to update organization")
    }
  });

  const removeOrgMutation = useRemoveOrganization({
    mutation: {
      onSuccess: () => {
        toast.success("Organization deleted successfully");
        queryClient.invalidateQueries({ queryKey: getGetOrganizationsQueryKey() });
        setIsDeleteDialogOpen(false);
        setSelectedOrg(null);
      },
      onError: () => toast.error("Failed to delete organization")
    }
  });

  const orgs = Array.isArray(orgsData?.data) ? orgsData.data : [];
  const pagination = orgsData?.pagination;
  const types = Array.isArray(typesData?.data) ? typesData.data : [];
  const countries = Array.isArray(countriesData?.data) ? countriesData.data : [];

  const handleAddOrg = () => {
    const missing = [
      [formData.name, "Organization name"],
      [formData.countryId, "Country"],
      [formData.typeId, "Organization type"],
      [formData.address, "Physical address"],
      [formData.adminFirstName, "Administrator first name"],
      [formData.adminLastName, "Administrator last name"],
      [formData.adminEmail, "Administrator email"],
      [formData.adminUsername, "Administrator username"],
    ].find(([value]) => !value.trim());
    if (missing) {
      toast.error(`${missing[1]} is required`);
      return;
    }
    addOrgMutation.mutate({ 
      data: { 
        name: formData.name, 
        code: formData.code || undefined,
        domain: formData.domain || undefined, 
        address: formData.address, 
        city: formData.city || undefined, 
        region: formData.region || undefined,
        countryId: parseInt(formData.countryId), 
        typeId: parseInt(formData.typeId) || 1,
        projectId: formData.projectId ? parseInt(formData.projectId) : undefined,
        groupId: formData.groupId ? parseInt(formData.groupId) : undefined,
        adminProfile: {
          firstName: formData.adminFirstName,
          lastName: formData.adminLastName,
          emailAddress: formData.adminEmail,
          username: formData.adminUsername,
        },
        confirmationUrl: `${window.location.origin}/confirm`,
      } 
    });
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const handleEditOrg = () => {
    if (!selectedOrg) return;
    const updateData: UpdateOrganizationDto = { 
      name: formData.name, 
      code: formData.code || undefined,
      contactEmail: formData.contactEmail || undefined,
      alternateEmail: formData.alternateEmail || undefined,
      contactMsisdn: formData.contactMsisdn || undefined,
      address: formData.address, 
      city: formData.city || undefined, 
      region: formData.region || undefined,
      logoUrl: formData.logoUrl || undefined,
      domain: formData.domain || undefined, 
      webUrl: formData.webUrl || undefined,
      status: formData.status, 
      statusReason: formData.statusReason || undefined,
      countryId: parseInt(formData.countryId),
      typeId: parseInt(formData.typeId),
      projectId: formData.projectId ? parseInt(formData.projectId) : undefined,
      groupId: formData.groupId ? parseInt(formData.groupId) : undefined,
      spaceType: formData.spaceType,
    };
    updateOrgMutation.mutate({ id: selectedOrg.id, data: updateData });
  };

  const handleDeleteOrg = () => {
    if (!selectedOrg) return;
    removeOrgMutation.mutate({ id: selectedOrg.id });
  };

  const resetForm = () => { 
    setFormData({ 
      name: "", 
      code: "",
      contactEmail: "",
      alternateEmail: "",
      contactMsisdn: "",
      address: "", 
      city: "", 
      region: "",
      logoUrl: "",
      domain: "", 
      webUrl: "",
      status: "ACTIVE", 
      statusReason: "",
      countryId: "", 
      typeId: "",
      spaceType: "LOW",
      adminFirstName: "",
      adminLastName: "",
      adminEmail: "",
      adminUsername: "",
      projectId: "",
      groupId: "",
    }); 
    setSelectedOrg(null); 
  };
  
  const openEditDialog = (org: OrganizationDto) => { 
    setSelectedOrg(org); 
    setFormData({ 
      name: org.name || "", 
      code: org.code || "",
      contactEmail: org.contactEmail || "",
      alternateEmail: org.alternateEmail || "",
      contactMsisdn: org.contactMsisdn || "",
      address: org.address || "", 
      city: org.city || "", 
      region: org.region || "",
      logoUrl: org.logoUrl || "",
      domain: org.domain || "", 
      webUrl: org.webUrl || "",
      status: (org.status || "ACTIVE") as UpdateOrganizationDtoStatus, 
      statusReason: org.statusReason || "",
      countryId: String(org.countryId || ""), 
      typeId: String(org.typeId || ""),
      spaceType: (org.spaceType || "LOW") as UpdateOrganizationDtoSpaceType,
      adminFirstName: "",
      adminLastName: "",
      adminEmail: "",
      adminUsername: "",
      projectId: String(org.projectId || ""),
      groupId: String(org.groupId || ""),
    }); 
    setIsEditDialogOpen(true); 
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE": return <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>;
      case "SUSPENDED": return <Badge className="bg-red-100 text-red-700 border-red-200">Suspended</Badge>;
      case "INACTIVE": return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Inactive</Badge>;
      default: return <Badge variant="outline">{status || "unknown"}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Content Providers</h1>
          <p className="text-slate-500 text-lg">Manage platform organizations and their associated sub-accounts</p>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle view={viewMode} onViewChange={setViewMode} />
          <Button 
            className="bg-violet-600 hover:bg-violet-700 shadow-lg shadow-violet-500/20 h-11 px-6 rounded-xl font-bold"
            onClick={() => { resetForm(); setIsAddDialogOpen(true); }}
          >
            <Plus className="mr-2 h-5 w-5" />
            Add Content Provider
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input 
            placeholder="Search by name, code or domain..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="pl-10 h-12 rounded-xl border-slate-200 focus-visible:ring-violet-500" 
          />
        </div>
        <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v as OrganizationStatus)}>
          <SelectTrigger className="w-full md:w-[200px] h-12 rounded-xl border-slate-200">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent className="rounded-xl shadow-xl">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-violet-600" />
          <p className="text-slate-500 font-medium">Synchronizing organization registry...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {viewMode === "list" ? (
            <Card className="border-slate-200 shadow-sm overflow-hidden rounded-2xl">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="font-bold">Organization</TableHead>
                    <TableHead className="font-bold">Contact</TableHead>
                    <TableHead className="font-bold">Location</TableHead>
                    <TableHead className="font-bold">Type</TableHead>
                    <TableHead className="font-bold">Created At</TableHead>
                    <TableHead className="font-bold">Status</TableHead>
                    <TableHead className="text-right font-bold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orgs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-20 text-slate-500">
                        <Building2 className="h-12 w-12 mx-auto mb-3 text-slate-200" />
                        No organizations found matching your criteria
                      </TableCell>
                    </TableRow>
                  ) : orgs.map((org) => (
                    <OrganizationRow key={org.id} org={org} onEdit={openEditDialog} onDelete={(o) => { setSelectedOrg(o); setIsDeleteDialogOpen(true); }} />
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {orgs.map((org) => (
                <Card key={org.id} className="relative border-slate-200 hover:border-violet-300 hover:shadow-xl transition-all duration-300 rounded-3xl overflow-hidden group">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="h-12 w-12 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-all duration-300">
                         {org.logoUrl ? (
                          <img src={org.logoUrl} alt={org.name} className="h-full w-full object-cover rounded-2xl" />
                        ) : (
                          <Building className="h-6 w-6" />
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(String(org.status))}
                        <Badge variant="outline" className="text-[10px] font-mono border-slate-200 text-slate-400">{org.code || 'NO-CODE'}</Badge>
                      </div>
                    </div>
                    <div className="pt-4">
                      <CardTitle className="text-xl font-black text-slate-900 group-hover:text-violet-600 transition-colors line-clamp-1">{org.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1 font-medium">
                        <Globe className="h-3 w-3" /> {org.domain || 'no-domain.com'}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 border-t border-slate-50 pt-4">
                      <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                        <Mail className="h-3.5 w-3.5 text-violet-500" />
                        <span className="truncate">{org.contactEmail || 'No email provided'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                        <MapPin className="h-3.5 w-3.5 text-violet-500" />
                        <span className="truncate">{org.city || 'Location unknown'}, {org.country?.code || ''}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold pt-1">
                        <CalendarDays className="h-3 w-3" />
                        Onboarded: {formatDate(org.createdAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 rounded-xl h-9 font-bold border-slate-200 hover:bg-slate-50"
                        onClick={() => openEditDialog(org)}
                      >
                        Details
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 rounded-xl text-red-500 hover:bg-red-50"
                        onClick={() => { setSelectedOrg(org); setIsDeleteDialogOpen(true); }}
                      >
                        <Trash2 className="h-4 w-4" />
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
            itemName="organizations"
          />
        </div>
      )}

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-[2rem] border-none shadow-2xl bg-white">
          <div className="p-10 pb-0">
            <DialogHeader>
              <DialogTitle className="text-3xl font-black text-slate-900">
                Onboard organization
              </DialogTitle>
              <DialogDescription className="text-slate-500 font-medium text-base mt-2">
                Initialize a new organizational entity on the platform.
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <ScrollArea className="flex-1 p-10">
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="font-bold text-slate-800">Organization name *</Label>
                  <Input placeholder="Eg: Acme Corporation" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="h-12 rounded-xl border-slate-200" />
                </div>
                <div className="space-y-3">
                  <Label className="font-bold text-slate-800">Official domain</Label>
                  <Input placeholder="acme.com" value={formData.domain} onChange={(e) => setFormData({ ...formData, domain: e.target.value })} className="h-12 rounded-xl border-slate-200" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="font-bold text-slate-800">Country *</Label>
                  <Select value={formData.countryId} onValueChange={(v) => setFormData({ ...formData, countryId: v })}>
                    <SelectTrigger className="h-12 rounded-xl border-slate-200"><SelectValue placeholder="Select country" /></SelectTrigger>
                    <SelectContent className="rounded-xl shadow-xl">
                      {countries.map((c) => (<SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label className="font-bold text-slate-800">Organization type *</Label>
                  <Select value={formData.typeId} onValueChange={(v) => setFormData({ ...formData, typeId: v })}>
                    <SelectTrigger className="h-12 rounded-xl border-slate-200"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent className="rounded-xl shadow-xl">
                      {types.map((t) => (<SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="font-bold text-slate-800">Physical address *</Label>
                <Input placeholder="Eg: 12 Independence Avenue" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="h-12 rounded-xl border-slate-200" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="font-bold text-slate-800">City</Label>
                  <Input placeholder="Eg: Accra" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="h-12 rounded-xl border-slate-200" />
                </div>
                <div className="space-y-3">
                  <Label className="font-bold text-slate-800">Region</Label>
                  <Input placeholder="Eg: Greater Accra" value={formData.region} onChange={(e) => setFormData({ ...formData, region: e.target.value })} className="h-12 rounded-xl border-slate-200" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3"><Label className="font-bold text-slate-800">Project ID (Optional)</Label><Input type="number" placeholder="Eg: 102" value={formData.projectId} onChange={(e) => setFormData({ ...formData, projectId: e.target.value })} className="h-12 rounded-xl border-slate-200" /></div>
                <div className="space-y-3"><Label className="font-bold text-slate-800">Group ID (Optional)</Label><Input type="number" placeholder="Eg: 5" value={formData.groupId} onChange={(e) => setFormData({ ...formData, groupId: e.target.value })} className="h-12 rounded-xl border-slate-200" /></div>
              </div>

              <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-6">
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="h-6 w-6 text-violet-600" />
                  Primary administrator
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label className="text-xs font-bold uppercase text-slate-400">First Name</Label><Input value={formData.adminFirstName} onChange={(e) => setFormData({ ...formData, adminFirstName: e.target.value })} className="bg-white rounded-xl h-12 border-slate-200" /></div>
                  <div className="space-y-2"><Label className="text-xs font-bold uppercase text-slate-400">Last Name</Label><Input value={formData.adminLastName} onChange={(e) => setFormData({ ...formData, adminLastName: e.target.value })} className="bg-white rounded-xl h-12 border-slate-200" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label className="text-xs font-bold uppercase text-slate-400">Official Email</Label><Input type="email" value={formData.adminEmail} onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })} className="bg-white rounded-xl h-12 border-slate-200" /></div>
                  <div className="space-y-2"><Label className="text-xs font-bold uppercase text-slate-400">Username</Label><Input value={formData.adminUsername} onChange={(e) => setFormData({ ...formData, adminUsername: e.target.value })} className="bg-white rounded-xl h-12 border-slate-200" /></div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="p-10 pt-4 flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)} className="h-12 rounded-2xl px-8 font-bold bg-slate-50 text-slate-600">Cancel</Button>
            <Button 
              className="bg-[#8B5CF6] hover:bg-[#7C3AED] h-12 rounded-2xl px-10 font-black text-white shadow-lg shadow-violet-500/20" 
              onClick={handleAddOrg} 
              disabled={addOrgMutation.isPending}
            >
              {addOrgMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
              Onboard Organization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[850px] max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-[2rem] border-none shadow-2xl bg-white">
          <div className="p-10 pb-0">
            <DialogHeader>
              <DialogTitle className="text-3xl font-black text-slate-900">
                Account configuration
              </DialogTitle>
              <DialogDescription className="text-slate-500 font-medium text-base mt-2">
                Modifying profile for <span className="text-violet-600 font-bold">{selectedOrg?.name}</span>
              </DialogDescription>
            </DialogHeader>
          </div>

          <ScrollArea className="flex-1 p-10">
            <Tabs defaultValue="general" className="space-y-8">
              <TabsList className="bg-slate-50 p-1.5 rounded-2xl w-full max-w-md mx-auto grid grid-cols-2 border border-slate-100">
                <TabsTrigger value="general" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-slate-500 data-[state=active]:text-slate-900 py-2.5">General Info</TabsTrigger>
                <TabsTrigger value="contact" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-slate-500 data-[state=active]:text-slate-900 py-2.5">Contact & Access</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-8 mt-4 outline-none">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2.5"><Label className="font-bold text-slate-800">Organization name</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="h-12 rounded-xl border-slate-200" /></div>
                  <div className="space-y-2.5"><Label className="font-bold text-slate-800">Internal code</Label><Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} className="h-12 rounded-xl border-slate-200 uppercase font-mono bg-slate-50" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2.5"><Label className="font-bold text-slate-800">City</Label><Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="h-12 rounded-xl border-slate-200" /></div>
                  <div className="space-y-2.5"><Label className="font-bold text-slate-800">Region</Label><Input value={formData.region} onChange={(e) => setFormData({ ...formData, region: e.target.value })} className="h-12 rounded-xl border-slate-200" /></div>
                </div>
                <div className="space-y-2.5"><Label className="font-bold text-slate-800">Physical address</Label><Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="h-12 rounded-xl border-slate-200" /></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2.5">
                    <Label className="font-bold text-slate-800">Space tier</Label>
                    <Select value={formData.spaceType || ""} onValueChange={(v) => setFormData({ ...formData, spaceType: v as any })}>
                      <SelectTrigger className="h-12 rounded-xl border-slate-200"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl shadow-xl">
                        <SelectItem value="LOW">Low Tier</SelectItem>
                        <SelectItem value="MEDIUM">Medium Tier</SelectItem>
                        <SelectItem value="HIGH">High Tier</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2.5">
                    <Label className="font-bold text-slate-800">Account status</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as any })}>
                      <SelectTrigger className="h-12 rounded-xl border-slate-200"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl shadow-xl">
                        <SelectItem value="ACTIVE" className="text-green-600 font-bold">Active</SelectItem>
                        <SelectItem value="INACTIVE" className="text-amber-600 font-bold">Inactive</SelectItem>
                        <SelectItem value="SUSPENDED" className="text-red-600 font-bold">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="contact" className="space-y-8 mt-4 outline-none">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2.5"><Label className="font-bold text-slate-800">Primary email</Label><Input type="email" value={formData.contactEmail} onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })} className="h-12 rounded-xl border-slate-200" /></div>
                  <div className="space-y-2.5"><Label className="font-bold text-slate-800">Phone number</Label><Input value={formData.contactMsisdn} onChange={(e) => setFormData({ ...formData, contactMsisdn: e.target.value })} className="h-12 rounded-xl border-slate-200" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2.5"><Label className="font-bold text-slate-800">Official domain</Label><Input value={formData.domain} onChange={(e) => setFormData({ ...formData, domain: e.target.value })} className="h-12 rounded-xl border-slate-200" /></div>
                  <div className="space-y-2.5"><Label className="font-bold text-slate-800">Website URL</Label><Input value={formData.webUrl} onChange={(e) => setFormData({ ...formData, webUrl: e.target.value })} className="h-12 rounded-xl border-slate-200" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2.5"><Label className="font-bold text-slate-800">Alternate email</Label><Input type="email" value={formData.alternateEmail} onChange={(e) => setFormData({ ...formData, alternateEmail: e.target.value })} className="h-12 rounded-xl border-slate-200" /></div>
                  <div className="space-y-2.5"><Label className="font-bold text-slate-800">Logo URL</Label><Input value={formData.logoUrl} onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })} className="h-12 rounded-xl border-slate-200" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2.5"><Label className="font-bold text-slate-800">Status reason</Label><Input value={formData.statusReason} onChange={(e) => setFormData({ ...formData, statusReason: e.target.value })} className="h-12 rounded-xl border-slate-200" placeholder="Required if not active" /></div>
                  <div className="space-y-2.5"><Label className="font-bold text-slate-800">Country ID</Label><Input type="number" value={formData.countryId} onChange={(e) => setFormData({ ...formData, countryId: e.target.value })} className="h-12 rounded-xl border-slate-200" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2.5"><Label className="font-bold text-slate-800">Type ID</Label><Input type="number" value={formData.typeId} onChange={(e) => setFormData({ ...formData, typeId: e.target.value })} className="h-12 rounded-xl border-slate-200" /></div>
                  <div className="space-y-2.5"><Label className="font-bold text-slate-800">Project ID</Label><Input type="number" value={formData.projectId} onChange={(e) => setFormData({ ...formData, projectId: e.target.value })} className="h-12 rounded-xl border-slate-200" /></div>
                  <div className="space-y-2.5"><Label className="font-bold text-slate-800">Group ID</Label><Input type="number" value={formData.groupId} onChange={(e) => setFormData({ ...formData, groupId: e.target.value })} className="h-12 rounded-xl border-slate-200" /></div>
                </div>
              </TabsContent>
            </Tabs>
          </ScrollArea>

          <DialogFooter className="p-10 pt-4 flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)} className="h-12 rounded-2xl px-8 font-bold bg-slate-50 text-slate-600">Discard changes</Button>
            <Button 
              className="bg-[#8B5CF6] hover:bg-[#7C3AED] h-12 rounded-2xl px-10 font-black text-white shadow-lg shadow-violet-500/20" 
              onClick={handleEditOrg} 
              disabled={updateOrgMutation.isPending}
            >
              {updateOrgMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
              Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-[2rem] p-10 border-none shadow-2xl bg-white">
          <DialogHeader>
            <div className="h-16 w-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-6">
              <Trash2 className="h-8 w-8" />
            </div>
            <DialogTitle className="text-3xl font-black text-slate-900">
              Terminate account
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium text-lg mt-2 leading-relaxed">
              Are you sure you want to delete <span className="text-slate-900 font-bold">{selectedOrg?.name}</span>? This will permanently remove all associated data and access.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row gap-3 mt-10">
            <Button variant="ghost" onClick={() => setIsDeleteDialogOpen(false)} className="flex-1 h-12 rounded-2xl font-bold bg-slate-50 text-slate-600">Keep account</Button>
            <Button 
              onClick={handleDeleteOrg} 
              disabled={removeOrgMutation.isPending}
              className="flex-1 h-12 rounded-2xl font-black bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20" 
            >
              {removeOrgMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Confirm Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OrganizationRow({ org, onEdit, onDelete }: { org: OrganizationDto; onEdit: (org: OrganizationDto) => void; onDelete: (org: OrganizationDto) => void }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const { data: subAccountsResp, isLoading: isLoadingSubs } = useGetSubAccounts(org.id, { limit: 5 });
  const subAccounts = subAccountsResp?.data || [];
  
  const enableMutation = useEnableSubAccount(org.id);
  const disableMutation = useDisableSubAccount(org.id);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE": return <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>;
      case "SUSPENDED": return <Badge className="bg-red-100 text-red-700 border-red-200">Suspended</Badge>;
      case "INACTIVE": return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Inactive</Badge>;
      default: return <Badge variant="outline">{status || "unknown"}</Badge>;
    }
  };

  return (
    <React.Fragment>
      <TableRow className={cn("hover:bg-slate-50/50 transition-colors group cursor-pointer", isOpen && "bg-slate-50/50 border-b-0")} onClick={() => setIsOpen(!isOpen)}>
        <TableCell>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-all duration-300">
              {org.logoUrl ? (
                <img src={org.logoUrl} alt={org.name} className="h-full w-full object-cover rounded-xl" />
              ) : (
                <Building2 className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="font-bold text-slate-900 flex items-center gap-2">
                {org.name}
                <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform duration-200", isOpen && "rotate-180")} />
              </div>
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">{org.code || 'NO-CODE'}</div>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Mail className="h-3 w-3" /> {org.contactEmail || '-'}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Phone className="h-3 w-3" /> {org.contactMsisdn || '-'}
            </div>
          </div>
        </TableCell>
        <TableCell>
          <div className="text-sm text-slate-700">{org.city || '-'}</div>
          <div className="text-[10px] text-slate-400">{org.country?.name || '-'}</div>
        </TableCell>
        <TableCell>
          <div className="flex flex-col gap-1">
            <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none font-medium w-fit">
              {org.type?.name || 'General'}
            </Badge>
            {subAccountsResp && (
              <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-md w-fit">
                {subAccountsResp.total} users
              </span>
            )}
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <CalendarDays className="h-3 w-3" />
            {formatDate(org.createdAt)}
          </div>
        </TableCell>
        <TableCell>{getStatusBadge(String(org.status))}</TableCell>
        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-violet-50 hover:text-violet-600">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl border-slate-200">
              <DropdownMenuLabel>Provider Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEdit(org)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit Details
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-600 focus:text-red-700" onClick={() => onDelete(org)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete Account
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
      
      {isOpen && (
        <TableRow className="bg-slate-50/30 hover:bg-slate-50/30">
          <TableCell colSpan={7} className="p-0 border-b-2 border-slate-100">
            <div className="p-6 pl-20 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <Users className="h-4 w-4 text-violet-500" />
                  Sub-Accounts (Users)
                </h4>
                <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs font-bold border-slate-200">
                  <UserPlus2 className="h-3.5 w-3.5 mr-1.5" /> Invite User
                </Button>
              </div>
              
              {isLoadingSubs ? (
                <div className="flex items-center gap-2 py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-violet-600" />
                  <span className="text-xs text-slate-500">Loading users...</span>
                </div>
              ) : subAccounts.length === 0 ? (
                <div className="py-8 text-center bg-white rounded-xl border border-dashed border-slate-200">
                  <UserIcon className="h-8 w-8 mx-auto mb-2 text-slate-200" />
                  <p className="text-xs text-slate-500">No sub-accounts found for this provider</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {subAccounts.map((sub) => (
                    <div key={sub.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between group/user">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs uppercase">
                          {sub.user?.firstName?.[0]}{sub.user?.lastName?.[0]}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900 line-clamp-1">{sub.user?.firstName} {sub.user?.lastName}</div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Badge className={cn("text-[8px] h-3 px-1 border-none", 
                              sub.status === 'ACTIVE' ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500")}>
                              {sub.status}
                            </Badge>
                            • {sub.revenueSharePercentage}% Share
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover/user:opacity-100 transition-opacity">
                        {sub.status === 'ACTIVE' ? (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-amber-500 hover:bg-amber-50" 
                            onClick={(e) => { e.stopPropagation(); disableMutation.mutate(sub.id); }}
                            disabled={disableMutation.isPending}
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-green-600 hover:bg-green-50" 
                            onClick={(e) => { e.stopPropagation(); enableMutation.mutate(sub.id); }}
                            disabled={enableMutation.isPending}
                          >
                            <UserCheck className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </React.Fragment>
  );
}
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGetOrganizationRoles, useAddOrganizationRole, useUpdateOrganizationRole, useDeleteOrganizationRole } from "@/lib/generated/user/organization-roles/organization-roles";
import { useGetPermissions } from "@/lib/generated/user/permissions/permissions";
import { useGetPermissionGroups } from "@/lib/generated/user/permission-groups/permission-groups";
import { Shield, Plus, Search, MoreHorizontal, Pencil, Trash2, Loader2, Key, CheckCircle2, Layers, Filter, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { OrganizationRole } from "@/lib/generated/user/models/organizationRole";
import type { Permission } from "@/lib/generated/user/models/permission";
import type { PermissionGroup } from "@/lib/generated/user/models/permissionGroup";

type PermissionItem = Permission & { description?: string | null };

export default function AdminRolesPage() {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [selectedRole, setSelectedRole] = React.useState<OrganizationRole | null>(null);
  const [formData, setFormData] = React.useState({ name: "", code: "", description: "", active: true, permissions: [] as string[] });

  // Queries
  const { data: rolesData, isLoading, refetch } = useGetOrganizationRoles({ limit: 100 });
  const { data: permissionsData } = useGetPermissions({ limit: 1000 });
  const { data: permissionGroupsData } = useGetPermissionGroups({ limit: 100 });

  // Mutations
  const addRoleMutation = useAddOrganizationRole();
  const updateRoleMutation = useUpdateOrganizationRole();
  const deleteRoleMutation = useDeleteOrganizationRole();

  const roles = React.useMemo(() => (Array.isArray(rolesData?.data) ? rolesData.data : []), [rolesData?.data]);
  const permissions: PermissionItem[] = React.useMemo(() => (Array.isArray(permissionsData?.data) ? (permissionsData.data as PermissionItem[]) : []), [permissionsData?.data]);
  const permissionGroups = React.useMemo(() => (Array.isArray(permissionGroupsData?.data) ? permissionGroupsData.data : []), [permissionGroupsData?.data]);

  const filteredRoles = roles.filter((role: OrganizationRole) => String(role.name || "").toLowerCase().includes(searchTerm.toLowerCase()));

  // Permissions Reference State & Calculations
  const [permissionSearchTerm, setPermissionSearchTerm] = React.useState("");
  const [selectedGroupFilter, setSelectedGroupFilter] = React.useState<string>("ALL");

  const groupMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    permissionGroups.forEach((g: PermissionGroup) => {
      map[String(g.id)] = String(g.name);
    });
    return map;
  }, [permissionGroups]);

  const rolesByPermissionCode = React.useMemo(() => {
    const map: Record<string, OrganizationRole[]> = {};
    roles.forEach((role: OrganizationRole) => {
      if (!role.permissions || !Array.isArray(role.permissions)) return;
      role.permissions.forEach((p: string | { code?: string }) => {
        const code = typeof p === "string" ? p : p?.code;
        if (!code) return;
        if (!map[code]) map[code] = [];
        map[code].push(role);
      });
    });
    return map;
  }, [roles]);

  const groupCounts = React.useMemo(() => {
    const counts: Record<string, number> = { ALL: permissions.length };
    let ungrouped = 0;
    permissions.forEach((p: Permission) => {
      if (p.groupId) {
        counts[String(p.groupId)] = (counts[String(p.groupId)] || 0) + 1;
      } else {
        ungrouped++;
      }
    });
    counts.UNGROUPED = ungrouped;
    return counts;
  }, [permissions]);

  const filteredPermissions = React.useMemo(() => {
    return permissions.filter((p: PermissionItem) => {
      const nameMatch = String(p.name || "").toLowerCase().includes(permissionSearchTerm.toLowerCase());
      const codeMatch = String(p.code || "").toLowerCase().includes(permissionSearchTerm.toLowerCase());
      const descMatch = String(p.description || "").toLowerCase().includes(permissionSearchTerm.toLowerCase());
      const matchesSearch = nameMatch || codeMatch || descMatch;

      if (!matchesSearch) return false;

      if (selectedGroupFilter !== "ALL") {
        if (selectedGroupFilter === "UNGROUPED") {
          return !p.groupId;
        }
        return String(p.groupId) === selectedGroupFilter;
      }

      return true;
    });
  }, [permissions, permissionSearchTerm, selectedGroupFilter]);

  const handleAddRole = async () => {
    try {
      await addRoleMutation.mutateAsync({ 
        data: { 
          name: formData.name, 
          code: formData.code || formData.name.toUpperCase().replace(/\s+/g, "_"), 
          organizationTypeId: 1, 
          active: formData.active, 
          permissions: formData.permissions 
        } 
      });
      toast.success("Role created successfully");
      setIsAddDialogOpen(false);
      resetForm();
      refetch();
    } catch { 
      toast.error("Failed to create role"); 
    }
  };

  const handleEditRole = async () => {
    if (!selectedRole) return;
    try {
      await updateRoleMutation.mutateAsync({ 
        id: String(selectedRole.id), 
        data: { 
          name: formData.name, 
          active: formData.active,
          permissions: formData.permissions
        } 
      });
      toast.success("Role updated successfully");
      setIsEditDialogOpen(false);
      resetForm();
      refetch();
    } catch { 
      toast.error("Failed to update role"); 
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRole) return;
    try {
      await deleteRoleMutation.mutateAsync({ id: String(selectedRole.id) });
      toast.success("Role deleted successfully");
      setIsDeleteDialogOpen(false);
      setSelectedRole(null);
      refetch();
    } catch { 
      toast.error("Failed to delete role"); 
    }
  };

  const resetForm = () => { 
    setFormData({ name: "", code: "", description: "", active: true, permissions: [] }); 
    setSelectedRole(null); 
  };

  const openEditDialog = (role: OrganizationRole) => { 
    setSelectedRole(role); 
    setFormData({ 
      name: String(role.name || ""), 
      code: String(role.code || ""), 
      description: "", 
      active: typeof role.active === 'boolean' ? role.active : true,
      permissions: Array.isArray(role.permissions)
        ? role.permissions.map((p: string | { code?: string }) => (typeof p === "string" ? p : p.code || ""))
        : []
    }); 
    setIsEditDialogOpen(true); 
  };

  const openDeleteDialog = (role: OrganizationRole) => { 
    setSelectedRole(role); 
    setIsDeleteDialogOpen(true); 
  };

  const togglePermission = (code: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(code)
        ? prev.permissions.filter(c => c !== code)
        : [...prev.permissions, code]
    }));
  };

  const renderPermissionsSection = () => {
    if (!permissions.length) return <p className="text-sm text-slate-500 p-4 border rounded-md bg-slate-50 text-center">No permissions loaded.</p>;
  
    const grouped: Record<string, PermissionItem[]> = {};
    const ungrouped: PermissionItem[] = [];
  
    permissions.forEach((p: PermissionItem) => {
      if (p.groupId) {
        if (!grouped[String(p.groupId)]) grouped[String(p.groupId)] = [];
        grouped[String(p.groupId)].push(p);
      } else {
        ungrouped.push(p);
      }
    });
  
    return (
      <div className="space-y-2 mt-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold text-slate-900">Permissions</Label>
          <Badge variant="secondary" className="font-mono">{formData.permissions.length} selected</Badge>
        </div>
        <ScrollArea className="h-[350px] w-full rounded-xl border border-slate-200 p-4 bg-slate-50/50">
          <div className="space-y-8">
            {permissionGroups.map((group: PermissionGroup) => {
              const groupPerms = grouped[String(group.id)] || [];
              if (groupPerms.length === 0) return null;
              return (
                <div key={String(group.id)} className="space-y-4">
                  <h4 className="font-bold text-sm tracking-wide uppercase text-slate-500 border-b border-slate-200 pb-2">{String(group.name)}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groupPerms.map(p => (
                      <div key={String(p.code)} className="flex items-start space-x-3">
                        <Checkbox
                          id={String(p.code)}
                          checked={formData.permissions.includes(String(p.code))}
                          onCheckedChange={() => togglePermission(String(p.code))}
                          className="mt-1"
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label htmlFor={String(p.code)} className="text-sm font-medium leading-none cursor-pointer text-slate-800">
                            {String(p.name || p.code)}
                          </label>
                          {p.description && <p className="text-xs text-slate-500 leading-snug">{String(p.description)}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {ungrouped.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-bold text-sm tracking-wide uppercase text-slate-500 border-b border-slate-200 pb-2">Other Permissions</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ungrouped.map(p => (
                    <div key={String(p.code)} className="flex items-start space-x-3">
                      <Checkbox
                        id={String(p.code)}
                        checked={formData.permissions.includes(String(p.code))}
                        onCheckedChange={() => togglePermission(String(p.code))}
                        className="mt-1"
                      />
                      <div className="grid gap-1.5 leading-none">
                        <label htmlFor={String(p.code)} className="text-sm font-medium leading-none cursor-pointer text-slate-800">
                          {String(p.name || p.code)}
                        </label>
                        {p.description && <p className="text-xs text-slate-500 leading-snug">{String(p.description)}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Roles & Permissions</h1>
          <p className="text-slate-500">Manage organizational roles, fine-grained access capabilities, and system permissions</p>
        </div>
      </div>

      <Tabs defaultValue="roles" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-3">
          <TabsList className="bg-slate-100 p-1 rounded-2xl h-12 inline-flex items-center">
            <TabsTrigger
              value="roles"
              className="rounded-xl px-5 py-2 font-bold text-sm data-[state=active]:bg-white data-[state=active]:text-violet-700 data-[state=active]:shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <Shield className="h-4 w-4" />
              <span>Organization Roles</span>
              <Badge variant="secondary" className="ml-1 bg-slate-200/70 text-slate-700 font-bold px-2 py-0.5 rounded-full text-xs">
                {roles.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="permissions"
              className="rounded-xl px-5 py-2 font-bold text-sm data-[state=active]:bg-white data-[state=active]:text-violet-700 data-[state=active]:shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <Key className="h-4 w-4" />
              <span>System Permissions Reference</span>
              <Badge variant="secondary" className="ml-1 bg-slate-200/70 text-slate-700 font-bold px-2 py-0.5 rounded-full text-xs">
                {permissions.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white shadow-lg shadow-violet-500/20 h-11 px-6 rounded-xl font-black text-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
                <Plus className="mr-2 h-4 w-4 stroke-[3px]" />
                Add Role
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl rounded-[2rem] p-0 border-none shadow-2xl overflow-hidden bg-white">
              <div className="p-10 pb-0">
                <DialogHeader>
                  <DialogTitle className="text-3xl font-black text-slate-900">
                    New role
                  </DialogTitle>
                  <DialogDescription className="text-slate-500 font-medium text-base mt-2">
                    Create a new role and assign its capabilities.
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="p-10 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-800">Role name</Label>
                    <Input className="h-12 rounded-xl border-slate-200" placeholder="Eg: Platform Admin" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold text-slate-800">Code (optional)</Label>
                    <Input className="h-12 rounded-xl border-slate-200 bg-slate-50 font-mono uppercase" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="Auto-generated" />
                  </div>
                </div>
                {renderPermissionsSection()}
              </div>

              <DialogFooter className="p-10 pt-0 flex items-center justify-end gap-3">
                <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)} className="h-12 rounded-2xl px-8 font-bold bg-slate-50 text-slate-600">Cancel</Button>
                <Button className="bg-[#8B5CF6] hover:bg-[#7C3AED] h-12 rounded-2xl px-10 font-black text-white shadow-lg shadow-violet-500/20" onClick={handleAddRole} disabled={addRoleMutation.isPending || !formData.name}>
                  {addRoleMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                  Create Role
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* TAB 1: ROLES TABLE */}
        <TabsContent value="roles" className="space-y-6 mt-0">
          <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-4 border-b border-slate-100 bg-white">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <Input 
                  placeholder="Search roles by name..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="pl-10 h-12 rounded-xl bg-slate-50 border-transparent focus-visible:ring-violet-500 focus-visible:border-violet-500 text-base" 
                />
              </div>
            </CardContent>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-bold text-slate-700 h-12 pl-6">Role Name</TableHead>
                      <TableHead className="font-bold text-slate-700 h-12">Code</TableHead>
                      <TableHead className="font-bold text-slate-700 h-12">Status</TableHead>
                      <TableHead className="font-bold text-slate-700 h-12">Created</TableHead>
                      <TableHead className="text-right font-bold text-slate-700 h-12 pr-6 w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRoles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                          <Shield className="h-12 w-12 mx-auto mb-3 text-slate-200" />
                          <p className="text-lg font-medium text-slate-600">No roles found</p>
                          <p className="text-sm">Try adjusting your search query.</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRoles.map((role: OrganizationRole, index: number) => (
                        <TableRow key={String(role.id || index)} className="hover:bg-slate-50/50">
                          <TableCell className="pl-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
                                <Shield className="h-5 w-5" />
                              </div>
                              <div>
                                <div className="font-bold text-slate-900">{String(role.name || '-')}</div>
                                {role.permissions && Array.isArray(role.permissions) && (
                                  <div className="text-xs text-slate-500 mt-0.5">{role.permissions.length} permissions</div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="rounded bg-slate-100 text-slate-600 px-2 py-1 text-xs font-mono font-medium tracking-wide">
                              {String(role.code || '-')}
                            </code>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={role.active === true ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-600 border-slate-200"}>
                              {role.active === true ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-600 text-sm font-medium">
                            {role.createdAt ? new Date(String(role.createdAt)).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell className="pr-6 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-100">
                                  <MoreHorizontal className="h-4 w-4 text-slate-600" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40 rounded-xl shadow-lg border-slate-100">
                                <DropdownMenuLabel className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => openEditDialog(role)} className="cursor-pointer font-medium">
                                  <Pencil className="mr-2 h-4 w-4 text-slate-500" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600 cursor-pointer font-medium focus:bg-red-50 focus:text-red-700" onClick={() => openDeleteDialog(role)}>
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: SYSTEM PERMISSIONS REFERENCE */}
        <TabsContent value="permissions" className="space-y-6 mt-0">
          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="rounded-2xl border-slate-200/80 shadow-sm bg-white p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
                  <Key className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Permissions</p>
                  <p className="text-2xl font-black text-slate-900">{permissions.length}</p>
                </div>
              </div>
            </Card>

            <Card className="rounded-2xl border-slate-200/80 shadow-sm bg-white p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Permission Groups</p>
                  <p className="text-2xl font-black text-slate-900">{permissionGroups.length}</p>
                </div>
              </div>
            </Card>

            <Card className="rounded-2xl border-slate-200/80 shadow-sm bg-white p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Configured Roles</p>
                  <p className="text-2xl font-black text-slate-900">{roles.length}</p>
                </div>
              </div>
            </Card>

            <Card className="rounded-2xl border-slate-200/80 shadow-sm bg-white p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Assignments</p>
                  <p className="text-2xl font-black text-slate-900">
                    {Object.keys(rolesByPermissionCode).length}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Filter Bar */}
          <Card className="rounded-2xl border-slate-200 shadow-sm p-4 bg-white space-y-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search permissions by name, code or description..."
                value={permissionSearchTerm}
                onChange={(e) => setPermissionSearchTerm(e.target.value)}
                className="pl-10 h-11 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-violet-500 text-sm"
              />
              {permissionSearchTerm && (
                <button
                  type="button"
                  onClick={() => setPermissionSearchTerm("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Group Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
                <Filter className="h-3.5 w-3.5" /> Group:
              </span>
              <button
                type="button"
                onClick={() => setSelectedGroupFilter("ALL")}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer",
                  selectedGroupFilter === "ALL"
                    ? "bg-violet-600 text-white shadow-sm shadow-violet-500/20"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                )}
              >
                All Groups
                <span className={cn(
                  "px-1.5 py-0.5 rounded-full text-[10px]",
                  selectedGroupFilter === "ALL" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                )}>
                  {permissions.length}
                </span>
              </button>
              {permissionGroups.map((group: PermissionGroup) => {
                const count = groupCounts[String(group.id)] || 0;
                const isSelected = selectedGroupFilter === String(group.id);
                return (
                  <button
                    key={String(group.id)}
                    type="button"
                    onClick={() => setSelectedGroupFilter(String(group.id))}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer",
                      isSelected
                        ? "bg-violet-600 text-white shadow-sm shadow-violet-500/20"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                    )}
                  >
                    {String(group.name)}
                    <span className={cn(
                      "px-1.5 py-0.5 rounded-full text-[10px]",
                      isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                    )}>
                      {count}
                    </span>
                  </button>
                );
              })}
              {groupCounts.UNGROUPED > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedGroupFilter("UNGROUPED")}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer",
                    selectedGroupFilter === "UNGROUPED"
                      ? "bg-violet-600 text-white shadow-sm shadow-violet-500/20"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                  )}
                >
                  Ungrouped
                  <span className={cn(
                    "px-1.5 py-0.5 rounded-full text-[10px]",
                    selectedGroupFilter === "UNGROUPED" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                  )}>
                    {groupCounts.UNGROUPED}
                  </span>
                </button>
              )}
            </div>
          </Card>

          {/* Permissions Grid */}
          {filteredPermissions.length === 0 ? (
            <Card className="rounded-2xl border-slate-200 shadow-sm p-12 text-center bg-white">
              <Key className="h-12 w-12 mx-auto mb-3 text-slate-200" />
              <p className="text-lg font-bold text-slate-700">No permissions found</p>
              <p className="text-sm text-slate-500 mt-1">No permissions match your search query or group filter.</p>
              <Button
                variant="outline"
                onClick={() => {
                  setPermissionSearchTerm("");
                  setSelectedGroupFilter("ALL");
                }}
                className="mt-4 rounded-xl font-bold"
              >
                Reset Filters
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPermissions.map((permission: PermissionItem) => {
                const groupName = permission.groupId ? groupMap[String(permission.groupId)] : null;
                const assigned = rolesByPermissionCode[permission.code] || [];
                return (
                  <Card
                    key={permission.code}
                    className="rounded-2xl border-slate-200/90 shadow-sm bg-white hover:border-violet-200 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <CardHeader className="pb-3 pt-5 px-5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <CardTitle className="text-base font-bold text-slate-900 leading-snug">
                            {permission.name || permission.code}
                          </CardTitle>
                          {groupName ? (
                            <Badge variant="outline" className="text-[11px] font-semibold bg-violet-50 text-violet-700 border-violet-100">
                              {groupName}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[11px] font-medium bg-slate-50 text-slate-500 border-slate-200">
                              General
                            </Badge>
                          )}
                        </div>
                        {permission.isDefault && (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold shrink-0">
                            Default
                          </Badge>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="px-5 pb-5 pt-0 space-y-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        <code className="rounded-lg bg-slate-100 text-slate-700 px-2.5 py-1 text-xs font-mono font-semibold tracking-wide inline-block break-all">
                          {permission.code}
                        </code>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          {permission.description || `Grants authorization to execute operations covered by ${permission.code}.`}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-400 uppercase tracking-wider">
                            Assigned to Roles ({assigned.length})
                          </span>
                        </div>
                        {assigned.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pt-0.5">
                            {assigned.map((role: OrganizationRole) => (
                              <Badge
                                key={String(role.id)}
                                variant="secondary"
                                className="text-[11px] font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-md py-0.5"
                              >
                                {String(role.name || role.code)}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">Not assigned to any role</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl rounded-[2rem] p-0 border-none shadow-2xl overflow-hidden bg-white">
          <div className="p-10 pb-0">
            <DialogHeader>
              <DialogTitle className="text-3xl font-black text-slate-900">
                Edit role
              </DialogTitle>
              <DialogDescription className="text-slate-500 font-medium text-base mt-2">
                Update role details and permissions for <span className="text-violet-600 font-bold">{selectedRole?.name}</span>
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-10 space-y-6">
            <div className="space-y-2">
              <Label className="font-bold text-slate-800">Role name</Label>
              <Input className="h-12 rounded-xl border-slate-200" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            {renderPermissionsSection()}
          </div>

          <DialogFooter className="p-10 pt-0 flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)} className="h-12 rounded-2xl px-8 font-bold bg-slate-50 text-slate-600">Cancel</Button>
            <Button className="bg-[#8B5CF6] hover:bg-[#7C3AED] h-12 rounded-2xl px-10 font-black text-white shadow-lg shadow-violet-500/20" onClick={handleEditRole} disabled={updateRoleMutation.isPending || !formData.name}>
              {updateRoleMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              Save Changes
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
              Delete role
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium text-lg mt-2 leading-relaxed">
              Are you sure you want to delete <span className="text-slate-900 font-bold">{selectedRole?.name}</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row gap-3 mt-10">
            <Button variant="ghost" onClick={() => setIsDeleteDialogOpen(false)} className="flex-1 h-12 rounded-2xl font-bold bg-slate-50 text-slate-600">Keep role</Button>
            <Button 
              onClick={handleDeleteRole} 
              disabled={deleteRoleMutation.isPending}
              className="flex-1 h-12 rounded-2xl font-black bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20" 
            >
              {deleteRoleMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Confirm Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

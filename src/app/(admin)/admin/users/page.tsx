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
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";
import { useGetUsers, useAddUser, useUpdateUser } from "@/lib/generated/user/users/users";
import { useGetUserStatuses } from "@/lib/generated/user/user-statuses/user-statuses";
import { useGetOrganizationRoles } from "@/lib/generated/user/organization-roles/organization-roles";
import { useGetOrganizations } from "@/lib/generated/org/organizations/organizations";
import { useGetOrganizationTypes } from "@/lib/generated/org/organization-types/organization-types";
import { ProfilePicture } from "@/components/ui/profile-picture";
import { UserStatusBadge, type UserStatusValue } from "@/components/ui/status-display";
import { Users, Plus, Search, MoreHorizontal, Pencil, Trash2, UserPlus, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { uploadFileResource } from "@/lib/file-upload";
import type { UserDto } from "@/lib/generated/user/models/userDto";
import type { OrganizationDto as OrgServiceDto } from "@/lib/generated/org/models/organizationDto";

interface TypedStatus {
  code: string;
}
interface TypedRole {
  id: string;
  name: string;
  organizationTypeId: number;
}
interface TypedOrg {
  id: number;
  name: string;
  typeId: number;
}

const PAGE_SIZE = 10;

export default function AdminUsersPage() {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<UserDto | null>(null);
  const [formData, setFormData] = React.useState<{
    firstName: string;
    lastName: string;
    username: string;
    emailAddress: string;
    status: string;
    organizationId: string;
    organizationRoleId: string;
    imageUrl?: string | null;
  }>({
    firstName: "",
    lastName: "",
    username: "",
    emailAddress: "",
    status: "active",
    organizationId: "",
    organizationRoleId: "",
    imageUrl: null,
  });

  const editFileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploadingUserAvatar, setIsUploadingUserAvatar] = React.useState(false);

  const handleUploadUserAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (PNG, JPG, WebP, GIF).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size must be less than 5MB.");
      return;
    }

    try {
      setIsUploadingUserAvatar(true);
      const url = await uploadFileResource(file);
      setFormData(prev => ({ ...prev, imageUrl: url }));
      toast.success("Picture uploaded. Click 'Update Account' to save changes.");
    } catch (err: any) {
      console.error("User avatar upload failed:", err);
      toast.error(err?.message || "Failed to upload picture.");
    } finally {
      setIsUploadingUserAvatar(false);
      if (editFileInputRef.current) editFileInputRef.current.value = "";
    }
  };

  const { data: usersData, isLoading, refetch } = useGetUsers({ limit: PAGE_SIZE, page: currentPage, status: statusFilter || undefined });
  const { data: statusesData } = useGetUserStatuses({});
  const { data: orgTypesData } = useGetOrganizationTypes();
  const platformAdminTypeId = React.useMemo(() => {
    const types = Array.isArray(orgTypesData?.data) ? orgTypesData.data : [];
    return types.find((t) => t.code === "PLATFORM_ADMIN")?.id;
  }, [orgTypesData]);

  const { data: orgsData } = useGetOrganizations(
    { limit: 100, typeId: platformAdminTypeId },
    { query: { enabled: platformAdminTypeId != null } },
  );

  const orgs = Array.isArray(orgsData?.data) ? (orgsData.data as unknown as TypedOrg[]) : [];
  const selectedOrgTypeId = orgs.find((o) => String(o.id) === formData.organizationId)?.typeId;

  const { data: rolesData } = useGetOrganizationRoles(
    selectedOrgTypeId != null ? { organizationTypeId: selectedOrgTypeId } : {},
  );
  const addUserMutation = useAddUser();
  const updateUserMutation = useUpdateUser();

  const users = Array.isArray(usersData?.data) ? usersData.data : [];
  const statuses = Array.isArray(statusesData?.data) ? (statusesData.data as unknown as TypedStatus[]) : [];
  const allRoles = Array.isArray(rolesData?.data) ? (rolesData.data as unknown as TypedRole[]) : [];
  const roles =
    selectedOrgTypeId != null
      ? allRoles.filter((r) => r.organizationTypeId === selectedOrgTypeId)
      : [];

  const filteredUsers = users.filter((user: UserDto) => {
    const matchesSearch = user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.emailAddress?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleAddUser = async () => {
    try {
      await addUserMutation.mutateAsync({
        data: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          username: formData.username,
          emailAddress: formData.emailAddress || null,
          confirmationUrl: `${window.location.origin}/otp-confirmation`,
          organizationId: parseInt(formData.organizationId),
          organizationRoleId: formData.organizationRoleId,
        }
      });
      toast.success("User created successfully");
      setIsAddDialogOpen(false);
      resetForm();
      refetch();
    } catch (error) {
      toast.error("Failed to create user");
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser?.id) return;
    try {
      await updateUserMutation.mutateAsync({
        id: selectedUser.id,
        data: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          emailAddress: formData.emailAddress || null,
          status: formData.status,
          imageUrl: formData.imageUrl,
        }
      });
      toast.success("User updated successfully");
      setIsEditDialogOpen(false);
      resetForm();
      refetch();
    } catch (error) {
      toast.error("Failed to update user");
    }
  };

  const resetForm = () => {
    setFormData({ firstName: "", lastName: "", username: "", emailAddress: "", status: "active", organizationId: "", organizationRoleId: "", imageUrl: null });
    setSelectedUser(null);
  };

  const openEditDialog = (user: UserDto) => {
    setSelectedUser(user);
    setFormData({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      username: user.username || "",
      emailAddress: user.emailAddress || "",
      status: user.status || "active",
      organizationId: String(user.organizationId || ""),
      organizationRoleId: user.organizationRoleId || "",
      imageUrl: user.imageUrl || null,
    });
    setIsEditDialogOpen(true);
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Users</h1>
          <p className="text-slate-500">Manage platform users</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white shadow-lg shadow-violet-500/20 h-11 px-6 rounded-xl font-black text-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
              <UserPlus className="mr-2 h-4 w-4 stroke-[3px]" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl rounded-[2rem] p-0 border-none shadow-2xl overflow-hidden bg-white">
            <div className="p-10 pb-0">
              <DialogHeader>
                <DialogTitle className="text-3xl font-black text-slate-900">
                  New user account
                </DialogTitle>
                <DialogDescription className="text-slate-500 font-medium text-base mt-2">
                  Create a new user account and assign access.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="p-10 space-y-6 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold text-slate-800">First name</Label>
                  <Input className="h-12 rounded-xl border-slate-200" placeholder="Eg: John" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-slate-800">Last name</Label>
                  <Input className="h-12 rounded-xl border-slate-200" placeholder="Eg: Doe" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-slate-800">Username</Label>
                <Input className="h-12 rounded-xl border-slate-200 bg-slate-50 font-mono" placeholder="johndoe" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-slate-800">Email address</Label>
                <Input className="h-12 rounded-xl border-slate-200" type="email" placeholder="john@example.com" value={formData.emailAddress} onChange={(e) => setFormData({ ...formData, emailAddress: e.target.value })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="font-bold text-slate-800">Organization</Label>
                  <Select value={formData.organizationId} onValueChange={(v) => setFormData({ ...formData, organizationId: v, organizationRoleId: "" })}>
                    <SelectTrigger className="h-12 rounded-xl border-slate-200"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent className="rounded-xl shadow-xl">
                      {orgs.map((org) => (<SelectItem key={org.id} value={String(org.id)}>{org.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-slate-800">System Role</Label>
                  <Select value={formData.organizationRoleId} onValueChange={(v) => setFormData({ ...formData, organizationRoleId: v })} disabled={!formData.organizationId}>
                    <SelectTrigger className="h-12 rounded-xl border-slate-200"><SelectValue placeholder={formData.organizationId ? "Select" : "Select organization first"} /></SelectTrigger>
                    <SelectContent className="rounded-xl shadow-xl">
                      {roles.map((role) => (<SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter className="p-10 pt-0 flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)} className="h-12 rounded-2xl px-8 font-bold bg-slate-50 text-slate-600">Cancel</Button>
              <Button className="bg-[#8B5CF6] hover:bg-[#7C3AED] h-12 rounded-2xl px-10 font-black text-white shadow-lg shadow-violet-500/20" onClick={handleAddUser} disabled={addUserMutation.isPending}>
                {addUserMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                Create User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input placeholder="Search users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statuses.map((s) => (<SelectItem key={s.code} value={s.code}>{s.code}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>All Users</CardTitle><CardDescription>{filteredUsers.length} users found</CardDescription></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-violet-600" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[70px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500"><Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />No users found</TableCell></TableRow>
                  ) : filteredUsers.map((user: UserDto) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <ProfilePicture
                            src={user.imageUrl}
                            firstName={user.firstName}
                            lastName={user.lastName}
                            email={user.emailAddress}
                            size="default"
                          />
                          <div>
                            <div className="font-medium">{user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}</div>
                            <div className="text-sm text-slate-500">@{user.username}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.emailAddress || '-'}</TableCell>
                      <TableCell>{((user.organization as unknown) as OrgServiceDto | undefined)?.name || '-'}</TableCell>
                      <TableCell>{user.organizationRole?.name || '-'}</TableCell>
                      <TableCell><UserStatusBadge status={user.status as UserStatusValue} /></TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openEditDialog(user)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-xl rounded-[2rem] p-0 border-none shadow-2xl overflow-hidden bg-white">
          <div className="p-10 pb-0">
            <DialogHeader>
              <DialogTitle className="text-3xl font-black text-slate-900">
                Edit user details
              </DialogTitle>
              <DialogDescription className="text-slate-500 font-medium text-base mt-2">
                Update account information for <span className="text-violet-600 font-bold">@{formData.username}</span>
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-10 space-y-6">
            {/* User Profile Picture in Edit Dialog */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <ProfilePicture
                src={formData.imageUrl}
                firstName={formData.firstName}
                lastName={formData.lastName}
                email={formData.emailAddress}
                size="lg"
                className="rounded-xl shadow-xs"
              />
              <div className="space-y-1">
                <input
                  type="file"
                  ref={editFileInputRef}
                  onChange={handleUploadUserAvatar}
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => editFileInputRef.current?.click()}
                    disabled={isUploadingUserAvatar}
                    className="h-8 rounded-lg text-xs font-semibold"
                  >
                    {isUploadingUserAvatar ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1.5 text-violet-600" />
                    ) : (
                      <Upload className="w-3 h-3 mr-1.5" />
                    )}
                    {formData.imageUrl ? "Change photo" : "Upload photo"}
                  </Button>
                  {formData.imageUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, imageUrl: null }))}
                      disabled={isUploadingUserAvatar}
                      className="h-8 rounded-lg text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">PNG, JPG, WebP up to 5MB.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold text-slate-800">First name</Label>
                <Input className="h-12 rounded-xl border-slate-200" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-slate-800">Last name</Label>
                <Input className="h-12 rounded-xl border-slate-200" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-slate-800">Email address</Label>
              <Input className="h-12 rounded-xl border-slate-200" type="email" value={formData.emailAddress} onChange={(e) => setFormData({ ...formData, emailAddress: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-slate-800">Account status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger className="h-12 rounded-xl border-slate-200"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl shadow-xl">
                  {statuses.map((s) => (<SelectItem key={s.code} value={s.code} className="capitalize">{s.code}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="p-10 pt-0 flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)} className="h-12 rounded-2xl px-8 font-bold bg-slate-50 text-slate-600">Cancel</Button>
            <Button className="bg-[#8B5CF6] hover:bg-[#7C3AED] h-12 rounded-2xl px-10 font-black text-white shadow-lg shadow-violet-500/20" onClick={handleEditUser} disabled={updateUserMutation.isPending}>
              {updateUserMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              Update Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

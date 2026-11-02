"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUpdateSelf, useGetSelf, getGetSelfQueryKey } from "@/lib/generated/user/users/users";
import { useUpdateOwnOrganization } from "@/lib/generated/org/organizations/organizations";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { uploadFileResource } from "@/lib/file-upload";
import { ProfilePicture } from "@/components/ui/profile-picture";
import { Settings, Bell, Shield, Save, Loader2, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminSettingsPage() {
  const [formData, setFormData] = React.useState({ siteName: "Kaizen Admin", siteUrl: "https://admin.kaizen-aceit.com", supportEmail: "support@example.com", emailNotifications: true, smsNotifications: false, marketingEmails: true, twoFactorRequired: false, sessionTimeout: "30", passwordExpiry: "90" });
  const { data: userData, isLoading: userLoading, refetch } = useGetSelf();
  const updateSelfMutation = useUpdateSelf();
  const updateOrgMutation = useUpdateOwnOrganization();
  const queryClient = useQueryClient();
  const { user, setUser } = useAuth();

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false);
  const [isRemovingAvatar, setIsRemovingAvatar] = React.useState(false);

  const selfUser = userData?.data || user;
  const avatarUrl = userData?.data?.imageUrl ?? user?.imageUrl;

  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, WebP, GIF).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size must be less than 5MB.");
      return;
    }

    try {
      setIsUploadingAvatar(true);
      const uploadedUrl = await uploadFileResource(file);
      const userEmail = selfUser?.emailAddress || user?.email;
      await updateSelfMutation.mutateAsync({
        data: {
          emailAddress: userEmail,
          firstName: selfUser?.firstName || user?.name?.split(" ")[0],
          lastName: selfUser?.lastName || user?.name?.split(" ")[1],
          imageUrl: uploadedUrl,
        },
      });
      if (user) {
        setUser({ ...user, imageUrl: uploadedUrl });
      }
      await queryClient.invalidateQueries({ queryKey: getGetSelfQueryKey() });
      refetch();
      toast.success("Profile picture updated successfully!");
    } catch (err: any) {
      console.error("Avatar upload failed:", err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to upload profile picture.");
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      setIsRemovingAvatar(true);
      const userEmail = selfUser?.emailAddress || user?.email;
      await updateSelfMutation.mutateAsync({
        data: {
          emailAddress: userEmail,
          firstName: selfUser?.firstName || user?.name?.split(" ")[0],
          lastName: selfUser?.lastName || user?.name?.split(" ")[1],
          imageUrl: null,
        },
      });
      if (user) {
        setUser({ ...user, imageUrl: null });
      }
      await queryClient.invalidateQueries({ queryKey: getGetSelfQueryKey() });
      refetch();
      toast.success("Profile picture removed.");
    } catch (err: any) {
      console.error("Avatar removal failed:", err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to remove profile picture.");
    } finally {
      setIsRemovingAvatar(false);
    }
  };

  React.useEffect(() => {
    const org = userData?.data?.organization;
    if (org) {
      setFormData(prev => ({ ...prev, siteName: String(org.name || prev.siteName) }));
    }
  }, [userData]);

  const handleSave = async () => {
    try {
      const userEmail = selfUser?.emailAddress || user?.email;
      await updateSelfMutation.mutateAsync({
        data: {
          emailAddress: userEmail,
          firstName: formData.siteName,
          lastName: selfUser?.lastName || user?.name?.split(" ")[1],
        },
      });
      toast.success("Settings saved successfully");
    } catch { toast.error("Failed to save settings"); }
  };

  if (userLoading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-violet-600" /></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold text-slate-900">Settings</h1><p className="text-slate-500">Manage platform settings</p></div>
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList><TabsTrigger value="general">General</TabsTrigger><TabsTrigger value="notifications">Notifications</TabsTrigger><TabsTrigger value="security">Security</TabsTrigger></TabsList>
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" />General Settings</CardTitle>
              <CardDescription>Basic platform configuration and profile</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Picture / Avatar Section */}
              <div className="space-y-3 pb-6 border-b border-slate-100">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Profile Picture
                </Label>
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <ProfilePicture
                      src={avatarUrl}
                      firstName={selfUser?.firstName || user?.name?.split(" ")[0]}
                      lastName={selfUser?.lastName || user?.name?.split(" ")[1]}
                      email={selfUser?.emailAddress || user?.email}
                      size="xl"
                      className="rounded-2xl ring-2 ring-slate-200/80 shadow-xs"
                    />
                    {isUploadingAvatar && (
                      <div className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-white" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleUploadAvatar}
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingAvatar || isRemovingAvatar}
                        className="rounded-xl gap-2 font-medium"
                      >
                        {isUploadingAvatar ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-600" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        {avatarUrl ? "Change photo" : "Upload photo"}
                      </Button>

                      {avatarUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveAvatar}
                          disabled={isUploadingAvatar || isRemovingAvatar}
                          className="rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 gap-1.5 font-medium"
                        >
                          {isRemovingAvatar ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          Remove
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      Recommended: square image, PNG, JPG, or WebP up to 5MB.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-2"><Label>Site Name</Label><Input value={formData.siteName} onChange={(e) => setFormData({ ...formData, siteName: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Site URL</Label><Input value={formData.siteUrl} onChange={(e) => setFormData({ ...formData, siteUrl: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Support Email</Label><Input value={formData.supportEmail} onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })} /></div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="notifications"><Card><CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" />Notification Settings</CardTitle><CardDescription>Configure notification preferences</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex items-center justify-between"><div><Label>Email Notifications</Label><p className="text-sm text-slate-500">Send email notifications to users</p></div><Switch checked={formData.emailNotifications} onCheckedChange={(checked) => setFormData({ ...formData, emailNotifications: checked })} /></div><div className="flex items-center justify-between"><div><Label>SMS Notifications</Label><p className="text-sm text-slate-500">Send SMS notifications to users</p></div><Switch checked={formData.smsNotifications} onCheckedChange={(checked) => setFormData({ ...formData, smsNotifications: checked })} /></div><div className="flex items-center justify-between"><div><Label>Marketing Emails</Label><p className="text-sm text-slate-500">Send marketing emails to users</p></div><Switch checked={formData.marketingEmails} onCheckedChange={(checked) => setFormData({ ...formData, marketingEmails: checked })} /></div></CardContent></Card></TabsContent>
        <TabsContent value="security"><Card><CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Security Settings</CardTitle><CardDescription>Configure security options</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex items-center justify-between"><div><Label>Two-Factor Authentication Required</Label><p className="text-sm text-slate-500">Require 2FA for all users</p></div><Switch checked={formData.twoFactorRequired} onCheckedChange={(checked) => setFormData({ ...formData, twoFactorRequired: checked })} /></div><div className="grid gap-2"><Label>Session Timeout (minutes)</Label><Input type="number" value={formData.sessionTimeout} onChange={(e) => setFormData({ ...formData, sessionTimeout: e.target.value })} /></div><div className="grid gap-2"><Label>Password Expiry (days)</Label><Input type="number" value={formData.passwordExpiry} onChange={(e) => setFormData({ ...formData, passwordExpiry: e.target.value })} /></div></CardContent></Card></TabsContent>
      </Tabs>
      <div className="flex justify-end"><Button className="bg-violet-600 hover:bg-violet-700" onClick={handleSave} disabled={updateSelfMutation.isPending}>{updateSelfMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Save className="mr-2 h-4 w-4" />Save Settings</>}</Button></div>
    </div>
  );
}

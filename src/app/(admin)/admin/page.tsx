"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGetUsers, useGetCountReport, useAggregateActiveUsersByDate } from "@/lib/generated/user/users/users";
import { useGetOrganizations } from "@/lib/generated/org/organizations/organizations";
import { useGetOrganizationRoles } from "@/lib/generated/user/organization-roles/organization-roles";
import { Users, Building2, Shield, TrendingUp, Calendar, ArrowUpRight, Activity } from "lucide-react";
import Link from "next/link";

const StatCard = ({ title, value, icon, href, gradient }: { title: string; value: string | number; icon: React.ReactNode; href?: string; gradient?: string }) => (
  <Card className={"relative overflow-hidden " + (gradient ? 'border-0' : '')}>
    {gradient && <div className={"absolute inset-0 " + gradient} />}
    <CardHeader className={"flex flex-row items-center justify-between space-y-0 pb-2 " + (gradient ? 'relative z-10' : '')}>
      <CardTitle className={"text-sm font-medium " + (gradient ? 'text-white/90' : 'text-slate-600')}>{title}</CardTitle>
      <div className={"h-8 w-8 rounded-lg flex items-center justify-center " + (gradient ? 'bg-white/20' : 'bg-violet-100')}>{icon}</div>
    </CardHeader>
    <CardContent className={gradient ? 'relative z-10' : ''}>
      <div className={"text-2xl font-bold " + (gradient ? 'text-white' : 'text-slate-900')}>{value}</div>
      {href && <Link href={href} className={"text-xs flex items-center gap-1 mt-2 hover:underline " + (gradient ? 'text-white/80' : 'text-violet-600')}>View all <ArrowUpRight className="h-3 w-3" /></Link>}
    </CardContent>
  </Card>
);

const LoadingCard = () => (
  <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><div className="h-4 w-24 bg-slate-200 rounded animate-pulse" /><div className="h-8 w-8 bg-slate-200 rounded-lg animate-pulse" /></CardHeader><CardContent><div className="h-8 w-16 bg-slate-200 rounded animate-pulse" /></CardContent></Card>
);

export default function AdminDashboardPage() {
  const { data: usersData, isLoading: usersLoading } = useGetUsers({ limit: 5, excludeDeleted: true });
  const { data: usersCountData } = useGetCountReport({});
  const { data: orgsData, isLoading: orgsLoading } = useGetOrganizations({ limit: 5 });
  const { data: rolesData, isLoading: rolesLoading } = useGetOrganizationRoles({ limit: 1 });
  
  const dateRange = React.useMemo(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    return { start: startDate.toISOString().split('T')[0], end: endDate.toISOString().split('T')[0] };
  }, []);
  
  const { data: activeUsersData } = useAggregateActiveUsersByDate({ 'createdAt.gte': dateRange.start, 'createdAt.lte': dateRange.end });

  const totalUsers = usersCountData?.data?.count ?? 0;
  const totalOrgs = Array.isArray(orgsData?.data) ? orgsData.data.length : 0;
  const totalRoles = Array.isArray(rolesData?.data) ? rolesData.data.length : 0;
  const activeUsers = Array.isArray(activeUsersData?.data) ? activeUsersData.data.reduce((sum: number, item: { count?: number }) => sum + (item.count || 0), 0) : 0;
  const recentUsers = Array.isArray(usersData?.data) ? usersData.data.slice(0, 5) : [];
  const recentOrgs = Array.isArray(orgsData?.data) ? orgsData.data.slice(0, 5) : [];
  const isLoading = usersLoading || orgsLoading || rolesLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div><h1 className="text-3xl font-bold text-slate-900">Dashboard</h1><p className="text-slate-500">Welcome to the KaizenAdmin Admin Portal</p></div>
        <div className="flex items-center gap-2 text-sm text-slate-500"><Calendar className="h-4 w-4" />{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? <><LoadingCard /><LoadingCard /><LoadingCard /><LoadingCard /></> : <>
          <StatCard title="Total Users" value={totalUsers.toLocaleString()} icon={<Users className="h-4 w-4 text-violet-600" />} href="/admin/users" gradient="bg-gradient-to-br from-violet-500 to-purple-600" />
          <StatCard title="Organizations" value={totalOrgs.toLocaleString()} icon={<Building2 className="h-4 w-4 text-blue-600" />} href="/admin/accounts" gradient="bg-gradient-to-br from-blue-500 to-cyan-600" />
          <StatCard title="Active Users (30d)" value={activeUsers.toLocaleString()} icon={<Activity className="h-4 w-4 text-green-600" />} gradient="bg-gradient-to-br from-green-500 to-emerald-600" />
          <StatCard title="Roles" value={totalRoles.toLocaleString()} icon={<Shield className="h-4 w-4 text-orange-600" />} href="/admin/roles" gradient="bg-gradient-to-br from-orange-500 to-amber-600" />
        </>}
      </div>
      <Card><CardHeader><CardTitle className="text-lg">Quick Actions</CardTitle><CardDescription>Common administrative tasks</CardDescription></CardHeader><CardContent>
        <div className="grid gap-2 md:grid-cols-4">
          <Link href="/admin/users"><Button variant="outline" className="w-full justify-start"><Users className="mr-2 h-4 w-4" /> Manage Users</Button></Link>
          <Link href="/admin/accounts"><Button variant="outline" className="w-full justify-start"><Building2 className="mr-2 h-4 w-4" /> View Accounts</Button></Link>
          <Link href="/admin/roles"><Button variant="outline" className="w-full justify-start"><Shield className="mr-2 h-4 w-4" /> Edit Roles</Button></Link>
          <Link href="/admin/settings"><Button variant="outline" className="w-full justify-start"><TrendingUp className="mr-2 h-4 w-4" /> Settings</Button></Link>
        </div>
      </CardContent></Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardHeader className="flex flex-row items-center justify-between"><div><CardTitle className="text-lg">Recent Users</CardTitle><CardDescription>Latest registered users</CardDescription></div><Link href="/admin/users"><Button variant="ghost" size="sm">View All</Button></Link></CardHeader>
          <CardContent>
            {usersLoading ? <div className="space-y-3">{[1, 2, 3].map((i) => (<div key={i} className="flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-slate-200 animate-pulse" /><div className="space-y-1 flex-1"><div className="h-4 w-24 bg-slate-200 rounded animate-pulse" /><div className="h-3 w-32 bg-slate-200 rounded animate-pulse" /></div></div>))}</div>
              : recentUsers.length > 0 ? <div className="space-y-3">{recentUsers.map((user) => (<div key={user.id} className="flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-medium">{(user.firstName?.[0] || user.username?.[0] || '?').toUpperCase()}</div><div className="flex-1 min-w-0"><p className="font-medium text-slate-900 truncate">{user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}</p><p className="text-sm text-slate-500 truncate">{user.emailAddress || 'No email'}</p></div><span className={"text-xs px-2 py-1 rounded-full " + (user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')}>{user.status || 'pending'}</span></div>))}</div>
              : <div className="text-center py-6 text-slate-500"><Users className="h-8 w-8 mx-auto mb-2 text-slate-300" /><p>No users found</p></div>}
          </CardContent>
        </Card>
        <Card><CardHeader className="flex flex-row items-center justify-between"><div><CardTitle className="text-lg">Recent Organizations</CardTitle><CardDescription>Latest registered organizations</CardDescription></div><Link href="/admin/accounts"><Button variant="ghost" size="sm">View All</Button></Link></CardHeader>
          <CardContent>
            {orgsLoading ? <div className="space-y-3">{[1, 2, 3].map((i) => (<div key={i} className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-slate-200 animate-pulse" /><div className="space-y-1 flex-1"><div className="h-4 w-24 bg-slate-200 rounded animate-pulse" /><div className="h-3 w-32 bg-slate-200 rounded animate-pulse" /></div></div>))}</div>
              : recentOrgs.length > 0 ? <div className="space-y-3">{recentOrgs.map((org) => (<div key={org.id} className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600"><Building2 className="h-5 w-5" /></div><div className="flex-1 min-w-0"><p className="font-medium text-slate-900 truncate">{org.name}</p><p className="text-sm text-slate-500 truncate">{org.domain || org.address || 'No details'}</p></div></div>))}</div>
              : <div className="text-center py-6 text-slate-500"><Building2 className="h-8 w-8 mx-auto mb-2 text-slate-300" /><p>No organizations found</p></div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

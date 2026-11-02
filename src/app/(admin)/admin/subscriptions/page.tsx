"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGetOrganizations } from "@/lib/generated/org/organizations/organizations";
import { SubscriptionStatus } from "@/lib/generated/billing/models/subscriptionStatus";
import { CreditCard, Search, Loader2, Eye, Check, X, Sparkles, Building, Users, FileText, Zap, Calendar, TrendingUp, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { useCurrency } from "@/lib/currency";

// Mock subscription data
const mockSubscriptions = [
  { id: "1", orgName: "Acme Corp", plan: "Professional", status: "active", amount: 79, billing: "monthly", users: 18, maxUsers: 25, nextBilling: "2024-02-15", startedAt: "2023-06-15" },
  { id: "2", orgName: "TechStart Inc", plan: "Starter", status: "active", amount: 29, billing: "monthly", users: 3, maxUsers: 5, nextBilling: "2024-02-20", startedAt: "2023-11-01" },
  { id: "3", orgName: "Global Systems", plan: "Enterprise", status: "active", amount: 199, billing: "monthly", users: 45, maxUsers: -1, nextBilling: "2024-02-01", startedAt: "2022-03-10" },
  { id: "4", orgName: "Small Biz", plan: "Starter", status: "past_due", amount: 29, billing: "monthly", users: 4, maxUsers: 5, nextBilling: "2024-01-15", startedAt: "2023-12-01" },
  { id: "5", orgName: "Growth Co", plan: "Professional", status: "trialing", amount: 0, billing: "monthly", users: 8, maxUsers: 25, nextBilling: "2024-02-01", startedAt: "2024-01-18" },
  { id: "6", orgName: "Old Client", plan: "Starter", status: "canceled", amount: 29, billing: "monthly", users: 0, maxUsers: 5, nextBilling: null, startedAt: "2023-01-01" },
];

const planDetails = {
  Starter: { price: 29, color: "bg-slate-500", features: ["5 users", "Basic approvals"] },
  Professional: { price: 79, color: "bg-violet-500", features: ["25 users", "API access"] },
  Enterprise: { price: 199, color: "bg-amber-500", features: ["Unlimited users", "SSO", "24/7 support"] },
};

export default function AdminSubscriptionsPage() {
  const { symbol } = useCurrency();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [selectedSub, setSelectedSub] = React.useState<typeof mockSubscriptions[0] | null>(null);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = React.useState(false);
  const [selectedPlan, setSelectedPlan] = React.useState("");

  const { data: orgsData, isLoading } = useGetOrganizations({ limit: 50 });

  const filteredSubs = mockSubscriptions.filter(sub => {
    const matchesSearch = sub.orgName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.plan.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: mockSubscriptions.length,
    active: mockSubscriptions.filter(s => s.status === "active").length,
    trialing: mockSubscriptions.filter(s => s.status === "trialing").length,
    pastDue: mockSubscriptions.filter(s => s.status === "past_due").length,
    mrr: mockSubscriptions.filter(s => s.status === "active").reduce((sum, s) => sum + s.amount, 0),
  };

  const formatPrice = (amount: string | number, name?: string | null) => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    const itemName = name || "";
    
    // Heuristic: If we are in the admin portal, we usually want GHS for now
    // or we check if the global symbol is something other than $
    let priceSymbol = symbol;
    
    // For this mock data, since Acme and Global are international, maybe USD?
    // But for consistency with the user's request to "REMOVE HARDCODED DOLLAR SIGNS",
    // let's assume GHS is the intended default if symbol is ambiguous.
    if (priceSymbol === "$" || priceSymbol === "USD") {
      priceSymbol = "GHS";
    }

    const isUSD = priceSymbol === "$" || priceSymbol === "USD";
    const spacing = (!isUSD && priceSymbol) ? " " : "";
    
    return `${priceSymbol}${spacing}${numAmount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: React.ElementType; }> = {
      active: { bg: "bg-green-100", text: "text-green-700", icon: CheckCircle },
      trialing: { bg: "bg-blue-100", text: "text-blue-700", icon: Clock },
      past_due: { bg: "bg-red-100", text: "text-red-700", icon: AlertCircle },
      canceled: { bg: "bg-gray-100", text: "text-gray-700", icon: X },
    };
    const style = styles[status] || styles.canceled;
    const Icon = style.icon;
    return (
      <Badge className={`${style.bg} ${style.text} gap-1`}>
        <Icon className="h-3 w-3" />
        {status.replace("_", " ").charAt(0).toUpperCase() + status.replace("_", " ").slice(1)}
      </Badge>
    );
  };

  const handleUpgrade = () => {
    if (!selectedPlan) {
      toast.error("Please select a plan");
      return;
    }
    toast.success(`Subscription upgraded to ${selectedPlan}`);
    setUpgradeDialogOpen(false);
    setSelectedSub(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Subscriptions</h1>
          <p className="text-slate-500">Manage organization subscriptions and billing</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Trialing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.trialing}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Past Due</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.pastDue}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-violet-600">{formatPrice(stats.mrr)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="subscriptions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="plans">Plans Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Subscriptions</CardTitle>
                  <CardDescription>{filteredSubs.length} subscriptions</CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="trialing">Trialing</SelectItem>
                      <SelectItem value="past_due">Past Due</SelectItem>
                      <SelectItem value="canceled">Canceled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Users</TableHead>
                      <TableHead>Next Billing</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                          <CreditCard className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                          No subscriptions found
                        </TableCell>
                      </TableRow>
                    ) : filteredSubs.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br from-violet-500 to-purple-600 text-white font-semibold">
                              {sub.orgName.charAt(0)}
                            </div>
                            <div>
                              <div className="font-medium">{sub.orgName}</div>
                              <div className="text-xs text-slate-500" suppressHydrationWarning>Since {formatDate(sub.startedAt)}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${planDetails[sub.plan as keyof typeof planDetails]?.color || "bg-gray-500"} text-white`}>
                            {sub.plan}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(sub.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 font-medium">
                            {sub.amount > 0 ? `${formatPrice(sub.amount, sub.orgName)}/mo` : "Free Trial"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-slate-400" />
                            <span>{sub.users}</span>
                            {sub.maxUsers > 0 && <span className="text-slate-400">/{sub.maxUsers}</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {sub.nextBilling ? (
                            <span className="text-sm" suppressHydrationWarning>{formatDate(sub.nextBilling)}</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => setSelectedSub(sub)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => { setSelectedSub(sub); setUpgradeDialogOpen(true); }}>
                              Change Plan
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans">
          <div className="grid gap-6 md:grid-cols-3">
            {Object.entries(planDetails).map(([name, details]) => (
              <Card key={name} className={name === "Professional" ? "border-violet-500 shadow-lg" : ""}>
                {name === "Professional" && (
                  <div className="absolute right-3 top-3">
                    <Badge className="bg-violet-100 text-violet-700">
                      <Sparkles className="mr-1 h-3 w-3" />
                      Popular
                    </Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-xl">{name}</CardTitle>
                  <CardDescription>
                    <span className="text-3xl font-bold text-slate-900">{formatPrice(details.price, name)}</span>
                    <span className="text-slate-500">/month</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {details.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>{feature}</span>
                    </div>
                  ))}
                  <div className="pt-4 text-sm text-slate-500">
                    {mockSubscriptions.filter(s => s.plan === name).length} active subscriptions
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedSub && !upgradeDialogOpen} onOpenChange={(open) => { if (!open) setSelectedSub(null); }}>
        <DialogContent className="sm:max-w-lg rounded-[2rem] p-0 border-none shadow-2xl overflow-hidden bg-white">
          <div className="p-10 pb-0">
            <DialogHeader>
              <DialogTitle className="text-3xl font-black text-slate-900">
                Subscription details
              </DialogTitle>
              <DialogDescription className="text-slate-500 font-medium text-base mt-2">
                Managing billing for <span className="text-violet-600 font-bold">{selectedSub?.orgName}</span>
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-10 space-y-8">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-1">
                <Label className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Plan</Label>
                <div className="font-black text-slate-900 text-lg">{selectedSub?.plan}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Status</Label>
                <div>{selectedSub && getStatusBadge(selectedSub.status)}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Amount</Label>
                <div className="font-black text-slate-900 text-lg">{selectedSub && formatPrice(selectedSub.amount, selectedSub.orgName)}/mo</div>
              </div>
              <div className="space-y-1">
                <Label className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Billing cycle</Label>
                <div className="font-black text-slate-900 text-lg capitalize">{selectedSub?.billing}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Users</Label>
                <div className="font-black text-slate-900 text-lg">{selectedSub?.users} <span className="text-slate-300">/</span> {selectedSub?.maxUsers === -1 ? "∞" : selectedSub?.maxUsers}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Started</Label>
                <div className="font-black text-slate-900 text-lg" suppressHydrationWarning>{selectedSub && formatDate(selectedSub.startedAt)}</div>
              </div>
            </div>
            {selectedSub?.nextBilling && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-slate-400" />
                  <span className="text-slate-600 font-bold text-sm">Next billing date</span>
                </div>
                <span className="font-black text-slate-900" suppressHydrationWarning>{formatDate(selectedSub.nextBilling)}</span>
              </div>
            )}
          </div>

          <DialogFooter className="p-10 pt-0 flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setSelectedSub(null)} className="h-12 rounded-2xl px-8 font-bold bg-slate-50 text-slate-600">Close</Button>
            <Button className="bg-[#8B5CF6] hover:bg-[#7C3AED] h-12 rounded-2xl px-8 font-black text-white shadow-lg shadow-violet-500/20" onClick={() => setUpgradeDialogOpen(true)}>
              Change Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-[2rem] p-0 border-none shadow-2xl overflow-hidden bg-white">
          <div className="p-10 pb-0">
            <DialogHeader>
              <DialogTitle className="text-3xl font-black text-slate-900">
                Change plan
              </DialogTitle>
              <DialogDescription className="text-slate-500 font-medium text-base mt-2">
                Select a new billing tier for {selectedSub?.orgName}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-10 space-y-3">
            {Object.entries(planDetails).map(([name, details]) => (
              <button
                key={name}
                onClick={() => setSelectedPlan(name)}
                className={`flex items-center justify-between w-full rounded-2xl border-2 p-4 text-left transition-all duration-300 ${
                  selectedPlan === name 
                    ? "border-[#8B5CF6] bg-violet-50/50 shadow-md scale-[1.02]" 
                    : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                  }`}
              >
                <div>
                  <div className={`font-black text-lg ${selectedPlan === name ? "text-violet-900" : "text-slate-900"}`}>{name}</div>
                  <div className="text-sm font-bold text-slate-500">{formatPrice(details.price, name)}<span className="font-medium">/mo</span></div>
                </div>
                <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  selectedPlan === name ? "border-[#8B5CF6] bg-[#8B5CF6]" : "border-slate-200"
                }`}>
                  {selectedPlan === name && <Check className="h-3 w-3 text-white stroke-[4px]" />}
                </div>
              </button>
            ))}
          </div>

          <DialogFooter className="p-10 pt-0 flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setUpgradeDialogOpen(false)} className="h-12 rounded-2xl px-8 font-bold bg-slate-50 text-slate-600">Cancel</Button>
            <Button className="bg-[#8B5CF6] hover:bg-[#7C3AED] h-12 rounded-2xl px-10 font-black text-white shadow-lg shadow-violet-500/20" onClick={handleUpgrade}>Confirm Change</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
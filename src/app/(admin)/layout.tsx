"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useGetSelf } from "@/lib/generated/user/users/users";
import { cn } from "@/lib/utils";
import { ProfilePicture } from "@/components/ui/profile-picture";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Bell,
  Search,
  LayoutDashboard,
  Users,
  Building2,
  CreditCard,
  Tag,
  Shield,
  Layers,
  Settings,
  LogOut,
  ChevronRight,
  ChevronsUpDown,
  User,
  Percent,
  Wallet,
  FileText,
  Home,
  LayoutGrid,
  UserPlus,
  ClipboardList,
} from "lucide-react";

type NavItem = {
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  href: string;
  isActive?: boolean;
  children?: NavItem[];
};

type NavGroup = {
  title: string;
  items: NavItem[];
  defaultOpen?: boolean;
};

interface AdminShellProps {
  children: React.ReactNode;
};

const NavMenuItem = ({ item }: { item: NavItem }) => {
  const Icon = item.icon;
  const pathname = usePathname();
  const isActive = pathname === item.href || item.isActive;

  if (!item.children || item.children.length === 0) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={isActive} className={cn(
          "h-11 px-4 rounded-xl transition-all duration-200",
          isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-bold" : "text-slate-600 hover:bg-slate-100/50"
        )}>
          <Link href={item.href} className="flex items-center gap-3">
            <Icon className={cn("size-5", isActive ? "text-sidebar-accent-foreground" : "text-slate-400")} strokeWidth={1.5} />
            <span className="text-[15px]">{item.label}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <Collapsible asChild defaultOpen className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton isActive={isActive} className={cn(
            "h-11 px-4 rounded-xl transition-all duration-200",
            isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-bold" : "text-slate-600 hover:bg-slate-100/50"
          )}>
            <div className="flex items-center gap-3 w-full">
              <Icon className={cn("size-5", isActive ? "text-sidebar-accent-foreground" : "text-slate-400")} strokeWidth={1.5} />
              <span className="text-[15px]">{item.label}</span>
              <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </div>
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className="ml-4 border-l border-slate-100 pl-4 mt-1 space-y-1">
            {item.children.map((child) => (
              <SidebarMenuSubItem key={child.label}>
                <SidebarMenuSubButton asChild isActive={pathname === child.href} className={cn(
                  "h-10 px-4 rounded-lg transition-all duration-200",
                  pathname === child.href ? "text-sidebar-accent-foreground font-bold" : "text-slate-500 hover:text-slate-900"
                )}>
                  <Link href={child.href}>{child.label}</Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
};

export default function AdminLayout({ children }: AdminShellProps) {
  const { user, logout, isAuthenticated } = useAuth();
  const { data: selfData } = useGetSelf({
    query: { enabled: isAuthenticated },
  });
  const currentUser = selfData?.data || user;
  const avatarUrl = selfData?.data?.imageUrl ?? user?.imageUrl;
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/login');
    }
  }, [mounted, isAuthenticated, router]);

  const navGroups: NavGroup[] = [
    {
      title: "Navigation",
      defaultOpen: true,
      items: [
        {
          label: "Home",
          icon: Home,
          href: "/admin",
          isActive: pathname === "/admin",
        },
        {
          label: "Subject Areas",
          icon: LayoutGrid,
          href: "/admin/service-categories",
          isActive: pathname?.startsWith("/admin/service-categories"),
        },
        {
          label: "Products / Services",
          icon: Layers,
          href: "/admin/offers",
          isActive: pathname?.startsWith("/admin/offers") || pathname?.startsWith("/admin/discounts") || pathname?.startsWith("/admin/package-templates") || pathname?.startsWith("/admin/product-categories"),
          children: [
            { label: "Offers", icon: Tag, href: "/admin/offers" },
            { label: "Discounts", icon: Percent, href: "/admin/discounts" },
            { label: "Package Templates", icon: Layers, href: "/admin/package-templates" },
            { label: "Product Categories", icon: FileText, href: "/admin/product-categories" },
          ]
        },
        {
          label: "Subscription & Billing",
          icon: FileText,
          href: "/admin/billing",
          isActive: pathname?.startsWith("/admin/billing") || pathname?.startsWith("/admin/payment-config"),
        },
        {
          label: "Users",
          icon: Users,
          href: "/admin/users",
          isActive: pathname?.startsWith("/admin/users") || pathname?.startsWith("/admin/roles"),
        },
        {
          label: "Reports",
          icon: ClipboardList,
          href: "/admin/reports",
          isActive: pathname?.startsWith("/admin/reports"),
        },
      ],
    },
    {
      title: "Account",
      defaultOpen: true,
      items: [
        {
          label: "Organizations",
          icon: Building2,
          href: "/admin/accounts",
          isActive: pathname?.startsWith("/admin/accounts"),
        },
        {
          label: "Settings",
          icon: Settings,
          href: "/admin/settings",
          isActive: pathname?.startsWith("/admin/settings"),
        },
      ],
    },
  ];



  const initials = user?.name?.split(' ').map(n => n[0]).join('') || user?.email?.[0]?.toUpperCase() || '?';

  if (!mounted) {
    return null;
  }

  return (
    <SidebarProvider className="bg-white">
      <Sidebar className="bg-white border-r border-slate-200">
        <SidebarHeader className="bg-white">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" className="hover:bg-transparent" asChild>
                <Link href="/admin" className="flex items-center gap-3">
                  <div className="flex aspect-square size-10 items-center justify-center rounded-xl bg-violet-50 p-1.5 shadow-sm border border-violet-100">
                    <img src="/kaizen-logo.svg" alt="Kaizen" className="h-full w-full object-contain" />
                  </div>
                  <span className="text-xl font-bold tracking-tight text-slate-900">Kaizen Ace It!</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent className="bg-white overflow-hidden">
          <ScrollArea className="min-h-0 flex-1">
            {navGroups.map((group) => (
              <SidebarGroup key={group.title}>
                <SidebarGroupLabel className="text-slate-500">{group.title}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <NavMenuItem key={item.label} item={item} />
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </ScrollArea>
        </SidebarContent>
        <SidebarFooter className="bg-white border-t border-slate-200 hidden">
        </SidebarFooter>

      </Sidebar>
      <SidebarInset className="bg-[#F8FAFC]">
        <header className="flex h-20 shrink-0 items-center gap-4 px-4 md:px-8 bg-white border-b border-slate-100">
          <SidebarTrigger className="-ml-1 text-slate-400 hover:text-violet-600 transition-colors" />
          <div className="h-6 w-px bg-slate-100 mx-2 hidden md:block" />
          
          <div className="flex-1 hidden md:flex items-center max-w-md relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search courses" 
              className="w-full h-11 pl-11 pr-4 rounded-xl bg-slate-50 border-none text-sm focus:ring-2 focus:ring-violet-100 outline-none transition-all"
            />
          </div>

          <div className="flex-1 md:hidden flex items-center gap-2">
            <Link href="/admin" className="flex items-center gap-2">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-violet-50 p-1 border border-violet-100">
                <img src="/kaizen-logo.svg" alt="Kaizen" className="h-full w-full object-contain" />
              </div>
              <span className="font-bold text-slate-900">Kaizen</span>
            </Link>
          </div>

          <div className="flex items-center gap-4 ml-auto">
            <Link href="/admin/notifications" className="relative size-10 flex items-center justify-center rounded-xl hover:bg-slate-50 text-slate-400 transition-colors">
              <Bell className="size-5" strokeWidth={1.5} />
              <span className="absolute top-2.5 right-2.5 size-2 bg-red-500 rounded-full border-2 border-white" />
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-2xl hover:bg-slate-50 transition-all group">
                  <ProfilePicture
                    src={avatarUrl}
                    firstName={(currentUser as any)?.name?.split(' ')[0] || currentUser?.firstName}
                    lastName={(currentUser as any)?.name?.split(' ')[1] || currentUser?.lastName}
                    email={(currentUser as any)?.email || currentUser?.emailAddress}
                    size="default"
                    className="rounded-xl shadow-sm group-hover:shadow-md transition-shadow"
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-64 rounded-2xl bg-white p-2 shadow-2xl border-none mt-2"
                align="end"
              >
                <div className="flex items-center gap-3 p-3 mb-2 bg-slate-50 rounded-xl">
                  <ProfilePicture
                    src={avatarUrl}
                    firstName={(currentUser as any)?.name?.split(' ')[0] || currentUser?.firstName}
                    lastName={(currentUser as any)?.name?.split(' ')[1] || currentUser?.lastName}
                    email={(currentUser as any)?.email || currentUser?.emailAddress}
                    size="default"
                    className="rounded-lg"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-slate-900 truncate">{(currentUser as any)?.name || currentUser?.username || "Admin"}</span>
                    <span className="text-xs text-slate-500 truncate">{(currentUser as any)?.email || currentUser?.emailAddress || "admin@example.com"}</span>
                  </div>
                </div>
                <DropdownMenuItem asChild className="rounded-xl h-11 cursor-pointer focus:bg-violet-50 focus:text-violet-600">
                  <Link href="/admin/settings" className="flex items-center gap-3 w-full px-2">
                    <User className="size-4" />
                    <span className="font-bold text-sm">Account Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-2 bg-slate-100" />
                <DropdownMenuItem onClick={logout} className="rounded-xl h-11 cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700">
                  <div className="flex items-center gap-3 w-full px-2">
                    <LogOut className="size-4" />
                    <span className="font-bold text-sm">Log out</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-8 lg:p-10">
          <div className="max-w-7xl mx-auto space-y-8">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
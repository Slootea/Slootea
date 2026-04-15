"use client";

import { CalendarRange, Clock, Link2, Settings, LayoutDashboard, List, Users, Calendar, Building2, BarChart3, Shield, UserCog, Package, TrendingUp, ArrowUpDown, Zap } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useUser } from "@clerk/nextjs";
import { OrganizationSwitcher } from "@/components/organization-switcher";
import { ModuleSwitcher } from "@/components/module-switcher";
import { useOrganizationContext } from "@/components/providers/organization-provider";
import { useModuleContext } from "@/components/providers/module-provider";
import { Badge } from "@/components/ui/badge";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const pathname = usePathname();
  const t = useTranslations('sidebar');
  const { user } = useUser();
  const { isAdmin, currentOrganization } = useOrganizationContext();
  const { isInventoryModule } = useModuleContext();
  
  // Check if user is a system admin (has role: 'admin' in public metadata)
  const isSystemAdmin = (user?.publicMetadata as { role?: string } | undefined)?.role === 'admin';

  // Appointments module navigation
  const mainNavItems = [
    { href: "/dashboard", label: t('dashboard'), icon: LayoutDashboard },
    { href: "/dashboard/calendar", label: t('calendar'), icon: CalendarRange },
    { href: "/dashboard/appointments", label: t('appointments'), icon: Calendar },
    { href: "/dashboard/clients", label: t('clients'), icon: Users },
  ];

  // Members can see their own services, but only in org context
  const memberConfigItems = [
    { href: "/dashboard/availability", label: t('availability'), icon: Clock },
  ];

  // Admin-only configuration items (inventory removed - it's now a separate module)
  const adminConfigItems = [
    { href: "/dashboard/options", label: t('serviceOptions'), icon: List },
    { href: "/dashboard/providers", label: t('serviceProviders') || 'Service Providers', icon: UserCog },
    { href: "/dashboard/links", label: t('bookingLinks'), icon: Link2 },
    { href: "/dashboard/reports", label: t('reports') || 'Reports', icon: BarChart3 },
    { href: "/dashboard/organization-settings", label: t('organizationSettings') || 'Organization Settings', icon: Building2 },
  ];

  // Inventory module navigation (each is a separate page)
  const inventoryNavItems = [
    { href: "/dashboard/inventory", label: t('inventoryOverview') || 'Overview', icon: BarChart3, exact: true },
    { href: "/dashboard/inventory/items", label: t('inventoryItems') || 'Items', icon: Package },
    { href: "/dashboard/inventory/adjust", label: t('stockAdjust') || 'Adjust Stock', icon: ArrowUpDown },
    { href: "/dashboard/inventory/reports", label: t('inventoryReports') || 'Reports', icon: TrendingUp },
    { href: "/dashboard/inventory/automation", label: t('inventoryAutomation') || 'Automation', icon: Zap },
  ];

  // Helper to check if inventory nav item is active
  const isInventoryItemActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  const settingsNavItems = [
    { href: "/dashboard/settings", label: t('settings'), icon: Settings },
  ];

  return (
    <Sidebar>
      <SidebarHeader className="p-2">
        <OrganizationSwitcher />
        {currentOrganization && isAdmin && (
          <>
            <SidebarSeparator className="my-2" />
            <ModuleSwitcher />
          </>
        )}
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {/* Inventory Module Navigation */}
        {isInventoryModule && isAdmin ? (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>{t('inventoryManagement') || 'Inventory'}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {inventoryNavItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isInventoryItemActive(item.href, item.exact)} tooltip={item.label}>
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        ) : (
          <>
            {/* Appointments Module Navigation */}
            <SidebarGroup>
              <SidebarGroupLabel>{t('main')}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {mainNavItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.label}>
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

            <SidebarSeparator />

            {/* Member Configuration - Available to all members */}
            <SidebarGroup>
              <SidebarGroupLabel>{t('myConfiguration') || 'My Configuration'}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {memberConfigItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.label}>
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Admin Configuration - Only visible to admins */}
            {isAdmin && currentOrganization && (
              <>
                <SidebarSeparator />
                <SidebarGroup>
                  <SidebarGroupLabel>{t('adminConfiguration') || 'Admin'}</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {adminConfigItems.map((item) => (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.label}>
                            <Link href={item.href}>
                              <item.icon />
                              <span>{item.label}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </>
            )}
          </>
        )}

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>{t('system')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.label}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* System Admin Portal Link - Only visible to system admins */}
        {isSystemAdmin && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>System Admin</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Admin Portal">
                      <Link href="/admin" className="text-primary">
                        <Shield />
                        <span>Admin Portal</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>
    </Sidebar>
  );
}

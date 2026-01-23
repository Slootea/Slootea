"use client";

import * as React from "react";
import { ChevronsUpDown, Plus, Building2, Check, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOrganizationContext } from "@/components/providers/organization-provider";
import { CreateOrganization, OrganizationProfile } from "@clerk/nextjs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function OrganizationSwitcher() {
  const router = useRouter();
  const { 
    currentOrganization, 
    organizations, 
    isAdmin, 
    switchOrganization,
    isLoading 
  } = useOrganizationContext();
  
  const [isOpen, setIsOpen] = React.useState(false);
  const [showCreateDialog, setShowCreateDialog] = React.useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = React.useState(false);

  const handleSwitch = async (orgId: string) => {
    try {
      await switchOrganization(orgId);
      setIsOpen(false);
      router.refresh();
    } catch (error) {
      console.error('Failed to switch organization:', error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" className="animate-pulse">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-muted" />
            <div className="flex flex-col gap-1">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-3 w-16 bg-muted rounded" />
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  // If no organization is selected
  if (!currentOrganization) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/50">
                    <Building2 className="size-4 text-muted-foreground" />
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-semibold text-muted-foreground">No Organization</span>
                    <span className="text-xs text-muted-foreground">Select or create one</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
                align="start"
                side="bottom"
                sideOffset={4}
              >
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Organizations
                </DropdownMenuLabel>
                {organizations.length > 0 ? (
                  <>
                    {organizations.map((org) => (
                      <DropdownMenuItem
                        key={org.id}
                        onClick={() => handleSwitch(org.id)}
                        className="cursor-pointer"
                      >
                        <Avatar className="size-6 mr-2">
                          <AvatarImage src={org.imageUrl} alt={org.name} />
                          <AvatarFallback className="text-xs">
                            {getInitials(org.name)}
                          </AvatarFallback>
                        </Avatar>
                        {org.name}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                  </>
                ) : null}
                <DialogTrigger asChild>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onSelect={(e) => {
                      e.preventDefault();
                      setShowCreateDialog(true);
                      setIsOpen(false);
                    }}
                  >
                    <Plus className="size-4 mr-2" />
                    Create Organization
                  </DropdownMenuItem>
                </DialogTrigger>
              </DropdownMenuContent>
            </DropdownMenu>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden">
              <VisuallyHidden.Root>
                <DialogTitle>Create Organization</DialogTitle>
              </VisuallyHidden.Root>
              <CreateOrganization 
                afterCreateOrganizationUrl="/dashboard"
                skipInvitationScreen
              />
            </DialogContent>
          </Dialog>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="size-8 rounded-lg">
                  <AvatarImage src={currentOrganization.imageUrl} alt={currentOrganization.name} />
                  <AvatarFallback className="rounded-lg">
                    {getInitials(currentOrganization.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold truncate max-w-[140px]">
                    {currentOrganization.name}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    {isAdmin ? (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">
                        Admin
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        Member
                      </Badge>
                    )}
                    {currentOrganization.membersCount && (
                      <span>· {currentOrganization.membersCount} members</span>
                    )}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
              align="start"
              side="bottom"
              sideOffset={4}
            >
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Switch Organization
              </DropdownMenuLabel>
              {organizations.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => handleSwitch(org.id)}
                  className={cn(
                    "cursor-pointer",
                    org.id === currentOrganization.id && "bg-accent"
                  )}
                >
                  <Avatar className="size-6 mr-2">
                    <AvatarImage src={org.imageUrl} alt={org.name} />
                    <AvatarFallback className="text-xs">
                      {getInitials(org.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 truncate">{org.name}</span>
                  {org.id === currentOrganization.id && (
                    <Check className="size-4 text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              {isAdmin && (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onSelect={(e) => {
                    e.preventDefault();
                    setShowSettingsDialog(true);
                    setIsOpen(false);
                  }}
                >
                  <Settings className="size-4 mr-2" />
                  Organization Settings
                </DropdownMenuItem>
              )}
              <DialogTrigger asChild>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onSelect={(e) => {
                    e.preventDefault();
                    setShowCreateDialog(true);
                    setIsOpen(false);
                  }}
                >
                  <Plus className="size-4 mr-2" />
                  Create Organization
                </DropdownMenuItem>
              </DialogTrigger>
            </DropdownMenuContent>
          </DropdownMenu>
          <DialogContent className="sm:max-w-md p-0 overflow-hidden">
            <VisuallyHidden.Root>
              <DialogTitle>Create Organization</DialogTitle>
            </VisuallyHidden.Root>
            <CreateOrganization 
              afterCreateOrganizationUrl="/dashboard"
              skipInvitationScreen
            />
          </DialogContent>
        </Dialog>
        
        {/* Organization Settings Dialog */}
        <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
          <DialogContent className="min-w-max p-0 overflow-hidden max-h-[90vh]">
            <VisuallyHidden.Root>
              <DialogTitle>Organization Settings</DialogTitle>
            </VisuallyHidden.Root>
            <OrganizationProfile 
              routing="hash"
            />
          </DialogContent>
        </Dialog>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

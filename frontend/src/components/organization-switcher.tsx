"use client";

import * as React from "react";
import { ChevronsUpDown, Plus, Building2, Check, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOrganizationContext } from "@/components/providers/organization-provider";
import { CreateOrganization } from "@clerk/nextjs";
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
import { cn } from "@/lib/utils";

// Clerk appearance theme to match app design
const clerkAppearance = {
  variables: {
    colorPrimary: "hsl(221.2 83.2% 53.3%)",
    colorBackground: "hsl(var(--surface))",
    colorText: "hsl(var(--foreground))",
    colorInputBackground: "hsl(var(--surface-container))",
    colorInputText: "hsl(var(--foreground))",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full",
    card: "shadow-none border-0 bg-transparent",
    headerTitle: "text-xl font-semibold text-foreground",
    headerSubtitle: "text-muted-foreground",
    formButtonPrimary: 
      "bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors",
    formFieldInput: 
      "rounded-lg border border-border bg-surface-container focus:ring-2 focus:ring-primary/20 focus:border-primary",
    formFieldLabel: "text-sm font-medium text-foreground",
    footerActionLink: "text-primary hover:text-primary/80",
    identityPreview: "bg-surface-container rounded-lg",
    identityPreviewText: "text-foreground",
    identityPreviewEditButton: "text-primary hover:text-primary/80",
    organizationSwitcherTrigger: "rounded-lg",
    organizationPreview: "bg-surface-container-low",
    organizationPreviewMainIdentifier: "text-foreground font-medium",
    organizationPreviewSecondaryIdentifier: "text-muted-foreground",
  },
};

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

  const handleSwitch = async (orgId: string) => {
    try {
      await switchOrganization(orgId);
      setIsOpen(false);
      router.refresh();
    } catch (error) {
      console.error('Failed to switch organization:', error);
    }
  };

  const handleSettingsClick = () => {
    setIsOpen(false);
    router.push('/dashboard/organization-settings');
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
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30">
                    <Building2 className="size-4 text-muted-foreground" />
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-semibold text-muted-foreground">No Organization</span>
                    <span className="text-xs text-muted-foreground">Select or create one</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
                align="start"
                side="bottom"
                sideOffset={4}
              >
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                  Organizations
                </DropdownMenuLabel>
                {organizations.length > 0 ? (
                  <>
                    {organizations.map((org) => (
                      <DropdownMenuItem
                        key={org.id}
                        onClick={() => handleSwitch(org.id)}
                        className="cursor-pointer gap-2"
                      >
                        <Avatar className="size-5">
                          <AvatarImage src={org.imageUrl} alt={org.name} />
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
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
                    className="cursor-pointer gap-2"
                    onSelect={(e) => {
                      e.preventDefault();
                      setShowCreateDialog(true);
                      setIsOpen(false);
                    }}
                  >
                    <Plus className="size-4" />
                    Create Organization
                  </DropdownMenuItem>
                </DialogTrigger>
              </DropdownMenuContent>
            </DropdownMenu>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden border-border">
              <VisuallyHidden.Root>
                <DialogTitle>Create Organization</DialogTitle>
              </VisuallyHidden.Root>
              <CreateOrganization 
                afterCreateOrganizationUrl="/dashboard"
                skipInvitationScreen
                appearance={clerkAppearance}
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
                  <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xs font-medium">
                    {getInitials(currentOrganization.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold truncate max-w-[140px]">
                    {currentOrganization.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {isAdmin ? "Admin" : "Member"}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
              align="start"
              side="bottom"
              sideOffset={4}
            >
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                Switch Organization
              </DropdownMenuLabel>
              {organizations.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => handleSwitch(org.id)}
                  className={cn(
                    "cursor-pointer gap-2",
                    org.id === currentOrganization.id && "bg-surface-container"
                  )}
                >
                  <Avatar className="size-5">
                    <AvatarImage src={org.imageUrl} alt={org.name} />
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
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
                  className="cursor-pointer gap-2"
                  onClick={handleSettingsClick}
                >
                  <Settings className="size-4" />
                  Organization Settings
                </DropdownMenuItem>
              )}
              <DialogTrigger asChild>
                <DropdownMenuItem
                  className="cursor-pointer gap-2"
                  onSelect={(e) => {
                    e.preventDefault();
                    setShowCreateDialog(true);
                    setIsOpen(false);
                  }}
                >
                  <Plus className="size-4" />
                  Create Organization
                </DropdownMenuItem>
              </DialogTrigger>
            </DropdownMenuContent>
          </DropdownMenu>
          <DialogContent className="sm:max-w-md p-0 overflow-hidden border-border">
            <VisuallyHidden.Root>
              <DialogTitle>Create Organization</DialogTitle>
            </VisuallyHidden.Root>
            <CreateOrganization 
              afterCreateOrganizationUrl="/dashboard"
              skipInvitationScreen
              appearance={clerkAppearance}
            />
          </DialogContent>
        </Dialog>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

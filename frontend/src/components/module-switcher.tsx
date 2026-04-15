"use client";

import * as React from "react";
import { ChevronsUpDown, Check, CalendarRange, Package } from "lucide-react";
import { useTranslations } from "next-intl";
import { useModuleContext, AppModule } from "@/components/providers/module-provider";
import { useOrganizationContext } from "@/components/providers/organization-provider";
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
import { cn } from "@/lib/utils";

interface ModuleOption {
  id: AppModule;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

export function ModuleSwitcher() {
  const t = useTranslations("moduleSwitcher");
  const { currentModule, setModule } = useModuleContext();
  const { isAdmin, currentOrganization } = useOrganizationContext();
  const [isOpen, setIsOpen] = React.useState(false);

  const modules: ModuleOption[] = [
    {
      id: "appointments",
      label: t("appointments.label"),
      description: t("appointments.description"),
      icon: CalendarRange,
    },
    {
      id: "inventory",
      label: t("inventory.label"),
      description: t("inventory.description"),
      icon: Package,
      adminOnly: true,
    },
  ];

  // Filter modules based on user role
  const availableModules = modules.filter(
    (module) => !module.adminOnly || isAdmin
  );

  const currentModuleData = modules.find((m) => m.id === currentModule) || modules[0];
  const CurrentIcon = currentModuleData.icon;

  const handleSwitch = (moduleId: AppModule) => {
    setModule(moduleId);
    setIsOpen(false);
  };

  // Don't show if no organization
  if (!currentOrganization) {
    return null;
  }

  // Don't show switcher if only one module available
  if (availableModules.length <= 1) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CurrentIcon className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold">{currentModuleData.label}</span>
                <span className="text-xs text-muted-foreground">
                  {currentModuleData.description}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 bg-popover"
            align="start"
            side="bottom"
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-foreground/60">
              {t("switchModule")}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {availableModules.map((module) => {
              const Icon = module.icon;
              const isActive = module.id === currentModule;
              return (
                <DropdownMenuItem
                  key={module.id}
                  onClick={() => handleSwitch(module.id)}
                  className={cn(
                    "cursor-pointer flex items-center gap-3 py-2",
                    isActive && "bg-primary/10"
                  )}
                >
                  <div
                    className={cn(
                      "flex size-8 items-center justify-center rounded-lg",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground/70"
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{module.label}</div>
                    <div className="text-xs text-foreground/60">
                      {module.description}
                    </div>
                  </div>
                  {isActive && <Check className="size-4 text-primary" />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

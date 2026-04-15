"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export type AppModule = "appointments" | "inventory";

interface ModuleContextValue {
  currentModule: AppModule;
  setModule: (module: AppModule) => void;
  isInventoryModule: boolean;
  isAppointmentsModule: boolean;
}

const ModuleContext = createContext<ModuleContextValue | undefined>(undefined);

const MODULE_STORAGE_KEY = "slootea_current_module";

// Module route prefixes
const INVENTORY_ROUTES = ["/dashboard/inventory"];
const APPOINTMENTS_ROUTES = [
  "/dashboard",
  "/dashboard/calendar",
  "/dashboard/appointments",
  "/dashboard/clients",
  "/dashboard/availability",
  "/dashboard/options",
  "/dashboard/providers",
  "/dashboard/links",
  "/dashboard/reports",
  "/dashboard/organization-settings",
  "/dashboard/settings",
];

function getModuleFromPath(pathname: string): AppModule {
  if (INVENTORY_ROUTES.some(route => pathname.startsWith(route))) {
    return "inventory";
  }
  return "appointments";
}

export function ModuleProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentModule, setCurrentModule] = useState<AppModule>("appointments");

  // Initialize from localStorage or path on mount
  useEffect(() => {
    const stored = localStorage.getItem(MODULE_STORAGE_KEY) as AppModule | null;
    const pathModule = getModuleFromPath(pathname);
    
    // Path takes precedence, but if we're on dashboard root, use stored preference
    if (pathname === "/dashboard" && stored) {
      setCurrentModule(stored);
    } else {
      setCurrentModule(pathModule);
    }
  }, [pathname]);

  const setModule = useCallback((module: AppModule) => {
    setCurrentModule(module);
    localStorage.setItem(MODULE_STORAGE_KEY, module);
    
    // Navigate to the appropriate default route for the module
    if (module === "inventory") {
      router.push("/dashboard/inventory");
    } else {
      router.push("/dashboard");
    }
  }, [router]);

  const value: ModuleContextValue = {
    currentModule,
    setModule,
    isInventoryModule: currentModule === "inventory",
    isAppointmentsModule: currentModule === "appointments",
  };

  return (
    <ModuleContext.Provider value={value}>
      {children}
    </ModuleContext.Provider>
  );
}

export function useModuleContext() {
  const context = useContext(ModuleContext);
  if (context === undefined) {
    throw new Error("useModuleContext must be used within a ModuleProvider");
  }
  return context;
}

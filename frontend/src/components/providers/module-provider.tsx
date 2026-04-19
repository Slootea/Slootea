"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export type AppModule = "appointments" | "inventory" | "economy";

interface ModuleContextValue {
  currentModule: AppModule;
  setModule: (module: AppModule) => void;
  isInventoryModule: boolean;
  isAppointmentsModule: boolean;
  isEconomyModule: boolean;
}

const ModuleContext = createContext<ModuleContextValue | undefined>(undefined);

const MODULE_STORAGE_KEY = "slootea_current_module";

// Module route prefixes
const INVENTORY_ROUTES = ["/dashboard/inventory"];
const ECONOMY_ROUTES = ["/dashboard/economy"];

// Routes that should preserve the current module instead of switching
const MODULE_NEUTRAL_ROUTES = [
  "/dashboard/settings",
  "/dashboard/organization-settings",
];

function getModuleFromPath(pathname: string): AppModule | null {
  if (MODULE_NEUTRAL_ROUTES.some(route => pathname.startsWith(route))) {
    return null; // preserve current module
  }
  if (INVENTORY_ROUTES.some(route => pathname.startsWith(route))) {
    return "inventory";
  }
  if (ECONOMY_ROUTES.some(route => pathname.startsWith(route))) {
    return "economy";
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
    
    // Module-neutral routes (settings) preserve current module
    if (pathModule === null) {
      // Keep current module as-is
      return;
    }
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
    } else if (module === "economy") {
      router.push("/dashboard/economy");
    } else {
      router.push("/dashboard");
    }
  }, [router]);

  const value: ModuleContextValue = {
    currentModule,
    setModule,
    isInventoryModule: currentModule === "inventory",
    isAppointmentsModule: currentModule === "appointments",
    isEconomyModule: currentModule === "economy",
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

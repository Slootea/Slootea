"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

interface PageHeaderState {
  title: string;
  subtitle?: string;
}

interface PageHeaderContextType {
  header: PageHeaderState | null;
  setHeader: (header: PageHeaderState | null) => void;
}

const PageHeaderContext = createContext<PageHeaderContextType | undefined>(undefined);

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [header, setHeaderState] = useState<PageHeaderState | null>(null);

  const setHeader = useCallback((newHeader: PageHeaderState | null) => {
    setHeaderState(newHeader);
  }, []);

  return (
    <PageHeaderContext.Provider value={{ header, setHeader }}>
      {children}
    </PageHeaderContext.Provider>
  );
}

export function usePageHeader() {
  const context = useContext(PageHeaderContext);
  if (!context) {
    throw new Error("usePageHeader must be used within a PageHeaderProvider");
  }
  return context;
}

// Hook for pages to set their header
export function useSetPageHeader(title: string, subtitle?: string) {
  const { setHeader } = usePageHeader();
  
  useEffect(() => {
    setHeader({ title, subtitle });
    return () => setHeader(null);
  }, [title, subtitle, setHeader]);
}

"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Locale, locales, defaultLocale } from "@/i18n/config";

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  useEffect(() => {
    // Read locale from cookie on mount
    const cookieLocale = document.cookie
      .split("; ")
      .find((row) => row.startsWith("NEXT_LOCALE="))
      ?.split("=")[1] as Locale | undefined;

    if (cookieLocale && locales.includes(cookieLocale)) {
      setLocaleState(cookieLocale);
    } else {
      // Detect from browser
      const browserLocale = navigator.language.substring(0, 2).toLowerCase() as Locale;
      if (locales.includes(browserLocale)) {
        setLocaleState(browserLocale);
        document.cookie = `NEXT_LOCALE=${browserLocale}; path=/; max-age=31536000; SameSite=Lax`;
      }
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    // Set cookie to persist locale
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    // Reload to apply new locale
    window.location.reload();
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
}

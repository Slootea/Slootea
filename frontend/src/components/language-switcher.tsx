"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";
import { locales, localeNames, localeFlags, Locale } from "@/i18n/config";

interface LanguageSwitcherProps {
  currentLocale: string;
}

export function LanguageSwitcher({ currentLocale }: LanguageSwitcherProps) {
  const pathname = usePathname();
  const router = useRouter();
  
  const switchLocale = (locale: Locale) => {
    // Set the locale cookie
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; samesite=lax`;
    
    // Calculate the new path
    const segments = pathname.split('/').filter(Boolean);
    
    let newPath: string;
    // Check if current path starts with a locale
    if (locales.includes(segments[0] as Locale)) {
      segments[0] = locale;
      newPath = '/' + segments.join('/');
    } else {
      // If no locale prefix, add one
      newPath = `/${locale}${pathname}`;
    }
    
    // Navigate to the new locale
    router.push(newPath);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">
            {localeFlags[currentLocale as Locale]} {localeNames[currentLocale as Locale]}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((locale) => (
          <DropdownMenuItem 
            key={locale} 
            onClick={() => switchLocale(locale)}
            className={`cursor-pointer ${currentLocale === locale ? "font-semibold bg-accent" : ""}`}
          >
            <span className="mr-2">{localeFlags[locale]}</span>
            {localeNames[locale]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Check } from "lucide-react";
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
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/50">
          <span>{localeFlags[currentLocale as Locale]}</span>
          <span className="hidden sm:inline">{localeNames[currentLocale as Locale]}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-50" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {locales.map((locale) => (
          <DropdownMenuItem 
            key={locale} 
            onClick={() => switchLocale(locale)}
            className="cursor-pointer flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <span>{localeFlags[locale]}</span>
              <span className={currentLocale === locale ? "font-medium" : ""}>{localeNames[locale]}</span>
            </span>
            {currentLocale === locale && (
              <Check className="h-4 w-4 text-muted-foreground" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

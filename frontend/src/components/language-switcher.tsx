"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
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
  
  const getLocalizedPath = (locale: Locale) => {
    // For locale landing pages, simply switch locale prefix
    const segments = pathname.split('/').filter(Boolean);
    
    // Check if current path starts with a locale
    if (locales.includes(segments[0] as Locale)) {
      segments[0] = locale;
      return '/' + segments.join('/');
    }
    
    // If no locale prefix, add one
    return `/${locale}`;
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
          <DropdownMenuItem key={locale} asChild>
            <Link 
              href={getLocalizedPath(locale)}
              className={currentLocale === locale ? "font-semibold" : ""}
            >
              <span className="mr-2">{localeFlags[locale]}</span>
              {localeNames[locale]}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

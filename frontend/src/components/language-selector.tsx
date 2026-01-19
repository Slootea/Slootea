"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { locales, localeNames, localeFlags, Locale } from "@/i18n/config";
import { useLocale } from "@/components/providers/locale-provider";

export function LanguageSelector() {
  const { locale: currentLocale, setLocale } = useLocale();

  return (
    <div className="space-y-2">
      <Label>Language</Label>
      <div className="flex gap-2">
        {locales.map((locale) => (
          <Button
            key={locale}
            variant={currentLocale === locale ? "default" : "outline"}
            size="sm"
            onClick={() => setLocale(locale)}
            className="flex items-center gap-2"
          >
            <span>{localeFlags[locale]}</span>
            {localeNames[locale]}
          </Button>
        ))}
      </div>
    </div>
  );
}

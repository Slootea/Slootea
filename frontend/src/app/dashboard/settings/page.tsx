"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/components/providers/locale-provider";
import { locales, localeNames, localeFlags } from "@/i18n/config";
import { Sun, Moon, Monitor, Globe } from "lucide-react";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const t = useTranslations('settings');
  const { locale: currentLocale, setLocale } = useLocale();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Appearance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5" />
            {t('appearance.title')}
          </CardTitle>
          <CardDescription>
            {t('appearance.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('appearance.theme')}</Label>
            <p className="text-xs text-muted-foreground mb-3">
              {t('appearance.themeDescription')}
            </p>
            {mounted && (
              <div className="flex gap-2">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("light")}
                  className="flex items-center gap-2"
                >
                  <Sun className="h-4 w-4" />
                  {t('appearance.light')}
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("dark")}
                  className="flex items-center gap-2"
                >
                  <Moon className="h-4 w-4" />
                  {t('appearance.dark')}
                </Button>
                <Button
                  variant={theme === "system" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("system")}
                  className="flex items-center gap-2"
                >
                  <Monitor className="h-4 w-4" />
                  {t('appearance.system')}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Language Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t('language.title')}
          </CardTitle>
          <CardDescription>
            {t('language.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('language.label')}</Label>
            <p className="text-xs text-muted-foreground mb-3">
              {t('language.hint')}
            </p>
            {mounted && (
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
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

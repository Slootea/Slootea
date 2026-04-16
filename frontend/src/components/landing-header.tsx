"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu } from "lucide-react";

interface LandingHeaderProps {
  locale: string;
}

export function LandingHeader({ locale }: LandingHeaderProps) {
  const t = useTranslations("landing");
  const common = useTranslations("common");
  const [open, setOpen] = useState(false);

  const navLinks = [
    { href: "#features", label: t("nav.features") },
    { href: "#how-it-works", label: t("nav.howItWorks") },
    { href: "#testimonials", label: t("nav.testimonials") },
    { href: "#pricing", label: t("nav.pricing") },
    { href: `/${locale}/blog`, label: t("nav.blog"), isLink: true },
  ];

  return (
    <header className="sticky top-0 z-50 w-full glass shadow-ambient-sm">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-3">
          <Image
            src="/Slootea_logo.png"
            alt="Slootea Logo"
            width={36}
            height={36}
            className="h-9 w-9"
          />
          <span className="text-xl font-display font-bold tracking-tight">
            Slootea
          </span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          {navLinks.map((link) =>
            link.isLink ? (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {link.label}
              </a>
            )
          )}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center space-x-3">
          <LanguageSwitcher currentLocale={locale} />
          <Link href="/sign-in">
            <Button variant="ghost" size="sm" className="font-medium">
              {common("logIn")}
            </Button>
          </Link>
          <Link href="/sign-up">
            <Button size="sm" className="font-medium">
              {common("getStarted")}
            </Button>
          </Link>
        </div>

        {/* Mobile Menu */}
        <div className="md:hidden">
          <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {/* Navigation Links */}
              {navLinks.map((link) => (
                <DropdownMenuItem key={link.href} asChild>
                  {link.isLink ? (
                    <Link
                      href={link.href}
                      className="w-full cursor-pointer"
                      onClick={() => setOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      href={link.href}
                      className="w-full cursor-pointer"
                      onClick={() => setOpen(false)}
                    >
                      {link.label}
                    </a>
                  )}
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator />

              {/* Language Switcher */}
              <div className="px-2 py-2">
                <LanguageSwitcher currentLocale={locale} />
              </div>

              <DropdownMenuSeparator />

              {/* Auth Buttons */}
              <div className="p-2 space-y-2">
                <Link href="/sign-in" className="block" onClick={() => setOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full font-medium">
                    {common("logIn")}
                  </Button>
                </Link>
                <Link href="/sign-up" className="block" onClick={() => setOpen(false)}>
                  <Button size="sm" className="w-full font-medium">
                    {common("getStarted")}
                  </Button>
                </Link>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowRight, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

export function PricingSection() {
  const t = useTranslations("landing.pricing");
  const [isYearly, setIsYearly] = useState(false);

  return (
    <section id="pricing" className="py-24 lg:py-32 bg-surface-container-lowest">
      <div className="container px-6 mx-auto">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <Badge variant="outline" className="mb-6 px-4 py-1.5 text-sm font-medium rounded-full bg-surface-container-low">
            {t("badge")}
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold tracking-tight mb-6">
            {t("title")}
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-8">
            {t("subtitle")}
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-4 p-1.5 bg-surface-container-low rounded-full">
            <button
              onClick={() => setIsYearly(false)}
              className={cn(
                "px-6 py-2 rounded-full text-sm font-medium transition-all",
                !isYearly
                  ? "bg-surface text-foreground shadow-ambient-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t("monthly")}
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={cn(
                "px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                isYearly
                  ? "bg-surface text-foreground shadow-ambient-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t("yearly")}
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {t("save")}
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Standard Plan */}
          <div className="relative bg-surface rounded-2xl shadow-ambient-sm p-8 hover:shadow-ambient transition-all">
            <div className="mb-6">
              <h3 className="text-xl font-display font-semibold mb-2">{t("standard.name")}</h3>
              <p className="text-muted-foreground text-sm">{t("standard.description")}</p>
            </div>
            
            <div className="mb-8">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-display font-bold">
                  {isYearly ? t("standard.yearlyPrice") : t("standard.price")}
                </span>
                <span className="text-muted-foreground">
                  {isYearly ? t("perYear") : t("perMonth")}
                </span>
              </div>
            </div>

            <ul className="space-y-4 mb-8">
              {["feature1", "feature2", "feature3", "feature4"].map((key) => (
                <li key={key} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{t(`standard.${key}`)}</span>
                </li>
              ))}
            </ul>

            <Link href="/sign-up" className="block">
              <Button className="w-full h-12 text-base font-medium">
                {t("standard.cta")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Enterprise Plan */}
          <div className="relative bg-surface rounded-2xl shadow-ambient p-8 ring-2 ring-primary/30 hover:ring-primary/50 transition-all">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="px-4 py-1 text-xs font-medium gradient-primary text-primary-foreground">
                {t("enterprise.name")}
              </Badge>
            </div>
            
            <div className="mb-6 pt-2">
              <h3 className="text-xl font-display font-semibold mb-2">{t("enterprise.name")}</h3>
              <p className="text-muted-foreground text-sm">{t("enterprise.description")}</p>
            </div>
            
            <div className="mb-8">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-display font-bold">{t("enterprise.price")}</span>
              </div>
            </div>

            <ul className="space-y-4 mb-8">
              {["feature1", "feature2", "feature3", "feature4", "feature5"].map((key) => (
                <li key={key} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{t(`enterprise.${key}`)}</span>
                </li>
              ))}
            </ul>

            <a href="mailto:info@slootea.com" className="block">
              <Button variant="tertiary" className="w-full h-12 text-base font-medium">
                <Mail className="mr-2 h-4 w-4" />
                {t("enterprise.cta")}
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  BellRing,
  Boxes,
  ChartNoAxesCombined,
  ChevronLeft,
  MessageSquareShare,
  Smartphone,
  Store,
  Webhook,
} from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "roadmap" });
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://slootea.com";

  return {
    title: `${t("meta.title")} - Slootea`,
    description: t("meta.description"),
    alternates: {
      canonical: `${siteUrl}/${locale}/roadmap`,
      languages: {
        en: `${siteUrl}/en/roadmap`,
        tr: `${siteUrl}/tr/roadmap`,
      },
    },
    openGraph: {
      title: `${t("meta.title")} - Slootea`,
      description: t("meta.description"),
      url: `${siteUrl}/${locale}/roadmap`,
      siteName: "Slootea",
      locale: locale === "tr" ? "tr_TR" : "en_US",
      type: "website",
    },
  };
}

export default async function RoadmapPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "roadmap" });

  const phases = [
    {
      key: "phase1",
      icon: BellRing,
      accent: "from-secondary/20 via-primary/10 to-transparent",
      surface: "bg-secondary-container/60",
      border: "border-secondary/20",
      highlights: [
        { key: "highlight1", icon: Smartphone },
        { key: "highlight2", icon: MessageSquareShare },
        { key: "highlight3", icon: Webhook },
      ],
    },
    {
      key: "phase2",
      icon: Boxes,
      accent: "from-warning-container via-primary/10 to-transparent",
      surface: "bg-warning-container/50",
      border: "border-warning/20",
      highlights: [
        { key: "highlight1", icon: Store },
        { key: "highlight2", icon: Boxes },
        { key: "highlight3", icon: ArrowRight },
      ],
    },
    {
      key: "phase3",
      icon: ChartNoAxesCombined,
      accent: "from-accent-container via-primary/10 to-transparent",
      surface: "bg-accent-container/50",
      border: "border-accent/20",
      highlights: [
        { key: "highlight1", icon: ChartNoAxesCombined },
        { key: "highlight2", icon: BellRing },
        { key: "highlight3", icon: Store },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="absolute inset-x-0 top-0 -z-10 overflow-hidden">
        <div className="mx-auto h-[28rem] w-[72rem] max-w-none rounded-full bg-[radial-gradient(circle_at_top,rgba(0,74,198,0.18),transparent_58%)]" />
        <div className="mx-auto -mt-40 h-[24rem] w-[64rem] max-w-none rounded-full bg-[radial-gradient(circle,rgba(13,148,136,0.14),transparent_55%)]" />
      </div>

      <header className="sticky top-0 z-50 glass shadow-ambient-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <Link href={`/${locale}`} className="flex items-center gap-3">
            <Image
              src="/Slootea_logo.png"
              alt="Slootea Logo"
              width={36}
              height={36}
              className="h-9 w-9"
            />
            <span className="text-xl font-display font-bold tracking-tight">Slootea</span>
          </Link>

          <div className="flex items-center gap-3">
            <LanguageSwitcher currentLocale={locale} />
            <Link href={`/${locale}`}>
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                <ChevronLeft className="mr-2 h-4 w-4" />
                {t("backToHome")}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden pb-20 pt-20 lg:pb-28 lg:pt-28">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-6xl">
              <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
                <div>
                  <Badge variant="secondary" className="mb-6 rounded-full px-4 py-2 text-sm font-medium bg-surface-container-low">
                    {t("eyebrow")}
                  </Badge>

                  <h1 className="max-w-4xl text-4xl font-display font-bold leading-[1.02] tracking-tight sm:text-5xl lg:text-7xl">
                    {t("hero.title")}
                  </h1>

                  <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
                    {t("hero.description")}
                  </p>

                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <Link href="/sign-up">
                      <Button size="lg" className="h-12 px-8 text-base font-medium">
                        {t("hero.primaryCta")}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href={`/${locale}`}>
                      <Button variant="tertiary" size="lg" className="h-12 px-8 text-base font-medium">
                        {t("hero.secondaryCta")}
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-primary/15 via-secondary/10 to-transparent blur-2xl" />
                  <div className="relative overflow-hidden rounded-[2rem] bg-surface shadow-ambient-lg">
                    <div className="border-b border-outline px-6 py-5">
                      <p className="text-sm font-medium text-muted-foreground">{t("snapshot.label")}</p>
                      <p className="mt-2 text-2xl font-display font-semibold">{t("snapshot.title")}</p>
                    </div>
                    <div className="grid gap-4 px-6 py-6 sm:grid-cols-3">
                      {["stat1", "stat2", "stat3"].map((item) => (
                        <div key={item} className="rounded-2xl bg-surface-container-low px-4 py-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            {t(`snapshot.${item}.label`)}
                          </p>
                          <p className="mt-3 text-2xl font-display font-semibold">
                            {t(`snapshot.${item}.value`)}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {t(`snapshot.${item}.detail`)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="pb-24 lg:pb-32">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-6xl">
              <div className="mb-12 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
                    {t("timeline.eyebrow")}
                  </p>
                  <h2 className="mt-3 max-w-2xl text-3xl font-display font-semibold tracking-tight sm:text-4xl">
                    {t("timeline.title")}
                  </h2>
                </div>
                <p className="max-w-xl text-base leading-7 text-muted-foreground">
                  {t("timeline.description")}
                </p>
              </div>

              <div className="relative space-y-8">
                <div className="absolute bottom-0 left-6 top-0 hidden w-px bg-gradient-to-b from-primary/40 via-outline to-transparent lg:block" />

                {phases.map((phase, index) => {
                  const PhaseIcon = phase.icon;

                  return (
                    <article
                      key={phase.key}
                      className={`relative overflow-hidden rounded-[2rem] border ${phase.border} bg-surface shadow-ambient-lg`}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${phase.accent} opacity-80`} />
                      <div className="relative grid gap-8 p-6 lg:grid-cols-[120px_1fr_340px] lg:p-8">
                        <div className="flex items-start gap-4 lg:flex-col lg:gap-5">
                          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${phase.surface}`}>
                            <PhaseIcon className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                              {t(`phases.${phase.key}.step`) }
                            </p>
                            <p className="mt-2 text-sm font-medium text-primary">
                              {t(`phases.${phase.key}.status`) }
                            </p>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-2xl font-display font-semibold tracking-tight sm:text-3xl">
                            {t(`phases.${phase.key}.title`) }
                          </h3>
                          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                            {t(`phases.${phase.key}.description`) }
                          </p>

                          <div className="mt-6 grid gap-3 sm:grid-cols-2">
                            {["bullet1", "bullet2", "bullet3", "bullet4"].map((bullet) => (
                              <div key={bullet} className="rounded-2xl bg-background/75 px-4 py-4 backdrop-blur-sm">
                                <p className="text-sm leading-6 text-foreground">
                                  {t(`phases.${phase.key}.${bullet}`)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-[1.75rem] bg-background/85 p-5 backdrop-blur-sm">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-foreground">
                              {t(`phases.${phase.key}.panelTitle`) }
                            </p>
                            <Badge variant="outline" className="rounded-full bg-background/70">
                              0{index + 1}
                            </Badge>
                          </div>

                          <div className="mt-5 space-y-3">
                            {phase.highlights.map((highlight) => {
                              const HighlightIcon = highlight.icon;

                              return (
                                <div key={highlight.key} className="flex gap-3 rounded-2xl bg-surface-container-low px-4 py-4">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background">
                                    <HighlightIcon className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium leading-6 text-foreground">
                                      {t(`phases.${phase.key}.${highlight.key}.title`) }
                                    </p>
                                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                      {t(`phases.${phase.key}.${highlight.key}.description`) }
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="pb-24">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-gradient-to-r from-primary to-primary-light p-[1px] shadow-ambient-lg">
              <div className="rounded-[calc(2rem-1px)] bg-background px-6 py-8 lg:px-10 lg:py-10">
                <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
                      {t("cta.eyebrow")}
                    </p>
                    <h2 className="mt-3 text-3xl font-display font-semibold tracking-tight sm:text-4xl">
                      {t("cta.title")}
                    </h2>
                    <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                      {t("cta.description")}
                    </p>
                  </div>

                  <Link href="/sign-up">
                    <Button size="lg" className="h-12 px-8 text-base font-medium">
                      {t("cta.button")}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
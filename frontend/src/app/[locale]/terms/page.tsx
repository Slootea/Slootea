import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'legal' });
  
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://slootea.com';
  
  return {
    title: `${t('terms.title')} - Slootea`,
    description: t('terms.metaDescription'),
    alternates: {
      canonical: `${siteUrl}/${locale}/terms`,
      languages: {
        en: `${siteUrl}/en/terms`,
        tr: `${siteUrl}/tr/terms`,
      },
    },
    openGraph: {
      title: `${t('terms.title')} - Slootea`,
      description: t('terms.metaDescription'),
      url: `${siteUrl}/${locale}/terms`,
      siteName: 'Slootea',
      locale: locale === 'tr' ? 'tr_TR' : 'en_US',
      type: 'website',
    },
  };
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'legal' });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href={`/${locale}`} className="flex items-center space-x-2">
            <Image
              src="/Slootea_logo.png"
              alt="Slootea Logo"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <span className="text-xl font-bold tracking-tight">Slootea</span>
          </Link>
          <Link href={`/${locale}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('backToHome')}
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 py-16">
        <div className="container px-4 mx-auto">
          <div className="max-w-3xl mx-auto prose prose-gray dark:prose-invert">
            <h1 className="text-4xl font-bold tracking-tight mb-2">{t('terms.title')}</h1>
            <p className="text-muted-foreground text-lg mb-8">
              {t('lastUpdated', { date: 'March 30, 2026' })}
            </p>

            {/* Section 1: Acceptance of Terms */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{t('terms.sections.acceptance.title')}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {t('terms.sections.acceptance.content')}
              </p>
            </section>

            {/* Section 2: Description of Service */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{t('terms.sections.description.title')}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {t('terms.sections.description.content')}
              </p>
            </section>

            {/* Section 3: Account Registration */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{t('terms.sections.account.title')}</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                {t('terms.sections.account.intro')}
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                {(t.raw('terms.sections.account.items') as string[]).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>

            {/* Section 4: User Types and Responsibilities */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{t('terms.sections.userTypes.title')}</h2>
              
              <h3 className="text-xl font-medium mb-3">{t('terms.sections.userTypes.business.title')}</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                {t('terms.sections.userTypes.business.intro')}
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-6">
                {(t.raw('terms.sections.userTypes.business.items') as string[]).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>

              <h3 className="text-xl font-medium mb-3">{t('terms.sections.userTypes.clients.title')}</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                {t('terms.sections.userTypes.clients.intro')}
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                {(t.raw('terms.sections.userTypes.clients.items') as string[]).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>

            {/* Section 5: Acceptable Use */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{t('terms.sections.acceptableUse.title')}</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                {t('terms.sections.acceptableUse.intro')}
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                {(t.raw('terms.sections.acceptableUse.items') as string[]).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>

            {/* Section 6: Appointment Policies */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{t('terms.sections.appointments.title')}</h2>
              
              <h3 className="text-xl font-medium mb-3">{t('terms.sections.appointments.booking.title')}</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                {t('terms.sections.appointments.booking.content')}
              </p>

              <h3 className="text-xl font-medium mb-3">{t('terms.sections.appointments.cancellations.title')}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {t('terms.sections.appointments.cancellations.content')}
              </p>
            </section>

            {/* Section 7: Intellectual Property */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{t('terms.sections.intellectualProperty.title')}</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                {t('terms.sections.intellectualProperty.intro')}
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                {(t.raw('terms.sections.intellectualProperty.items') as string[]).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>

            {/* Section 8: User Content */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{t('terms.sections.userContent.title')}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {t('terms.sections.userContent.content')}
              </p>
            </section>

            {/* Section 9: Disclaimer of Warranties */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{t('terms.sections.disclaimer.title')}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {t('terms.sections.disclaimer.content')}
              </p>
            </section>

            {/* Section 10: Limitation of Liability */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{t('terms.sections.liability.title')}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {t('terms.sections.liability.content')}
              </p>
            </section>

            {/* Section 11: Termination */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{t('terms.sections.termination.title')}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {t('terms.sections.termination.content')}
              </p>
            </section>

            {/* Section 12: Changes to Terms */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{t('terms.sections.changes.title')}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {t('terms.sections.changes.content')}
              </p>
            </section>

            {/* Section 13: Governing Law */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{t('terms.sections.governing.title')}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {t('terms.sections.governing.content')}
              </p>
            </section>

            {/* Section 14: Contact Us */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{t('terms.sections.contact.title')}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {t('terms.sections.contact.content')}
              </p>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container px-4 mx-auto text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Slootea. All rights reserved.</p>
          <div className="mt-2 space-x-4">
            <Link href={`/${locale}/privacy`} className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href={`/${locale}/terms`} className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

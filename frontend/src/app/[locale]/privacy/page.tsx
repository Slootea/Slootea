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
    title: `${t('privacy.title')} - Slootea`,
    description: t('privacy.metaDescription'),
    alternates: {
      canonical: `${siteUrl}/${locale}/privacy`,
      languages: {
        en: `${siteUrl}/en/privacy`,
        tr: `${siteUrl}/tr/privacy`,
      },
    },
    openGraph: {
      title: `${t('privacy.title')} - Slootea`,
      description: t('privacy.metaDescription'),
      url: `${siteUrl}/${locale}/privacy`,
      siteName: 'Slootea',
      locale: locale === 'tr' ? 'tr_TR' : 'en_US',
      type: 'website',
    },
  };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
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
            <h1 className="text-4xl font-bold tracking-tight mb-2">{t('privacy.title')}</h1>
            <p className="text-muted-foreground text-lg mb-8">
              {t('lastUpdated', { date: 'March 30, 2026' })}
            </p>

            {/* Section 1: Introduction */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{t('privacy.sections.introduction.title')}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {t('privacy.sections.introduction.content')}
              </p>
            </section>

            {/* Section 2: Information We Collect */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{t('privacy.sections.informationCollected.title')}</h2>
              
              <h3 className="text-xl font-medium mb-3">{t('privacy.sections.informationCollected.provided.title')}</h3>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                {(t.raw('privacy.sections.informationCollected.provided.items') as string[]).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>

              <h3 className="text-xl font-medium mb-3">{t('privacy.sections.informationCollected.automatic.title')}</h3>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                {(t.raw('privacy.sections.informationCollected.automatic.items') as string[]).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>

            {/* Section 3: How We Use Your Information */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{t('privacy.sections.howWeUse.title')}</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                {t('privacy.sections.howWeUse.intro')}
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                {(t.raw('privacy.sections.howWeUse.items') as string[]).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>

            {/* Section 4: Information Sharing and Disclosure */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{t('privacy.sections.sharing.title')}</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                {t('privacy.sections.sharing.intro')}
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                {(t.raw('privacy.sections.sharing.items') as string[]).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>

            {/* Section 5: Data Security */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{t('privacy.sections.security.title')}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {t('privacy.sections.security.content')}
              </p>
            </section>

            {/* Section 6: Data Retention */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{t('privacy.sections.retention.title')}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {t('privacy.sections.retention.content')}
              </p>
            </section>

            {/* Section 7: Your Rights and Choices */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{t('privacy.sections.rights.title')}</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                {t('privacy.sections.rights.intro')}
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                {(t.raw('privacy.sections.rights.items') as string[]).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
              <p className="text-muted-foreground leading-relaxed">
                <Link href="/data-deletion" className="text-primary hover:underline">
                  {t('privacy.sections.rights.dataDeletionLink')}
                </Link>
              </p>
            </section>

            {/* Section 8: Cookies and Tracking Technologies */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{t('privacy.sections.cookies.title')}</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                {t('privacy.sections.cookies.intro')}
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                {(t.raw('privacy.sections.cookies.items') as string[]).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
              <p className="text-muted-foreground leading-relaxed">
                {t('privacy.sections.cookies.note')}
              </p>
            </section>

            {/* Section 9: Third-Party Services */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{t('privacy.sections.thirdParty.title')}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {t('privacy.sections.thirdParty.content')}
              </p>
            </section>

            {/* Section 10: Children's Privacy */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{t('privacy.sections.children.title')}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {t('privacy.sections.children.content')}
              </p>
            </section>

            {/* Section 11: International Data Transfers */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{t('privacy.sections.international.title')}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {t('privacy.sections.international.content')}
              </p>
            </section>

            {/* Section 12: Changes to This Policy */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{t('privacy.sections.changes.title')}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {t('privacy.sections.changes.content')}
              </p>
            </section>

            {/* Section 13: Contact Us */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">{t('privacy.sections.contact.title')}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {t('privacy.sections.contact.content')}
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

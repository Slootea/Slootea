import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HeroVideo } from "@/components/hero-video";
import { FeatureVideo } from "@/components/feature-video";
import { ClientStoriesCarousel } from "@/components/client-stories-carousel";
import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { 
  Calendar, 
  Clock, 
  Link2, 
  CheckCircle2, 
  ArrowRight,
  BarChart3,
  Users,
  Shield,
  Sparkles,
  Quote,
  Play,
  MessageCircle,
  Bot,
  ClipboardList,
  Smartphone
} from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'landing' });
  
  const title = `Slootea - ${t('heroTitle')} ${t('heroTitleHighlight')}`;
  const description = t('heroDescription');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://slootea.com';
  
  return {
    title,
    description,
    keywords: [
      'appointment scheduling',
      'booking software',
      'no-show reduction',
      'WhatsApp booking',
      'salon software',
      'service business management',
      'AI booking assistant',
      'randevu sistemi',
      'online randevu',
    ],
    authors: [{ name: 'Slootea' }],
    creator: 'Slootea',
    publisher: 'Slootea',
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    alternates: {
      canonical: `${siteUrl}/${locale}`,
      languages: {
        en: `${siteUrl}/en`,
        tr: `${siteUrl}/tr`,
      },
    },
    openGraph: {
      type: 'website',
      locale: locale === 'tr' ? 'tr_TR' : 'en_US',
      alternateLocale: locale === 'tr' ? 'en_US' : 'tr_TR',
      url: `${siteUrl}/${locale}`,
      siteName: 'Slootea',
      title,
      description,
      images: [
        {
          url: `${siteUrl}/og-image.png`,
          width: 1200,
          height: 630,
          alt: 'Slootea - Appointment Scheduling Software',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${siteUrl}/og-image.png`],
      creator: '@slootea',
    },
  };
}

export default async function LocaleLandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await auth();
  const userId = session.userId;

  if (userId) {
    redirect("/dashboard");
  }

  const t = await getTranslations({ locale, namespace: 'landing' });
  const common = await getTranslations({ locale, namespace: 'common' });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://slootea.com';

  // JSON-LD Structured Data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: 'Slootea',
        url: siteUrl,
        logo: {
          '@type': 'ImageObject',
          url: `${siteUrl}/Slootea_logo.png`,
          width: 512,
          height: 512,
        },
        sameAs: [],
      },
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        url: siteUrl,
        name: 'Slootea',
        publisher: { '@id': `${siteUrl}/#organization` },
        inLanguage: ['en', 'tr'],
      },
      {
        '@type': 'SoftwareApplication',
        name: 'Slootea',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        description: t('heroDescription'),
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.8',
          ratingCount: '50',
        },
        featureList: [
          'AI-powered booking assistant',
          'WhatsApp confirmations',
          'Client tracking',
          'Mobile app',
          'Multi-provider scheduling',
          'No-show reduction',
        ],
      },
      {
        '@type': 'WebPage',
        '@id': `${siteUrl}/${locale}/#webpage`,
        url: `${siteUrl}/${locale}`,
        name: `Slootea - ${t('heroTitle')} ${t('heroTitleHighlight')}`,
        isPartOf: { '@id': `${siteUrl}/#website` },
        about: { '@id': `${siteUrl}/#organization` },
        description: t('heroDescription'),
        inLanguage: locale === 'tr' ? 'tr-TR' : 'en-US',
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-xl border-b border-border/40">
          <div className="container mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Image 
                src="/Slootea_logo.png" 
                alt="Slootea Logo" 
                width={36}
                height={36}
                className="h-9 w-9"
              />
              <span className="text-xl font-semibold tracking-tight">Slootea</span>
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t('nav.features')}</a>
              <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t('nav.howItWorks')}</a>
              <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t('nav.testimonials')}</a>
          </nav>
          <div className="flex items-center space-x-3">
            <LanguageSwitcher currentLocale={locale} />
            <Link href="/sign-in">
              <Button variant="ghost" size="sm" className="font-medium">{common('logIn')}</Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm" className="font-medium">{common('getStarted')}</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-20 pb-32 lg:pt-32 lg:pb-40 overflow-hidden">
          {/* Subtle gradient background */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-full blur-3xl opacity-60 pointer-events-none" />
          
          <div className="container px-6 mx-auto relative z-10">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <Badge variant="secondary" className="mb-8 px-4 py-2 text-sm font-medium rounded-full border border-border/50 bg-background/50 backdrop-blur-sm">
                  <Sparkles className="h-3.5 w-3.5 mr-2 text-primary" />
                  {t('badge')}
                </Badge>
                
                <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.1] mb-8">
                  {t('heroTitle')}{' '}
                  <span className="text-primary">
                    {t('heroTitleHighlight')}
                  </span>
                </h1>
                
                <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10">
                  {t('heroDescription')}
                </p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                  <Link href="/sign-up">
                    <Button size="lg" className="h-12 px-8 text-base font-medium shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all">
                      {t('ctaButton')}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <a href="#hero-video">
                    <Button variant="outline" size="lg" className="h-12 px-8 text-base font-medium">
                      <Play className="mr-2 h-4 w-4" />
                      {t('watchDemo')}
                    </Button>
                  </a>
                </div>
                
                {/* Trust indicators */}
                <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    {t('freeTrial')}
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    {t('setupMinutes')}
                  </div>
                </div>
              </div>
              
              {/* Hero Video */}
              <div id="hero-video" className="relative mt-16 scroll-mt-24">
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 rounded-2xl blur-2xl opacity-40" />
                <div className="relative bg-gradient-to-b from-muted/50 to-muted rounded-2xl border border-border/50 shadow-2xl overflow-hidden">
                  <HeroVideo />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why Slootea Section */}
        <section className="py-24 lg:py-32">
          <div className="container px-6 mx-auto">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <Badge variant="outline" className="px-4 py-1.5 text-sm font-medium rounded-full">
                {t('problem.badge')}
              </Badge>
            </div>
            
            {/* Benefits Grid */}
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="bg-background rounded-2xl border border-border/50 p-8 text-center hover:border-primary/30 hover:shadow-lg transition-all">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-6">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{t('problem.benefit1.title')}</h3>
                <p className="text-muted-foreground">{t('problem.benefit1.description')}</p>
              </div>
              <div className="bg-background rounded-2xl border border-border/50 p-8 text-center hover:border-primary/30 hover:shadow-lg transition-all">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-6">
                  <Bot className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{t('problem.benefit2.title')}</h3>
                <p className="text-muted-foreground">{t('problem.benefit2.description')}</p>
              </div>
              <div className="bg-background rounded-2xl border border-border/50 p-8 text-center hover:border-primary/30 hover:shadow-lg transition-all">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-6">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{t('problem.benefit3.title')}</h3>
                <p className="text-muted-foreground">{t('problem.benefit3.description')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 lg:py-32 bg-muted/30">
          <div className="container px-6 mx-auto">
            <div className="max-w-3xl mx-auto text-center mb-20">
              <Badge variant="outline" className="mb-6 px-4 py-1.5 text-sm font-medium rounded-full">
                {t('features.badge')}
              </Badge>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
                {t('features.title')}
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {t('features.subtitle')}
              </p>
            </div>

            {/* Feature 1 - AI Assistant */}
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center mb-24 lg:mb-32">
              <div className="order-2 lg:order-1">
                <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs font-medium rounded-full">
                  {t('features.aiAssistant.badge')}
                </Badge>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-6">
                  <Bot className="h-6 w-6" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold mb-4">{t('features.aiAssistant.title')}</h3>
                <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                  {t('features.aiAssistant.description')}
                </p>
                <ul className="space-y-3">
                  {['feature1', 'feature2', 'feature3'].map((key) => (
                    <li key={key} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{t(`features.aiAssistant.${key}`)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="order-1 lg:order-2">
                <FeatureVideo src="/AI_Assistant_Slootea.mp4" />
              </div>
            </div>

            {/* Feature 2 - WhatsApp Confirmation */}
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center mb-24 lg:mb-32">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl blur-xl opacity-60" />
                <div className="relative bg-gradient-to-b from-muted/50 to-muted rounded-2xl border border-border/50 overflow-hidden aspect-[4/3]">
                  <Image 
                    src="/Phone_Notification.png" 
                    alt={t('features.whatsappConfirmation.imageAlt')}
                    fill
                    className="object-cover object-center"
                  />
                </div>
              </div>
              <div>
                <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs font-medium rounded-full">
                  {t('features.whatsappConfirmation.badge')}
                </Badge>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-6">
                  <MessageCircle className="h-6 w-6" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold mb-4">{t('features.whatsappConfirmation.title')}</h3>
                <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                  {t('features.whatsappConfirmation.description')}
                </p>
                <ul className="space-y-3">
                  {['feature1', 'feature2', 'feature3'].map((key) => (
                    <li key={key} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{t(`features.whatsappConfirmation.${key}`)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Feature 3 - Client Tracking */}
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center mb-24 lg:mb-32">
              <div className="order-2 lg:order-1">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-6">
                  <ClipboardList className="h-6 w-6" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold mb-4">{t('features.clientTracking.title')}</h3>
                <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                  {t('features.clientTracking.description')}
                </p>
                <ul className="space-y-3">
                  {['feature1', 'feature2', 'feature3'].map((key) => (
                    <li key={key} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{t(`features.clientTracking.${key}`)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="order-1 lg:order-2">
                <div className="relative">
                  <div className="absolute -inset-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl blur-xl opacity-60" />
                  <div className="relative bg-gradient-to-b from-muted/50 to-muted rounded-2xl border border-border/50 overflow-hidden aspect-[4/3]">
                    <Image 
                      src="/Calendar_Demo.png" 
                      alt={t('features.clientTracking.imageAlt')}
                      fill
                      className="object-cover object-center"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 4 - Mobile App */}
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl blur-xl opacity-60" />
                <div className="relative bg-gradient-to-b from-muted/50 to-muted rounded-2xl border border-border/50 overflow-hidden aspect-[4/3]">
                  <Image 
                    src="/Phone_App.jpeg" 
                    alt={t('features.mobileApp.imageAlt')}
                    fill
                    className="object-cover object-center"
                  />
                </div>
              </div>
              <div>
                <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs font-medium rounded-full">
                  {t('features.mobileApp.badge')}
                </Badge>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-6">
                  <Smartphone className="h-6 w-6" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold mb-4">{t('features.mobileApp.title')}</h3>
                <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                  {t('features.mobileApp.description')}
                </p>
                <ul className="space-y-3">
                  {['feature1', 'feature2', 'feature3'].map((key) => (
                    <li key={key} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{t(`features.mobileApp.${key}`)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials - Commented out
        <section id="testimonials" className="py-24 lg:py-32">
          <div className="container px-6 mx-auto">
            <div className="max-w-3xl mx-auto text-center mb-20">
              <Badge variant="outline" className="mb-6 px-4 py-1.5 text-sm font-medium rounded-full">
                {t('testimonials.badge')}
              </Badge>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
                {t('testimonials.title')}
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {t('testimonials.subtitle')}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
              <TestimonialCard 
                quote={t('testimonials.testimonial1.quote')}
                author={t('testimonials.testimonial1.author')}
                role={t('testimonials.testimonial1.role')}
              />
              <TestimonialCard 
                quote={t('testimonials.testimonial2.quote')}
                author={t('testimonials.testimonial2.author')}
                role={t('testimonials.testimonial2.role')}
              />
              <TestimonialCard 
                quote={t('testimonials.testimonial3.quote')}
                author={t('testimonials.testimonial3.author')}
                role={t('testimonials.testimonial3.role')}
                className="md:col-span-2 lg:col-span-1"
              />
            </div>
          </div>
        </section>
        */}

        {/* Client Stories Section */}
        <section className="py-24 lg:py-32 border-y border-border/50 bg-muted/20">
          <div className="container px-6 mx-auto">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <Badge variant="outline" className="mb-6 px-4 py-1.5 text-sm font-medium rounded-full">
                {t('clientStories.title')}
              </Badge>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
                {t('trustedBy')}
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {t('clientStories.subtitle')}
              </p>
            </div>
            
         
            
            {/* Client Videos Carousel */}
            <ClientStoriesCarousel 
              videos={[
                { src: "/TurkanGuzellik_1.mp4", logoSrc: "/TurkanDurmazGuzellikLogo.png" },
                { src: "/TurkanGuzellik_2.mp4", logoSrc: "/TurkanDurmazGuzellikLogo.png" },
              ]}
            />
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 lg:py-32">
          <div className="container px-6 mx-auto">
            <div className="relative max-w-4xl mx-auto">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 rounded-3xl blur-2xl" />
              <div className="relative bg-gradient-to-b from-background to-muted/50 rounded-3xl border border-border/50 p-12 lg:p-16 text-center">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
                  {t('cta.title')}
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
                  {t('cta.subtitle')}
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link href="/sign-up">
                    <Button size="lg" className="h-12 px-8 text-base font-medium shadow-lg shadow-primary/20">
                      {t('cta.button')}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-muted/20">
        <div className="container px-6 py-12 lg:py-16 mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center space-x-3 mb-4">
                <Image 
                  src="/Slootea_logo.png" 
                  alt="Slootea Logo" 
                  width={32}
                  height={32}
                  className="h-8 w-8"
                />
                <span className="text-lg font-semibold">Slootea</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('footer.description')}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t('footer.product')}</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">{t('nav.features')}</a></li>
                <li><a href="#how-it-works" className="hover:text-foreground transition-colors">{t('nav.howItWorks')}</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">{t('footer.pricing')}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t('footer.company')}</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">{t('footer.about')}</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">{t('footer.blog')}</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">{t('footer.contact')}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t('footer.legal')}</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link href="/privacy" className="hover:text-foreground transition-colors">{t('footer.privacy')}</Link></li>
                <li><Link href="/terms" className="hover:text-foreground transition-colors">{t('footer.terms')}</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/50 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Slootea. {t('footer.copyright')}
            </p>
          </div>
        </div>
      </footer>
      </div>
    </>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-background rounded-2xl border border-border/50 p-6 text-center">
      <div className="text-3xl lg:text-4xl font-bold text-primary mb-2">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function FeatureCard({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
}) {
  return (
    <div className="bg-background rounded-2xl border border-border/50 p-6 hover:border-primary/30 hover:shadow-lg transition-all duration-300">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary mb-4">
        {icon}
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function FeatureImagePlaceholder({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="relative">
      <div className="absolute -inset-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl blur-xl opacity-60" />
      <div className="relative bg-gradient-to-b from-muted/50 to-muted rounded-2xl border border-border/50 overflow-hidden aspect-[4/3] flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

function StepCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground text-xl font-bold mb-6">
        {number}
      </div>
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function TestimonialCard({ 
  quote, 
  author, 
  role,
  className = ""
}: { 
  quote: string; 
  author: string; 
  role: string;
  className?: string;
}) {
  return (
    <div className={`bg-background rounded-2xl border border-border/50 p-6 lg:p-8 ${className}`}>
      <Quote className="h-8 w-8 text-primary/20 mb-4" />
      <p className="text-muted-foreground leading-relaxed mb-6">{quote}</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          <span className="text-sm font-semibold text-muted-foreground">{author.charAt(0)}</span>
        </div>
        <div>
          <p className="font-semibold text-sm">{author}</p>
          <p className="text-sm text-muted-foreground">{role}</p>
        </div>
      </div>
    </div>
  );
}

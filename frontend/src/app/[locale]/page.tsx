import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { 
  Calendar, 
  Clock, 
  Link2, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight,
  TrendingUp,
  Users
} from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'landing' });
  
  return {
    title: `Slootea - ${t('heroTitle')} ${t('heroTitleHighlight')}`,
    description: t('heroDescription'),
    alternates: {
      languages: {
        en: '/en',
        tr: '/tr',
      },
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Image 
              src="/Slootea_logo.png" 
              alt="Slootea Logo" 
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <span className="text-xl font-bold tracking-tight">Slootea</span>
          </div>
          <div className="flex items-center space-x-4">
            <LanguageSwitcher currentLocale={locale} />
            <Link href="/sign-in">
              <Button variant="ghost" className="text-sm font-medium">{common('logIn')}</Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm" className="font-medium">{common('getStarted')}</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 lg:py-32 overflow-hidden">
          <div className="container px-4 mx-auto relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm font-normal rounded-full">
                <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
                {t('badge')}
              </Badge>
              <h1 className="text-5xl font-extrabold tracking-tight sm:text-7xl mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                {t('heroTitle')} <br className="hidden sm:inline" /> 
                <span className="text-primary">{t('heroTitleHighlight')}</span>
              </h1>
              <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                {t('heroDescription')}
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/sign-up" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto text-lg h-12 px-8">
                    {t('ctaButton')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
              
              {/* Trust indicators */}
              <div className="mt-12 flex items-center justify-center space-x-8 text-muted-foreground/60">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> {t('noCreditCard')}
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> {t('freeTrial')}
                </div>
              </div>
            </div>
          </div>
          
          {/* Background decoration */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-10 bg-primary rounded-full blur-[100px] pointer-events-none" />
        </section>

        {/* Stats Section */}
        <section className="border-y bg-muted/30">
          <div className="container px-4 py-12 mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <StatItem value="30%" label={t('stats.noShowReduction')} />
              <StatItem value="24/7" label={t('stats.automatedBooking')} />
              <StatItem value="10min" label={t('stats.setupTime')} />
              <StatItem value="100%" label={t('stats.recoveryRate')} />
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-24 bg-background">
          <div className="container px-4 mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">{t('features.title')}</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {t('features.subtitle')}
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard 
                icon={<Link2 className="h-6 w-6" />}
                title={t('features.bookingLinks.title')}
                description={t('features.bookingLinks.description')}
              />
              <FeatureCard 
                icon={<Calendar className="h-6 w-6" />}
                title={t('features.availability.title')}
                description={t('features.availability.description')}
              />
              <FeatureCard 
                icon={<Clock className="h-6 w-6" />}
                title={t('features.confirmations.title')}
                description={t('features.confirmations.description')}
              />
              <FeatureCard 
                icon={<TrendingUp className="h-6 w-6" />}
                title={t('features.recovery.title')}
                description={t('features.recovery.description')}
              />
              <FeatureCard 
                icon={<Users className="h-6 w-6" />}
                title={t('features.clients.title')}
                description={t('features.clients.description')}
              />
              <FeatureCard 
                icon={<ShieldCheck className="h-6 w-6" />}
                title={t('features.security.title')}
                description={t('features.security.description')}
              />
            </div>
          </div>
        </section>

        {/* CTR Section */}
        <section className="py-24 bg-muted/50">
          <div className="container px-4 mx-auto text-center">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">{t('cta.title')}</h2>
              <p className="text-xl text-muted-foreground mb-8">
                {t('cta.subtitle')}
              </p>
              <Link href="/sign-up">
                <Button size="lg" className="text-lg h-12 px-8">
                  {t('cta.button')}
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background">
        <div className="container px-4 py-8 mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-2">
            <Image 
              src="/Slootea_logo.png" 
              alt="Slootea Logo" 
              width={24}
              height={24}
              className="h-6 w-6 grayscale opacity-80"
            />
            <span className="text-sm font-semibold text-muted-foreground">Slootea</span>
          </div>
          <div className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Slootea. {t('footer.copyright')}
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-foreground">{t('footer.privacy')}</Link>
            <Link href="#" className="hover:text-foreground">{t('footer.terms')}</Link>
            <Link href="#" className="hover:text-foreground">{t('footer.contact')}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-bold bg-primary/10 text-primary py-1 px-3 rounded-lg inline-block mb-2">
        {value}
      </div>
      <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </div>
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
    <Card className="border-none shadow-none bg-muted/30 hover:bg-muted/50 transition-colors">
      <CardHeader>
        <div className="h-12 w-12 bg-background rounded-xl flex items-center justify-center mb-4 shadow-sm text-primary">
          {icon}
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground leading-relaxed">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

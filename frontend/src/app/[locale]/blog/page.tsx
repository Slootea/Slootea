import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, User, ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getBlogPosts, BlogPostMeta } from "@/lib/blog";
import { format } from "date-fns";
import { tr, enUS } from "date-fns/locale";
import { LanguageSwitcher } from "@/components/language-switcher";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'blog' });
  
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://slootea.com';
  
  return {
    title: `${t('title')} - Slootea`,
    description: t('description'),
    alternates: {
      canonical: `${siteUrl}/${locale}/blog`,
      languages: {
        en: `${siteUrl}/en/blog`,
        tr: `${siteUrl}/tr/blog`,
      },
    },
    openGraph: {
      title: `${t('title')} - Slootea`,
      description: t('description'),
      url: `${siteUrl}/${locale}/blog`,
      siteName: 'Slootea',
      locale: locale === 'tr' ? 'tr_TR' : 'en_US',
      type: 'website',
    },
  };
}

export default async function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'blog' });
  const posts = getBlogPosts(locale);
  const dateLocale = locale === 'tr' ? tr : enUS;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href={`/${locale}`} className="flex items-center gap-2">
            <Image
              src="/Slootea_logo.png"
              alt="Slootea"
              width={36}
              height={36}
              className="h-9 w-9"
            />
            <span className="text-xl font-semibold tracking-tight">Slootea</span>
          </Link>
          <div className="flex items-center gap-4">
            <LanguageSwitcher currentLocale={locale} />
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/${locale}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('backToHome')}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{t('title')}</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('description')}
          </p>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="pb-24">
        <div className="container mx-auto px-4">
          {posts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">{t('noPosts')}</p>
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <BlogCard key={post.slug} post={post} locale={locale} dateLocale={dateLocale} t={t} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Slootea. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function BlogCard({ 
  post, 
  locale, 
  dateLocale,
  t 
}: { 
  post: BlogPostMeta; 
  locale: string; 
  dateLocale: typeof tr | typeof enUS;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const formattedDate = format(new Date(post.date), 'MMMM d, yyyy', { locale: dateLocale });

  return (
    <article className="group bg-card rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {post.image && (
        <div className="aspect-video relative overflow-hidden">
          <Image
            src={post.image}
            alt={post.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}
      <div className="p-6">
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {post.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
        <h2 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
          <Link href={`/${locale}/blog/${post.slug}`}>
            {post.title}
          </Link>
        </h2>
        <p className="text-muted-foreground mb-4 line-clamp-2">
          {post.description}
        </p>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formattedDate}
            </span>
            <span className="flex items-center gap-1">
              <User className="h-4 w-4" />
              {post.author}
            </span>
          </div>
        </div>
        <Link 
          href={`/${locale}/blog/${post.slug}`}
          className="inline-flex items-center gap-1 mt-4 text-primary font-medium hover:underline"
        >
          {t('readMore')}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}

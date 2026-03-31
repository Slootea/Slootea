import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, User, Share2, ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getBlogPost, getAllBlogSlugs, getBlogPosts } from "@/lib/blog";
import { format } from "date-fns";
import { tr, enUS } from "date-fns/locale";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Metadata } from "next";

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateStaticParams() {
  const slugs = getAllBlogSlugs();
  return slugs.map(({ slug, locale }) => ({ slug, locale }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = getBlogPost(slug, locale);
  
  if (!post) {
    return { title: 'Not Found' };
  }
  
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://slootea.com';
  
  return {
    title: `${post.title} - Slootea Blog`,
    description: post.description,
    authors: [{ name: post.author }],
    openGraph: {
      title: post.title,
      description: post.description,
      url: `${siteUrl}/${locale}/blog/${slug}`,
      siteName: 'Slootea',
      locale: locale === 'tr' ? 'tr_TR' : 'en_US',
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
      images: post.image ? [{ url: post.image }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: post.image ? [post.image] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { locale, slug } = await params;
  const post = getBlogPost(slug, locale);
  
  if (!post) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: 'blog' });
  const dateLocale = locale === 'tr' ? tr : enUS;
  const formattedDate = format(new Date(post.date), 'MMMM d, yyyy', { locale: dateLocale });

  // Get related posts (other posts in the same locale)
  const allPosts = getBlogPosts(locale);
  const relatedPosts = allPosts.filter(p => p.slug !== slug).slice(0, 2);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://slootea.com';

  // JSON-LD structured data for SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    author: {
      '@type': 'Person',
      name: post.author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Slootea',
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/Slootea_logo.png`,
      },
    },
    datePublished: post.date,
    dateModified: post.date,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${siteUrl}/${locale}/blog/${slug}`,
    },
    image: post.image ? `${siteUrl}${post.image}` : undefined,
    inLanguage: locale === 'tr' ? 'tr-TR' : 'en-US',
    keywords: post.tags?.join(', '),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
              <Link href={`/${locale}/blog`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('backToBlog')}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Article */}
      <article className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            {/* Article Header */}
            <header className="mb-8">
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {post.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                {post.title}
              </h1>
              <p className="text-xl text-muted-foreground mb-6">
                {post.description}
              </p>
              <div className="flex items-center gap-6 text-muted-foreground">
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {post.author}
                </span>
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formattedDate}
                </span>
              </div>
            </header>

            {/* Featured Image */}
            {post.image && (
              <div className="aspect-video relative rounded-xl overflow-hidden mb-8">
                <Image
                  src={post.image}
                  alt={post.title}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            )}

            {/* Article Content */}
            <div 
              className="prose prose-lg dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: parseMarkdown(post.content) }}
            />

            {/* Share Section */}
            <div className="mt-12 pt-8 border-t">
              <div className="flex items-center justify-between">
                <Button variant="outline" asChild>
                  <Link href={`/${locale}/blog`}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t('backToBlog')}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </article>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="py-12 border-t">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold mb-8 text-center">{t('relatedPosts')}</h2>
            <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
              {relatedPosts.map((relatedPost) => (
                <Link
                  key={relatedPost.slug}
                  href={`/${locale}/blog/${relatedPost.slug}`}
                  className="group bg-card rounded-xl border p-6 hover:shadow-md transition-shadow"
                >
                  <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                    {relatedPost.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {relatedPost.description}
                  </p>
                  <span className="inline-flex items-center gap-1 mt-3 text-sm text-primary font-medium">
                    {t('readMore')}
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Slootea. All rights reserved.</p>
        </div>
      </footer>
      </div>
    </>
  );
}

/**
 * Simple markdown parser for rendering blog content
 * Handles basic markdown syntax without external dependencies
 */
function parseMarkdown(content: string): string {
  let html = content;

  // Escape HTML special characters first (except in code blocks)
  // We'll handle this more carefully per element

  // Code blocks (must be first to protect their content)
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
    const escapedCode = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<pre><code class="language-${lang || 'text'}">${escapedCode}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, (_, code) => {
    const escapedCode = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<code>${escapedCode}</code>`;
  });

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="rounded-lg" />');

  // Unordered lists
  html = html.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr />');

  // Paragraphs (lines that aren't already wrapped)
  html = html.replace(/^(?!<[a-z]|$)(.+)$/gm, '<p>$1</p>');

  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');

  return html;
}

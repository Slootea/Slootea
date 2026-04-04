import { getBlogPosts, getAllBlogSlugs } from '@/lib/blog';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://slootea.com';

interface SitemapEntry {
  url: string;
  lastModified: Date;
  changeFrequency: 'weekly' | 'monthly';
  priority: number;
}

function generateSiteMap(entries: SitemapEntry[]) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (entry) => `  <url>
    <loc>${entry.url}</loc>
    <lastmod>${entry.lastModified.toISOString()}</lastmod>
    <changefreq>${entry.changeFrequency}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;
}

export async function GET() {
  const lastModified = new Date();

  // Static pages
  const staticPages: SitemapEntry[] = [
    {
      url: siteUrl,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${siteUrl}/en`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${siteUrl}/tr`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${siteUrl}/en/blog`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${siteUrl}/tr/blog`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${siteUrl}/terms`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  // Blog posts
  const blogSlugs = getAllBlogSlugs();
  const blogPages: SitemapEntry[] = blogSlugs.map(({ slug, locale }) => {
    const posts = getBlogPosts(locale);
    const post = posts.find((p) => p.slug === slug);
    return {
      url: `${siteUrl}/${locale}/blog/${slug}`,
      lastModified: post ? new Date(post.date) : lastModified,
      changeFrequency: 'monthly',
      priority: 0.7,
    };
  });

  const sitemap = generateSiteMap([...staticPages, ...blogPages]);

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'text/xml',
    },
  });
}

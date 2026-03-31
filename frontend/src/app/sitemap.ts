import { MetadataRoute } from 'next';
import { getBlogPosts, getAllBlogSlugs } from '@/lib/blog';

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://slootea.com';
  const lastModified = new Date();

  // Static pages
  const staticPages = [
    {
      url: siteUrl,
      lastModified,
      changeFrequency: 'weekly' as const,
      priority: 1,
    },
    {
      url: `${siteUrl}/en`,
      lastModified,
      changeFrequency: 'weekly' as const,
      priority: 1,
    },
    {
      url: `${siteUrl}/tr`,
      lastModified,
      changeFrequency: 'weekly' as const,
      priority: 1,
    },
    {
      url: `${siteUrl}/en/blog`,
      lastModified,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${siteUrl}/tr/blog`,
      lastModified,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.3,
    },
    {
      url: `${siteUrl}/terms`,
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.3,
    },
  ];

  // Blog posts
  const blogSlugs = getAllBlogSlugs();
  const blogPages = blogSlugs.map(({ slug, locale }) => {
    const posts = getBlogPosts(locale);
    const post = posts.find(p => p.slug === slug);
    return {
      url: `${siteUrl}/${locale}/blog/${slug}`,
      lastModified: post ? new Date(post.date) : lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    };
  });

  return [...staticPages, ...blogPages];
}

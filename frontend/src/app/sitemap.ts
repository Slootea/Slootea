import type { MetadataRoute } from 'next';
import { getBlogPosts, getAllBlogSlugs } from '@/lib/blog';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://slootea.com';

export async function generateSitemaps() {
  // Generate sitemap IDs: 0 = static pages, 1 = blog posts
  return [{ id: 0 }, { id: 1 }];
}

export default async function sitemap(props: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const id = Number(await props.id);
  const lastModified = new Date();

  // Sitemap 0: Static pages
  if (id === 0) {
    return [
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
  }

  // Sitemap 1: Blog posts
  const blogSlugs = getAllBlogSlugs();
  return blogSlugs.map(({ slug, locale }) => {
    const posts = getBlogPosts(locale);
    const post = posts.find((p) => p.slug === slug);
    return {
      url: `${siteUrl}/${locale}/blog/${slug}`,
      lastModified: post ? new Date(post.date) : lastModified,
      changeFrequency: 'monthly',
      priority: 0.7,
    };
  });
}

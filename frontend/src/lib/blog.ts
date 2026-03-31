import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export interface BlogPost {
  slug: string;
  locale: string;
  title: string;
  description: string;
  date: string;
  author: string;
  image?: string;
  tags?: string[];
  content: string;
}

export interface BlogPostMeta {
  slug: string;
  locale: string;
  title: string;
  description: string;
  date: string;
  author: string;
  image?: string;
  tags?: string[];
}

const BLOG_DIR = path.join(process.cwd(), 'src/content/blog');

/**
 * Get all blog posts for a specific locale
 */
export function getBlogPosts(locale: string): BlogPostMeta[] {
  const localeDir = path.join(BLOG_DIR, locale);
  
  if (!fs.existsSync(localeDir)) {
    return [];
  }

  const files = fs.readdirSync(localeDir).filter(file => file.endsWith('.md'));

  const posts = files.map(file => {
    const slug = file.replace(/\.md$/, '');
    const filePath = path.join(localeDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data } = matter(fileContent);

    return {
      slug,
      locale,
      title: data.title || slug,
      description: data.description || '',
      date: data.date || new Date().toISOString(),
      author: data.author || 'Slootea Team',
      image: data.image,
      tags: data.tags || [],
    };
  });

  // Sort by date (newest first)
  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Get a single blog post by slug and locale
 */
export function getBlogPost(slug: string, locale: string): BlogPost | null {
  const filePath = path.join(BLOG_DIR, locale, `${slug}.md`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(fileContent);

  return {
    slug,
    locale,
    title: data.title || slug,
    description: data.description || '',
    date: data.date || new Date().toISOString(),
    author: data.author || 'Slootea Team',
    image: data.image,
    tags: data.tags || [],
    content,
  };
}

/**
 * Get all blog post slugs for static generation
 */
export function getAllBlogSlugs(): { slug: string; locale: string }[] {
  const slugs: { slug: string; locale: string }[] = [];
  const locales = ['en', 'tr'];

  for (const locale of locales) {
    const localeDir = path.join(BLOG_DIR, locale);
    
    if (!fs.existsSync(localeDir)) {
      continue;
    }

    const files = fs.readdirSync(localeDir).filter(file => file.endsWith('.md'));
    
    for (const file of files) {
      slugs.push({
        slug: file.replace(/\.md$/, ''),
        locale,
      });
    }
  }

  return slugs;
}

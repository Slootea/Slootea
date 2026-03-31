# Adding Blog Posts

To add a new blog post:

1. Create a markdown file in `src/content/blog/{locale}/` where `{locale}` is `en`, `tr`, or any other supported locale
2. Add frontmatter at the top of the file with required fields
3. Write your content in markdown format below the frontmatter

## File Structure

```
src/content/blog/
├── en/
│   ├── my-first-post.md
│   └── another-post.md
└── tr/
    ├── ilk-yazim.md
    └── baska-yazi.md
```

## Frontmatter Template

```markdown
---
title: "Your Post Title"
description: "A brief description for SEO and post cards"
date: "2024-03-15"
author: "Author Name"
image: "/blog/your-image.jpg"  # Optional: Featured image
tags: ["Tag1", "Tag2"]         # Optional: Post tags
---

Your markdown content here...
```

## Required Fields

| Field | Description |
|-------|-------------|
| `title` | The post title (used in page title and cards) |
| `description` | Brief description for SEO meta tags and post previews |
| `date` | Publication date in YYYY-MM-DD format |
| `author` | Author name (defaults to "Slootea Team" if not specified) |

## Optional Fields

| Field | Description |
|-------|-------------|
| `image` | Path to featured image (relative to /public) |
| `tags` | Array of tags for categorization |

## Supported Markdown

The blog supports standard markdown:

- **Bold** and *italic* text
- # Headers (h1-h3)
- [Links](url)
- ![Images](url)
- `inline code`
- ```code blocks```
- - Unordered lists
- 1. Ordered lists
- > Blockquotes
- --- Horizontal rules

## Images

Place blog images in `/public/blog/` and reference them as `/blog/image-name.jpg`

## Localization

Blog posts are NOT automatically translated. Each locale has its own posts:
- English posts go in `src/content/blog/en/`
- Turkish posts go in `src/content/blog/tr/`

The slug (filename without .md) determines the URL:
- `/en/blog/my-post` for `src/content/blog/en/my-post.md`
- `/tr/blog/yazim` for `src/content/blog/tr/yazim.md`

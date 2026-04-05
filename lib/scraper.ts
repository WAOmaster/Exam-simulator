import * as cheerio from 'cheerio';

export interface ScrapedContent {
  url: string;
  title: string;
  text: string;
  metadata?: {
    description?: string;
    author?: string;
    publishDate?: string;
  };
}

/**
 * Scrape content from a URL
 */
export async function scrapeURL(url: string): Promise<ScrapedContent> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove script and style tags
    $('script, style, nav, header, footer, iframe, .ad, .advertisement').remove();

    // Extract title
    const title = $('title').text() || $('h1').first().text() || 'Untitled';

    // Extract main content
    // Try to find main content area
    let text = '';
    const mainContent = $('main, article, .content, .main-content, #content, .post-content');

    if (mainContent.length > 0) {
      text = mainContent.text();
    } else {
      // Fallback to body if no main content area found
      text = $('body').text();
    }

    // Clean up whitespace
    text = text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();

    // Extract metadata
    const description = $('meta[name="description"]').attr('content') ||
                       $('meta[property="og:description"]').attr('content');
    const author = $('meta[name="author"]').attr('content') ||
                  $('meta[property="article:author"]').attr('content');
    const publishDate = $('meta[property="article:published_time"]').attr('content') ||
                       $('time').first().attr('datetime');

    return {
      url,
      title: title.trim(),
      text,
      metadata: {
        description,
        author,
        publishDate,
      },
    };
  } catch (error) {
    throw new Error(`Failed to scrape URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Scrape multiple URLs and combine their content
 */
export async function scrapeMultipleURLs(urls: string[]): Promise<ScrapedContent[]> {
  const results = await Promise.allSettled(
    urls.map(url => scrapeURL(url))
  );

  const scrapedContent: ScrapedContent[] = [];
  const errors: string[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      scrapedContent.push(result.value);
    } else {
      errors.push(`Failed to scrape ${urls[index]}: ${result.reason}`);
    }
  });

  if (errors.length > 0) {
    console.warn('Some URLs failed to scrape:', errors);
  }

  return scrapedContent;
}

/**
 * Combine scraped content from multiple sources
 */
export function combineScrapedContent(contents: ScrapedContent[]): string {
  return contents
    .map(content => `\n\n=== ${content.title} ===\n${content.text}`)
    .join('\n\n');
}

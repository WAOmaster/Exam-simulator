import { NextRequest, NextResponse } from 'next/server';
import { scrapeURL, scrapeMultipleURLs, combineScrapedContent } from '@/lib/scraper';
import { ScrapeResponse } from '@/lib/types';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { urls } = body;

    if (!urls || (Array.isArray(urls) && urls.length === 0)) {
      return NextResponse.json(
        { success: false, error: 'No URLs provided', content: '', url: '' } as ScrapeResponse,
        { status: 400 }
      );
    }

    // Handle single URL or multiple URLs
    if (typeof urls === 'string') {
      // Single URL
      const scraped = await scrapeURL(urls);

      return NextResponse.json({
        success: true,
        content: scraped.text,
        url: scraped.url,
        title: scraped.title,
      } as ScrapeResponse);
    } else if (Array.isArray(urls)) {
      // Multiple URLs
      const scrapedContents = await scrapeMultipleURLs(urls);

      if (scrapedContents.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to scrape all URLs',
            content: '',
            url: '',
          } as ScrapeResponse,
          { status: 500 }
        );
      }

      // Combine all scraped content
      const combinedText = combineScrapedContent(scrapedContents);

      return NextResponse.json({
        success: true,
        content: combinedText,
        url: urls.join(', '),
        title: `${scrapedContents.length} URLs scraped`,
      } as ScrapeResponse);
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid URLs format',
          content: '',
          url: '',
        } as ScrapeResponse,
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Scraping error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to scrape URL(s)',
        content: '',
        url: '',
      } as ScrapeResponse,
      { status: 500 }
    );
  }
}

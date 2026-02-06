import { CrawlResult } from './types';

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;

interface BraveSearchResult {
  title: string;
  url: string;
  description?: string;
}

interface BraveSearchResponse {
  web?: {
    results: BraveSearchResult[];
  };
}

// Email regex pattern
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export async function searchBrave(query: string, count: number = 10): Promise<BraveSearchResult[]> {
  if (!BRAVE_API_KEY) {
    throw new Error('BRAVE_API_KEY not configured');
  }

  const url = new URL('https://api.search.brave.com/res/v1/web/search');
  url.searchParams.set('q', query);
  url.searchParams.set('count', count.toString());
  url.searchParams.set('search_lang', 'en');

  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'X-Subscription-Token': BRAVE_API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`Brave search failed: ${response.status} ${response.statusText}`);
  }

  const data: BraveSearchResponse = await response.json();
  return data.web?.results || [];
}

export function extractEmails(text: string): string[] {
  const matches = text.match(EMAIL_REGEX) || [];
  // Filter out common false positives
  const filtered = matches.filter(email => {
    const lower = email.toLowerCase();
    return !lower.includes('example.com') &&
           !lower.includes('domain.com') &&
           !lower.includes('email.com') &&
           !lower.endsWith('.png') &&
           !lower.endsWith('.jpg') &&
           !lower.endsWith('.gif');
  });
  return [...new Set(filtered)];
}

export async function fetchPageContent(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NostrScout/1.0)',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return '';
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return '';
    }

    return await response.text();
  } catch {
    return '';
  }
}

export async function crawlQuery(query: string): Promise<CrawlResult[]> {
  const results: CrawlResult[] = [];
  
  // Search using Brave
  const searchResults = await searchBrave(query, 20);
  
  // Process each result
  for (const result of searchResults) {
    let emails: string[] = [];
    
    // Extract emails from description
    if (result.description) {
      emails = extractEmails(result.description);
    }
    
    // If no emails in description, try fetching the page
    if (emails.length === 0) {
      const content = await fetchPageContent(result.url);
      if (content) {
        emails = extractEmails(content);
      }
    }
    
    results.push({
      url: result.url,
      title: result.title,
      description: result.description,
      emails,
    });
  }
  
  return results;
}

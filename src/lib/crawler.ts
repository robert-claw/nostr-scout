import { CrawlResult, ContactInfo, SearchTarget, SearchSource, LeadSource, LeadQuality } from './types';
import { searchPerplexity, improveQuery as improveQueryWithPerplexity } from './perplexity';
import { validateLeadData } from './validator';

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

// Regex patterns for different contact types
const PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{2,4}[-.\s]?\d{2,4}(?:[-.\s]?\d{2,4})?/g,
  whatsapp: /(?:wa\.me\/|whatsapp\.com\/|whatsapp:\/\/send\?phone=)(\+?\d{10,15})/gi,
  // Only match actual platform URLs - bare @handles are ambiguous
  instagram: /(?:instagram\.com\/)([a-zA-Z0-9._]{1,30})(?![a-zA-Z0-9._])/gi,
  github: /(?:github\.com\/)([a-zA-Z0-9-]{1,39})(?:\/|\s|$)/gi,
  twitter: /(?:twitter\.com\/|x\.com\/)([a-zA-Z0-9_]{1,15})(?![a-zA-Z0-9_])/gi,
  linkedin: /(?:linkedin\.com\/(?:in|company)\/)([a-zA-Z0-9-]+)/gi,
  telegram: /(?:t\.me\/|telegram\.me\/)([a-zA-Z0-9_]{5,32})/gi,
  discord: /(?:discord\.gg\/|discord\.com\/invite\/)([a-zA-Z0-9-]+)/gi,
  website: /https?:\/\/(?:www\.)?([a-zA-Z0-9][-a-zA-Z0-9]{0,62}(?:\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+)(?:\/[^\s]*)?/gi,
};

// Blocked domains for email filtering
const BLOCKED_EMAIL_DOMAINS = [
  'example.com', 'domain.com', 'email.com', 'test.com',
  'sentry.io', 'w3.org', 'schema.org', 'googleapis.com',
  'cloudflare.com', 'gravatar.com', 'wp.com',
];

// Blocked handles (common false positives from HTML/CSS/JS parsing)
const BLOCKED_HANDLES = [
  // Social platforms
  'instagram', 'twitter', 'facebook', 'linkedin', 'github',
  'youtube', 'tiktok', 'pinterest', 'snapchat', 'reddit',
  // Common page sections
  'home', 'about', 'contact', 'privacy', 'terms', 'legal',
  'login', 'signup', 'register', 'settings', 'profile', 'account',
  'search', 'share', 'intent', 'hashtag', 'status', 'media',
  'blog', 'news', 'help', 'support', 'faq', 'careers', 'jobs',
  // HTML/CSS/JS junk - VERY COMMON FALSE POSITIVES
  'page', 'class', 'data', 'count', 'title', 'name', 'type',
  'id', 'div', 'span', 'link', 'href', 'src', 'img', 'alt',
  'style', 'script', 'head', 'body', 'html', 'meta', 'form',
  'input', 'button', 'label', 'value', 'text', 'content',
  'width', 'height', 'size', 'color', 'font', 'border',
  'margin', 'padding', 'display', 'flex', 'grid', 'block',
  'none', 'auto', 'center', 'left', 'right', 'top', 'bottom',
  'true', 'false', 'null', 'undefined', 'object', 'array',
  'item', 'items', 'list', 'menu', 'nav', 'header', 'footer',
  'main', 'section', 'article', 'aside', 'wrapper', 'container',
  'row', 'col', 'column', 'card', 'box', 'panel', 'modal',
  'icon', 'image', 'logo', 'avatar', 'thumb', 'thumbnail',
  'btn', 'button', 'submit', 'cancel', 'close', 'open',
  'active', 'disabled', 'hidden', 'visible', 'show', 'hide',
  'loading', 'error', 'success', 'warning', 'info', 'alert',
  'primary', 'secondary', 'default', 'custom', 'static',
  // Version numbers and semver-like patterns
  'version', 'v1', 'v2', 'v3', 'beta', 'alpha', 'latest',
  // Generic words that aren't real usernames
  'user', 'users', 'admin', 'test', 'demo', 'example', 'sample',
  'new', 'old', 'first', 'last', 'next', 'prev', 'previous',
  'more', 'less', 'all', 'any', 'some', 'other', 'another',
  'this', 'that', 'here', 'there', 'where', 'what', 'how',
  'app', 'api', 'web', 'site', 'url', 'path', 'route', 'endpoint',
];

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

function cleanPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  // Must have at least 7 digits and at most 15
  if (digits.length < 7 || digits.length > 15) return null;
  return digits;
}

function cleanHandle(handle: string): string | null {
  const clean = handle.toLowerCase().replace(/^@/, '');
  
  // Too short
  if (clean.length < 2) return null;
  
  // Check blocked list
  if (BLOCKED_HANDLES.includes(clean)) return null;
  
  // Filter patterns that look like junk (version numbers, CSS classes, etc.)
  const junkPatterns = [
    /^[0-9]+$/,           // Only numbers
    /^[0-9.]+$/,          // Version numbers like 0.9.14
    /^v?\d+\.\d+/,        // Semver-like v1.2.3
    /^[a-z]{1,2}$/,       // Single or double letters
    /^\d+[a-z]+$/i,       // Numbers + word
    /^[a-z]+\d+$/i,       // word + numbers like page1
    /^(item|data|class|page|type|name|value|count|index|node|row|col)_?\d*$/i,
  ];
  
  for (const pattern of junkPatterns) {
    if (pattern.test(clean)) return null;
  }
  
  // Must start with a letter (most real usernames do)
  if (!/^[a-z]/i.test(clean)) return null;
  
  return clean;
}

export function extractContacts(text: string, sourceUrl: string, targets: SearchTarget[]): ContactInfo {
  const contacts: ContactInfo = {
    emails: [],
    phones: [],
    websites: [],
    whatsapp: [],
    instagram: [],
    github: [],
    twitter: [],
    linkedin: [],
    telegram: [],
    discord: [],
  };

  // Extract emails
  if (targets.includes('emails')) {
    const emails = text.match(PATTERNS.email) || [];
    contacts.emails = [...new Set(emails.filter(email => {
      const lower = email.toLowerCase();
      const domain = lower.split('@')[1];
      return !BLOCKED_EMAIL_DOMAINS.some(blocked => domain?.includes(blocked)) &&
             !lower.endsWith('.png') &&
             !lower.endsWith('.jpg') &&
             !lower.endsWith('.gif') &&
             !lower.endsWith('.svg');
    }))];
  }

  // Extract phones
  if (targets.includes('phones')) {
    const phones = text.match(PATTERNS.phone) || [];
    const cleaned = phones.map(cleanPhone).filter(Boolean) as string[];
    contacts.phones = [...new Set(cleaned)];
  }

  // Extract WhatsApp
  if (targets.includes('whatsapp')) {
    let match;
    const whatsappPattern = new RegExp(PATTERNS.whatsapp.source, 'gi');
    while ((match = whatsappPattern.exec(text)) !== null) {
      const num = match[1]?.replace(/\D/g, '');
      if (num && num.length >= 10) {
        contacts.whatsapp.push(num);
      }
    }
    // Also check for WhatsApp links in text
    const waLinks = text.match(/wa\.me\/\d+/gi) || [];
    waLinks.forEach(link => {
      const num = link.replace('wa.me/', '');
      if (num.length >= 10 && !contacts.whatsapp.includes(num)) {
        contacts.whatsapp.push(num);
      }
    });
    contacts.whatsapp = [...new Set(contacts.whatsapp)];
  }

  // Extract Instagram
  if (targets.includes('instagram')) {
    let match;
    const igPattern = new RegExp(PATTERNS.instagram.source, 'gi');
    while ((match = igPattern.exec(text)) !== null) {
      const handle = cleanHandle(match[1]);
      if (handle) contacts.instagram.push(handle);
    }
    contacts.instagram = [...new Set(contacts.instagram)];
  }

  // Extract GitHub
  if (targets.includes('github')) {
    let match;
    const ghPattern = new RegExp(PATTERNS.github.source, 'gi');
    while ((match = ghPattern.exec(text)) !== null) {
      const handle = cleanHandle(match[1]);
      if (handle) contacts.github.push(handle);
    }
    contacts.github = [...new Set(contacts.github)];
  }

  // Extract Twitter/X
  if (targets.includes('twitter')) {
    let match;
    const twPattern = new RegExp(PATTERNS.twitter.source, 'gi');
    while ((match = twPattern.exec(text)) !== null) {
      const handle = cleanHandle(match[1]);
      if (handle) contacts.twitter.push(handle);
    }
    contacts.twitter = [...new Set(contacts.twitter)];
  }

  // Extract LinkedIn
  if (targets.includes('linkedin')) {
    let match;
    const liPattern = new RegExp(PATTERNS.linkedin.source, 'gi');
    while ((match = liPattern.exec(text)) !== null) {
      const handle = match[1];
      if (handle && handle.length > 1) contacts.linkedin.push(handle);
    }
    contacts.linkedin = [...new Set(contacts.linkedin)];
  }

  // Extract Telegram
  if (targets.includes('telegram')) {
    let match;
    const tgPattern = new RegExp(PATTERNS.telegram.source, 'gi');
    while ((match = tgPattern.exec(text)) !== null) {
      const handle = cleanHandle(match[1]);
      if (handle) contacts.telegram.push(handle);
    }
    contacts.telegram = [...new Set(contacts.telegram)];
  }

  // Extract Discord
  if (targets.includes('discord')) {
    let match;
    const dcPattern = new RegExp(PATTERNS.discord.source, 'gi');
    while ((match = dcPattern.exec(text)) !== null) {
      const invite = match[1];
      if (invite) contacts.discord.push(invite);
    }
    contacts.discord = [...new Set(contacts.discord)];
  }

  // Extract websites - ONLY main/official websites, not random links
  if (targets.includes('websites')) {
    const sourceDomain = new URL(sourceUrl).hostname.replace('www.', '');
    
    // Domains to always skip (CDNs, trackers, social, etc.)
    const skipDomains = [
      // Same domain
      sourceDomain,
      // Social media
      'facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com',
      'youtube.com', 'tiktok.com', 'pinterest.com', 'reddit.com',
      't.me', 'telegram.me', 'wa.me', 'whatsapp.com',
      'discord.com', 'discord.gg', 'github.com', 'gitlab.com',
      // Search/Tech giants
      'google.com', 'googleapis.com', 'gstatic.com', 'googleusercontent.com',
      'apple.com', 'microsoft.com', 'amazon.com', 'amazonaws.com',
      // CDNs and hosting
      'cloudflare.com', 'cloudflare-ipfs.com', 'cloudfront.net',
      'akamaihd.net', 'fastly.net', 'jsdelivr.net', 'unpkg.com',
      'cdnjs.com', 'bootstrapcdn.com', 'fontawesome.com',
      // Analytics and tracking
      'google-analytics.com', 'googletagmanager.com', 'doubleclick.net',
      'facebook.net', 'fbcdn.net', 'hotjar.com', 'mixpanel.com',
      'segment.com', 'amplitude.com', 'intercom.io', 'crisp.chat',
      // Ad networks
      'googlesyndication.com', 'googleadservices.com', 'adsense.com',
      // Standards and schemas
      'w3.org', 'schema.org', 'json-ld.org', 'xmlns.com',
      // Common platforms (not personal websites)
      'medium.com', 'substack.com', 'wordpress.com', 'blogger.com',
      'wix.com', 'squarespace.com', 'weebly.com', 'godaddy.com',
      'shopify.com', 'etsy.com', 'ebay.com', 'paypal.com', 'stripe.com',
      'gravatar.com', 'wp.com', 'feedburner.com',
      // Dev tools
      'sentry.io', 'bugsnag.com', 'logrocket.com', 'newrelic.com',
      'datadog.com', 'splunk.com', 'elastic.co',
      // File hosting
      'dropbox.com', 'drive.google.com', 'box.com', 'onedrive.com',
      // Images/media
      'imgur.com', 'giphy.com', 'tenor.com', 'unsplash.com', 'pexels.com',
    ];
    
    // Only look for proper website links (not just any URL)
    let match;
    const urlPattern = new RegExp(PATTERNS.website.source, 'gi');
    const potentialWebsites: string[] = [];
    
    while ((match = urlPattern.exec(text)) !== null) {
      try {
        const url = new URL(match[0]);
        const domain = url.hostname.replace('www.', '');
        const fullUrl = url.origin; // Just the domain, no path junk
        
        // Skip blocked domains
        if (skipDomains.some(d => domain.includes(d))) continue;
        
        // Skip URLs with suspicious paths (likely not main websites)
        const path = url.pathname.toLowerCase();
        if (path.includes('/cdn/') || path.includes('/static/') ||
            path.includes('/assets/') || path.includes('/images/') ||
            path.includes('/js/') || path.includes('/css/') ||
            path.includes('/api/') || path.includes('/feed') ||
            path.includes('/rss') || path.includes('/sitemap') ||
            path.endsWith('.js') || path.endsWith('.css') ||
            path.endsWith('.png') || path.endsWith('.jpg') ||
            path.endsWith('.gif') || path.endsWith('.svg') ||
            path.endsWith('.woff') || path.endsWith('.ttf')) {
          continue;
        }
        
        // Prefer root domains or simple paths
        if (url.pathname === '/' || url.pathname === '' || url.pathname.split('/').length <= 2) {
          potentialWebsites.push(fullUrl);
        }
      } catch {
        // Invalid URL, skip
      }
    }
    
    // Dedupe and limit to max 3 unique domains
    const uniqueDomains = new Map<string, string>();
    for (const url of potentialWebsites) {
      try {
        const domain = new URL(url).hostname.replace('www.', '');
        if (!uniqueDomains.has(domain)) {
          uniqueDomains.set(domain, url);
        }
      } catch {}
    }
    contacts.websites = [...uniqueDomains.values()].slice(0, 3);
  }

  // Validate and clean all extracted data
  const validated = validateLeadData(contacts);
  
  return {
    emails: validated.emails,
    phones: validated.phones,
    websites: validated.websites,
    whatsapp: validated.whatsapp,
    instagram: validated.instagram,
    github: validated.github,
    twitter: validated.twitter,
    linkedin: validated.linkedin,
    telegram: validated.telegram,
    discord: validated.discord,
  };
}

export async function fetchPageContent(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LeadScout/1.0)',
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

function hasAnyContact(contacts: ContactInfo): boolean {
  return Object.values(contacts).some(arr => arr.length > 0);
}

export interface ExtendedCrawlResult extends CrawlResult {
  source: LeadSource;
  quality: LeadQuality;
  tags: string[];
  relevanceScore?: number;
}

function calculateQuality(contacts: ContactInfo, hasDescription: boolean): LeadQuality {
  const contactCount = Object.values(contacts).reduce((sum, arr) => sum + arr.length, 0);
  const hasEmail = contacts.emails.length > 0;
  const hasSocial = contacts.linkedin.length > 0 || contacts.twitter.length > 0;
  
  if (contactCount >= 3 && hasEmail && hasDescription) return 'high';
  if (contactCount >= 2 || hasEmail) return 'medium';
  return 'low';
}

export async function crawlQuery(
  query: string,
  targets: SearchTarget[],
  sources: SearchSource[] = ['brave'],
  projectContext?: string
): Promise<ExtendedCrawlResult[]> {
  const results: ExtendedCrawlResult[] = [];
  const seenUrls = new Set<string>();
  
  // Search using Brave
  if (sources.includes('brave') || sources.includes('all')) {
    try {
      const searchResults = await searchBrave(query, 20);
      
      for (const result of searchResults) {
        if (seenUrls.has(result.url)) continue;
        seenUrls.add(result.url);
        
        let contacts: ContactInfo = {
          emails: [], phones: [], websites: [], whatsapp: [],
          instagram: [], github: [], twitter: [], linkedin: [],
          telegram: [], discord: [],
        };
        
        if (result.description) {
          contacts = extractContacts(result.description, result.url, targets);
        }
        
        if (!hasAnyContact(contacts)) {
          const content = await fetchPageContent(result.url);
          if (content) {
            contacts = extractContacts(content, result.url, targets);
          }
        }
        
        results.push({
          url: result.url,
          title: result.title,
          description: result.description,
          contacts,
          source: 'brave',
          quality: calculateQuality(contacts, !!result.description),
          tags: ['brave-search'],
        });
      }
    } catch (error) {
      console.error('Brave search error:', error);
    }
  }
  
  // Search using Perplexity
  if (sources.includes('perplexity') || sources.includes('all')) {
    try {
      const perplexityResults = await searchPerplexity(query, targets, projectContext);
      
      for (const result of perplexityResults) {
        if (seenUrls.has(result.url)) {
          // Merge with existing result
          const existing = results.find(r => r.url === result.url);
          if (existing) {
            // Merge contacts
            for (const [key, values] of Object.entries(result.contacts)) {
              const existingArr = existing.contacts[key as keyof ContactInfo];
              existing.contacts[key as keyof ContactInfo] = [...new Set([...existingArr, ...values])];
            }
            existing.tags = [...new Set([...existing.tags, ...result.tags, 'perplexity'])];
            existing.relevanceScore = result.relevanceScore;
            existing.quality = calculateQuality(existing.contacts, !!existing.description);
          }
          continue;
        }
        seenUrls.add(result.url);
        
        results.push({
          url: result.url,
          title: result.title,
          description: result.description,
          contacts: result.contacts,
          source: 'perplexity',
          quality: calculateQuality(result.contacts, !!result.description),
          tags: [...result.tags, 'perplexity'],
          relevanceScore: result.relevanceScore,
        });
      }
    } catch (error) {
      console.error('Perplexity search error:', error);
    }
  }
  
  // Sort by quality and relevance
  results.sort((a, b) => {
    const qualityOrder = { high: 3, medium: 2, low: 1 };
    const qualityDiff = qualityOrder[b.quality] - qualityOrder[a.quality];
    if (qualityDiff !== 0) return qualityDiff;
    return (b.relevanceScore || 0) - (a.relevanceScore || 0);
  });
  
  return results;
}

// Re-export improveQuery from perplexity
export { improveQueryWithPerplexity as improveQuery };

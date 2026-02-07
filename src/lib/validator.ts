// Lead validation - check if URLs and social profiles are real

const TIMEOUT = 5000;

// Check if a URL returns a valid response (not 404/error)
async function checkUrl(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT);
    
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });
    
    clearTimeout(timeout);
    
    // Check status
    if (res.status === 404 || res.status === 410) return false;
    if (res.status >= 500) return false;
    
    return true;
  } catch {
    return false;
  }
}

// Check if a social profile exists by checking the profile URL
async function checkSocialProfile(platform: string, handle: string): Promise<boolean> {
  const urls: Record<string, string> = {
    instagram: `https://www.instagram.com/${handle}/`,
    twitter: `https://twitter.com/${handle}`,
    github: `https://github.com/${handle}`,
    linkedin: `https://www.linkedin.com/in/${handle}/`,
    telegram: `https://t.me/${handle}`,
  };
  
  const url = urls[platform];
  if (!url) return true; // Can't validate, assume valid
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT);
    
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    
    clearTimeout(timeout);
    
    // Platform-specific checks
    if (platform === 'instagram') {
      // Instagram returns 200 but with specific content for non-existent users
      if (res.status === 404) return false;
      const text = await res.text();
      // Check for "Page Not Found" or "Sorry, this page isn't available"
      if (text.includes("Sorry, this page isn't available") || 
          text.includes("Page Not Found") ||
          text.includes('"user":null')) {
        return false;
      }
    }
    
    if (platform === 'twitter') {
      // Twitter/X returns 404 for non-existent users
      if (res.status === 404) return false;
      // Check for "This account doesn't exist"
      const text = await res.text();
      if (text.includes("This account doesn't exist") ||
          text.includes("Account suspended")) {
        return false;
      }
    }
    
    if (platform === 'github') {
      // GitHub returns 404 for non-existent users
      if (res.status === 404) return false;
    }
    
    if (platform === 'linkedin') {
      // LinkedIn often requires login, but 404 means doesn't exist
      if (res.status === 404) return false;
    }
    
    if (platform === 'telegram') {
      // Telegram returns specific page for non-existent users
      if (res.status === 404) return false;
      const text = await res.text();
      if (text.includes("If you have <strong>Telegram</strong>, you can contact")) {
        return true; // User exists
      }
      if (text.includes("can view and join") || text.includes("Preview channel")) {
        return true; // Channel/group exists
      }
    }
    
    // Default: consider valid if not 404
    return res.status !== 404;
  } catch {
    // Network error - can't validate, assume valid to not lose data
    return true;
  }
}

// Validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return false;
  
  // Filter out common junk patterns
  const junkPatterns = [
    /^(info|contact|hello|support|admin|noreply|no-reply|sales|team|help)@/i,
    /@(example|test|localhost)\./i,
    /\.(png|jpg|jpeg|gif|svg|css|js)$/i,
    /@sentry\./i,
    /@wix\./i,
    /@mailchimp\./i,
  ];
  
  for (const pattern of junkPatterns) {
    if (pattern.test(email)) return false;
  }
  
  return true;
}

// Validate phone number format
function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-\.\(\)]/g, '');
  const digitsOnly = cleaned.replace(/\D/g, '');
  
  if (digitsOnly.length < 7 || digitsOnly.length > 15) return false;
  
  const junkPatterns = [
    /^0{7,}$/,
    /^1{7,}$/,
    /^123456/,
    /^000000/,
  ];
  
  for (const pattern of junkPatterns) {
    if (pattern.test(digitsOnly)) return false;
  }
  
  return true;
}

// Common HTML/CSS/JS words that get falsely matched as handles
const JUNK_HANDLES = new Set([
  // HTML/CSS/JS junk
  'page', 'class', 'data', 'count', 'title', 'name', 'type', 'value',
  'id', 'div', 'span', 'link', 'href', 'src', 'img', 'alt', 'url',
  'style', 'script', 'head', 'body', 'html', 'meta', 'form', 'text',
  'input', 'button', 'label', 'content', 'item', 'items', 'list',
  'width', 'height', 'size', 'color', 'font', 'border', 'display',
  'margin', 'padding', 'flex', 'grid', 'block', 'none', 'auto',
  'center', 'left', 'right', 'top', 'bottom', 'true', 'false',
  'null', 'undefined', 'object', 'array', 'string', 'number',
  'menu', 'nav', 'header', 'footer', 'main', 'section', 'article',
  'aside', 'wrapper', 'container', 'row', 'col', 'column', 'card',
  'box', 'panel', 'modal', 'icon', 'image', 'logo', 'avatar',
  'thumb', 'thumbnail', 'btn', 'submit', 'cancel', 'close', 'open',
  'active', 'disabled', 'hidden', 'visible', 'show', 'hide', 'toggle',
  'loading', 'error', 'success', 'warning', 'info', 'alert', 'message',
  'primary', 'secondary', 'default', 'custom', 'static', 'dynamic',
  // Social platform names
  'instagram', 'twitter', 'facebook', 'linkedin', 'github', 'youtube',
  'tiktok', 'pinterest', 'snapchat', 'reddit', 'whatsapp', 'telegram',
  // Common page sections
  'home', 'about', 'contact', 'privacy', 'terms', 'legal', 'blog',
  'login', 'signup', 'register', 'settings', 'profile', 'account',
  'search', 'share', 'intent', 'hashtag', 'status', 'media', 'post',
  'news', 'help', 'support', 'faq', 'careers', 'jobs', 'store', 'shop',
  // Generic junk
  'user', 'users', 'admin', 'test', 'demo', 'example', 'sample', 'app',
  'new', 'old', 'first', 'last', 'next', 'prev', 'previous', 'api',
  'more', 'less', 'all', 'any', 'some', 'other', 'another', 'web',
  'version', 'beta', 'alpha', 'latest', 'release', 'update', 'site',
]);

// Validate social handle format
function isValidSocialHandle(handle: string): boolean {
  const cleaned = handle.replace(/^@/, '').toLowerCase();
  
  // Length check
  if (cleaned.length < 2 || cleaned.length > 30) return false;
  
  // Must be alphanumeric with underscores/dots
  if (!/^[a-zA-Z0-9._-]+$/.test(cleaned)) return false;
  
  // Check against junk list
  if (JUNK_HANDLES.has(cleaned)) return false;
  
  // Filter patterns that look like junk
  const junkPatterns = [
    /^[0-9]+$/,               // Only numbers
    /^[0-9.]+$/,              // Version numbers like 0.9.14
    /^v?\d+\.\d+/,            // Semver-like v1.2.3
    /^[a-z]{1,3}$/,           // Single letters or very short
    /^(test|example|user|admin|null|undefined|username|yourname)$/i,
    /^(item|data|class|page|type|name|value|count|index|node)_?\d*$/i,
    /^\d{4,}$/,               // Long numbers
    /^[a-z]+\d+$/i,           // word + numbers like page1, item2
    /^\d+[a-z]+$/i,           // numbers + word
  ];
  
  for (const pattern of junkPatterns) {
    if (pattern.test(cleaned)) return false;
  }
  
  // Must start with a letter (most real usernames do)
  if (!/^[a-zA-Z]/.test(cleaned)) return false;
  
  return true;
}

// Validate website URL
function isValidWebsite(url: string): boolean {
  try {
    const parsed = new URL(url);
    
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    
    const junkDomains = [
      'example.com', 'localhost', 'test.com', 'sentry.io',
      'google.com/search', 'facebook.com/sharer',
      'twitter.com/intent', 'linkedin.com/sharing',
    ];
    
    for (const junk of junkDomains) {
      if (parsed.hostname.includes(junk) || parsed.href.includes(junk)) return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

export interface ValidationResult {
  emails: string[];
  phones: string[];
  websites: string[];
  instagram: string[];
  github: string[];
  twitter: string[];
  linkedin: string[];
  telegram: string[];
  discord: string[];
  whatsapp: string[];
  removedCount: number;
}

export interface LeadData {
  emails?: string[];
  phones?: string[];
  websites?: string[];
  instagram?: string[];
  github?: string[];
  twitter?: string[];
  linkedin?: string[];
  telegram?: string[];
  discord?: string[];
  whatsapp?: string[];
}

// Basic validation (format only) - fast
export function validateLeadData(data: LeadData): ValidationResult {
  let removedCount = 0;
  
  const validateArray = (items: string[] | undefined, validator: (item: string) => boolean): string[] => {
    if (!items) return [];
    const unique = [...new Set(items)];
    const valid = unique.filter(item => {
      const isValid = validator(item);
      if (!isValid) removedCount++;
      return isValid;
    });
    return valid;
  };
  
  return {
    emails: validateArray(data.emails, isValidEmail),
    phones: validateArray(data.phones, isValidPhone),
    websites: validateArray(data.websites, isValidWebsite),
    instagram: validateArray(data.instagram, isValidSocialHandle),
    github: validateArray(data.github, isValidSocialHandle),
    twitter: validateArray(data.twitter, isValidSocialHandle),
    linkedin: validateArray(data.linkedin, isValidSocialHandle),
    telegram: validateArray(data.telegram, isValidSocialHandle),
    discord: validateArray(data.discord, isValidSocialHandle),
    whatsapp: validateArray(data.whatsapp, isValidPhone),
    removedCount,
  };
}

// Deep validation - actually check if links/profiles exist (slower but accurate)
export async function deepValidateLeadData(data: LeadData): Promise<ValidationResult> {
  const basicResult = validateLeadData(data);
  let removedCount = basicResult.removedCount;
  
  // Helper to validate social profiles
  async function validateSocialArray(items: string[], platform: string): Promise<string[]> {
    const valid: string[] = [];
    for (const handle of items.slice(0, 5)) { // Limit to 5 to avoid slowdown
      const exists = await checkSocialProfile(platform, handle);
      if (exists) {
        valid.push(handle);
      } else {
        removedCount++;
        console.log(`[Validator] Removed invalid ${platform}: ${handle}`);
      }
    }
    return valid;
  }
  
  // Validate websites
  const validWebsites: string[] = [];
  for (const url of basicResult.websites.slice(0, 3)) {
    if (await checkUrl(url)) {
      validWebsites.push(url);
    } else {
      removedCount++;
      console.log(`[Validator] Removed invalid website: ${url}`);
    }
  }
  
  // Validate social profiles in parallel (with some rate limiting)
  const [instagram, twitter, github, linkedin, telegram] = await Promise.all([
    validateSocialArray(basicResult.instagram, 'instagram'),
    validateSocialArray(basicResult.twitter, 'twitter'),
    validateSocialArray(basicResult.github, 'github'),
    validateSocialArray(basicResult.linkedin, 'linkedin'),
    validateSocialArray(basicResult.telegram, 'telegram'),
  ]);
  
  return {
    emails: basicResult.emails,
    phones: basicResult.phones,
    websites: validWebsites,
    instagram,
    twitter,
    github,
    linkedin,
    telegram,
    discord: basicResult.discord, // Can't easily validate Discord invites
    whatsapp: basicResult.whatsapp,
    removedCount,
  };
}

// Validate a single social profile URL
export async function validateSocialUrl(url: string): Promise<{ valid: boolean; platform?: string; handle?: string }> {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace('www.', '');
    
    let platform: string | undefined;
    let handle: string | undefined;
    
    if (host.includes('instagram.com')) {
      platform = 'instagram';
      handle = parsed.pathname.replace(/^\//, '').replace(/\/$/, '').split('/')[0];
    } else if (host.includes('twitter.com') || host.includes('x.com')) {
      platform = 'twitter';
      handle = parsed.pathname.replace(/^\//, '').split('/')[0];
    } else if (host.includes('github.com')) {
      platform = 'github';
      handle = parsed.pathname.replace(/^\//, '').split('/')[0];
    } else if (host.includes('linkedin.com')) {
      platform = 'linkedin';
      const match = parsed.pathname.match(/\/in\/([^\/]+)/);
      handle = match?.[1];
    } else if (host.includes('t.me') || host.includes('telegram.me')) {
      platform = 'telegram';
      handle = parsed.pathname.replace(/^\//, '').split('/')[0];
    }
    
    if (!platform || !handle) {
      // Can't validate, check if URL is reachable
      const valid = await checkUrl(url);
      return { valid };
    }
    
    const valid = await checkSocialProfile(platform, handle);
    return { valid, platform, handle };
  } catch {
    return { valid: false };
  }
}

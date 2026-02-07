// Script to clean existing leads with improved validation
const fs = require('fs');

const LEADS_FILE = './data/leads.json';

// Junk handles to filter out
const JUNK_HANDLES = new Set([
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
  'instagram', 'twitter', 'facebook', 'linkedin', 'github', 'youtube',
  'tiktok', 'pinterest', 'snapchat', 'reddit', 'whatsapp', 'telegram',
  'home', 'about', 'contact', 'privacy', 'terms', 'legal', 'blog',
  'login', 'signup', 'register', 'settings', 'profile', 'account',
  'search', 'share', 'intent', 'hashtag', 'status', 'media', 'post',
  'news', 'help', 'support', 'faq', 'careers', 'jobs', 'store', 'shop',
  'user', 'users', 'admin', 'test', 'demo', 'example', 'sample', 'app',
  'new', 'old', 'first', 'last', 'next', 'prev', 'previous', 'api',
  'more', 'less', 'all', 'any', 'some', 'other', 'another', 'web',
  'version', 'beta', 'alpha', 'latest', 'release', 'update', 'site',
  'jordi', // specific junk from the example
]);

// Blocked website domains
const BLOCKED_DOMAINS = [
  'facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com',
  'youtube.com', 'tiktok.com', 'pinterest.com', 'reddit.com',
  't.me', 'telegram.me', 'wa.me', 'whatsapp.com',
  'discord.com', 'discord.gg', 'github.com', 'gitlab.com',
  'google.com', 'googleapis.com', 'gstatic.com', 'googleusercontent.com',
  'apple.com', 'microsoft.com', 'amazon.com', 'amazonaws.com',
  'cloudflare.com', 'cloudfront.net', 'akamaihd.net', 'fastly.net',
  'jsdelivr.net', 'unpkg.com', 'cdnjs.com', 'bootstrapcdn.com',
  'google-analytics.com', 'googletagmanager.com', 'doubleclick.net',
  'facebook.net', 'fbcdn.net', 'hotjar.com', 'mixpanel.com',
  'w3.org', 'schema.org', 'json-ld.org',
  'medium.com', 'substack.com', 'wordpress.com', 'blogger.com',
  'wix.com', 'squarespace.com', 'gravatar.com', 'wp.com',
  'sentry.io', 'bugsnag.com', 'logrocket.com',
  'dropbox.com', 'imgur.com', 'giphy.com',
];

function isValidHandle(handle) {
  if (!handle) return false;
  const clean = handle.toLowerCase().replace(/^@/, '');
  
  if (clean.length < 2) return false;
  if (JUNK_HANDLES.has(clean)) return false;
  
  // Version numbers, CSS junk
  if (/^[0-9]+$/.test(clean)) return false;
  if (/^[0-9.]+$/.test(clean)) return false;
  if (/^v?\d+\.\d+/.test(clean)) return false;
  if (/^[a-z]{1,2}$/.test(clean)) return false;
  if (/^\d+[a-z]+$/i.test(clean)) return false;
  if (/^[a-z]+\d+$/i.test(clean)) return false;
  if (/^(item|data|class|page|type|name|value|count|index|node|row|col)_?\d*$/i.test(clean)) return false;
  
  // Must start with a letter
  if (!/^[a-z]/i.test(clean)) return false;
  
  return true;
}

function isValidWebsite(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname.replace('www.', '');
    
    // Check blocked domains
    for (const blocked of BLOCKED_DOMAINS) {
      if (domain.includes(blocked)) return false;
    }
    
    // Skip CDN/asset paths
    const path = parsed.pathname.toLowerCase();
    if (path.includes('/cdn/') || path.includes('/static/') ||
        path.includes('/assets/') || path.includes('/images/') ||
        path.endsWith('.js') || path.endsWith('.css') ||
        path.endsWith('.png') || path.endsWith('.jpg')) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

function isValidEmail(email) {
  if (!email) return false;
  const lower = email.toLowerCase();
  
  // Generic emails
  if (/^(info|contact|hello|support|admin|noreply|no-reply|sales|team|help)@/i.test(lower)) return false;
  if (/@(example|test|localhost)\./.test(lower)) return false;
  if (/\.(png|jpg|jpeg|gif|svg|css|js)$/i.test(lower)) return false;
  if (/@sentry\./.test(lower)) return false;
  if (/@wix\./.test(lower)) return false;
  if (/@github\.com$/.test(lower)) return false;
  
  return true;
}

// Load and clean leads
const leads = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf-8'));

let totalRemoved = 0;
const cleanedLeads = leads.map(lead => {
  const before = {
    emails: lead.emails?.length || 0,
    instagram: lead.instagram?.length || 0,
    twitter: lead.twitter?.length || 0,
    github: lead.github?.length || 0,
    linkedin: lead.linkedin?.length || 0,
    telegram: lead.telegram?.length || 0,
    websites: lead.websites?.length || 0,
  };
  
  // Clean arrays
  if (lead.emails) lead.emails = lead.emails.filter(isValidEmail);
  if (lead.instagram) lead.instagram = lead.instagram.filter(isValidHandle);
  if (lead.twitter) lead.twitter = lead.twitter.filter(isValidHandle);
  if (lead.github) lead.github = lead.github.filter(isValidHandle);
  if (lead.linkedin) lead.linkedin = lead.linkedin.filter(isValidHandle);
  if (lead.telegram) lead.telegram = lead.telegram.filter(isValidHandle);
  if (lead.discord) lead.discord = lead.discord.filter(isValidHandle);
  if (lead.websites) lead.websites = lead.websites.filter(isValidWebsite);
  
  const after = {
    emails: lead.emails?.length || 0,
    instagram: lead.instagram?.length || 0,
    twitter: lead.twitter?.length || 0,
    github: lead.github?.length || 0,
    linkedin: lead.linkedin?.length || 0,
    telegram: lead.telegram?.length || 0,
    websites: lead.websites?.length || 0,
  };
  
  const removed = Object.keys(before).reduce((sum, key) => sum + (before[key] - after[key]), 0);
  totalRemoved += removed;
  
  if (removed > 0) {
    console.log(`Cleaned "${lead.title.substring(0, 40)}...": removed ${removed} junk items`);
  }
  
  return lead;
});

// Save cleaned leads
fs.writeFileSync(LEADS_FILE, JSON.stringify(cleanedLeads, null, 2));

console.log(`\n✅ Done! Removed ${totalRemoved} total junk items from ${leads.length} leads.`);

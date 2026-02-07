export interface Project {
  id: string;
  name: string;
  description?: string;
  // Search context for filtering results
  context?: string;  // e.g., "AI development agency looking for startups needing AI MVPs"
  targetKeywords?: string[];
  excludeKeywords?: string[];
  industry?: string;
  createdAt: string;
  updatedAt: string;
}

export type SearchTarget = 
  | 'emails'
  | 'phones'
  | 'websites'
  | 'whatsapp'
  | 'instagram'
  | 'github'
  | 'twitter'
  | 'linkedin'
  | 'telegram'
  | 'discord';

export type SearchSource = 'brave' | 'perplexity' | 'all';

export interface Query {
  id: string;
  projectId: string;
  searchTerm: string;
  improvedQuery?: string;  // AI-improved version
  targets: SearchTarget[];  // What to look for
  sources: SearchSource[];  // Where to search
  status: 'pending' | 'running' | 'completed' | 'failed';
  lastRun?: string;
  resultCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContactInfo {
  emails: string[];
  phones: string[];
  websites: string[];
  whatsapp: string[];
  instagram: string[];
  github: string[];
  twitter: string[];
  linkedin: string[];
  telegram: string[];
  discord: string[];
}

export type LeadSource = 'brave' | 'perplexity' | 'enriched' | 'manual';
export type LeadQuality = 'low' | 'medium' | 'high';

export interface Lead {
  id: string;
  queryId: string;
  projectId: string;
  url: string;
  title: string;
  description?: string;
  // Contact info
  emails: string[];
  phones: string[];
  websites: string[];
  whatsapp: string[];
  instagram: string[];
  github: string[];
  twitter: string[];
  linkedin: string[];
  telegram: string[];
  discord: string[];
  // Meta
  source: LeadSource;
  sources: LeadSource[];  // All sources that contributed
  quality: LeadQuality;
  tags: string[];
  relevanceScore?: number;  // 0-100
  enrichedAt?: string;
  enrichmentData?: {
    companyInfo?: string;
    industry?: string;
    size?: string;
    funding?: string;
    techStack?: string[];
    keyPeople?: { name: string; role: string; contact?: string }[];
  };
  status: 'new' | 'contacted' | 'replied' | 'converted' | 'rejected';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CrawlResult {
  url: string;
  title: string;
  description?: string;
  contacts: ContactInfo;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Helper to get icon/color for each target
export const TARGET_CONFIG: Record<SearchTarget, { label: string; color: string }> = {
  emails: { label: 'Emails', color: 'cyan' },
  phones: { label: 'Phone Numbers', color: 'emerald' },
  websites: { label: 'Websites', color: 'blue' },
  whatsapp: { label: 'WhatsApp', color: 'green' },
  instagram: { label: 'Instagram', color: 'pink' },
  github: { label: 'GitHub', color: 'slate' },
  twitter: { label: 'Twitter/X', color: 'sky' },
  linkedin: { label: 'LinkedIn', color: 'blue' },
  telegram: { label: 'Telegram', color: 'sky' },
  discord: { label: 'Discord', color: 'indigo' },
};

export const ALL_TARGETS: SearchTarget[] = [
  'emails',
  'phones', 
  'websites',
  'whatsapp',
  'instagram',
  'github',
  'twitter',
  'linkedin',
  'telegram',
  'discord',
];

// Directory Types
export type EntityType = 'person' | 'organization' | 'book' | 'product' | 'event' | 'place';

export interface DirectoryEntity {
  id: string;
  projectId: string;
  queryId: string;
  type: EntityType;
  name: string;
  image?: string;
  description?: string;
  // Person-specific
  title?: string;      // Job title
  role?: string;       // Role/position
  company?: string;
  // Organization-specific
  industry?: string;
  size?: string;       // e.g., "50-200 employees"
  founded?: string;
  headquarters?: string;
  // Book-specific
  author?: string;
  publisher?: string;
  year?: string;
  isbn?: string;
  // Product-specific
  category?: string;
  price?: string;
  // Contact/links
  website?: string;
  email?: string;
  twitter?: string;
  linkedin?: string;
  // Meta
  source: string;      // Where we found this
  sourceUrl?: string;
  tags: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DirectoryQuery {
  id: string;
  projectId: string;
  searchTerm: string;
  entityType: EntityType | 'all';
  status: 'pending' | 'running' | 'completed' | 'failed';
  lastRun?: string;
  resultCount: number;
  createdAt: string;
  updatedAt: string;
}

export const ENTITY_TYPE_CONFIG: Record<EntityType, { label: string; icon: string; color: string }> = {
  person: { label: 'People', icon: 'User', color: 'cyan' },
  organization: { label: 'Organizations', icon: 'Building2', color: 'blue' },
  book: { label: 'Books', icon: 'BookOpen', color: 'amber' },
  product: { label: 'Products', icon: 'Package', color: 'emerald' },
  event: { label: 'Events', icon: 'Calendar', color: 'violet' },
  place: { label: 'Places', icon: 'MapPin', color: 'rose' },
};

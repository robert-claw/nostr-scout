import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Lead, LeadSource, LeadQuality } from './types';

const DATA_PATH = path.join(process.cwd(), 'data', 'leads.json');

async function readLeads(): Promise<Lead[]> {
  try {
    const data = await fs.readFile(DATA_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeLeads(leads: Lead[]): Promise<void> {
  await fs.writeFile(DATA_PATH, JSON.stringify(leads, null, 2));
}

export async function getAllLeads(): Promise<Lead[]> {
  return readLeads();
}

export async function getLeadsByQuery(queryId: string): Promise<Lead[]> {
  const leads = await readLeads();
  return leads.filter(l => l.queryId === queryId);
}

export async function getLeadsByProject(projectId: string): Promise<Lead[]> {
  const leads = await readLeads();
  return leads.filter(l => l.projectId === projectId);
}

export async function getLeadById(id: string): Promise<Lead | null> {
  const leads = await readLeads();
  return leads.find(l => l.id === id) || null;
}

interface CreateLeadData {
  queryId: string;
  projectId: string;
  url: string;
  title: string;
  description?: string;
  emails: string[];
  phones?: string[];
  websites?: string[];
  whatsapp?: string[];
  instagram?: string[];
  github?: string[];
  twitter?: string[];
  linkedin?: string[];
  telegram?: string[];
  discord?: string[];
  source: LeadSource;
  quality?: LeadQuality;
  tags?: string[];
  relevanceScore?: number;
}

// Merge arrays, keeping unique values
function mergeArrays(existing: string[] | undefined, newItems: string[] | undefined): string[] {
  return [...new Set([...(existing || []), ...(newItems || [])])];
}

export async function createLead(data: CreateLeadData): Promise<Lead> {
  const leads = await readLeads();
  const now = new Date().toISOString();
  
  // Check for duplicate URL
  const existing = leads.find(l => l.url === data.url);
  if (existing) {
    // Update existing lead with new contact info
    existing.emails = mergeArrays(existing.emails, data.emails);
    existing.phones = mergeArrays(existing.phones, data.phones);
    existing.websites = mergeArrays(existing.websites, data.websites);
    existing.whatsapp = mergeArrays(existing.whatsapp, data.whatsapp);
    existing.instagram = mergeArrays(existing.instagram, data.instagram);
    existing.github = mergeArrays(existing.github, data.github);
    existing.twitter = mergeArrays(existing.twitter, data.twitter);
    existing.linkedin = mergeArrays(existing.linkedin, data.linkedin);
    existing.telegram = mergeArrays(existing.telegram, data.telegram);
    existing.discord = mergeArrays(existing.discord, data.discord);
    existing.tags = mergeArrays(existing.tags, data.tags);
    existing.sources = mergeArrays(existing.sources, [data.source]) as LeadSource[];
    if (data.relevanceScore && (!existing.relevanceScore || data.relevanceScore > existing.relevanceScore)) {
      existing.relevanceScore = data.relevanceScore;
    }
    if (data.quality === 'high' || (data.quality === 'medium' && existing.quality === 'low')) {
      existing.quality = data.quality;
    }
    existing.updatedAt = now;
    await writeLeads(leads);
    return existing;
  }
  
  const lead: Lead = {
    id: `lead_${uuidv4().slice(0, 8)}`,
    queryId: data.queryId,
    projectId: data.projectId,
    url: data.url,
    title: data.title,
    description: data.description,
    emails: data.emails || [],
    phones: data.phones || [],
    websites: data.websites || [],
    whatsapp: data.whatsapp || [],
    instagram: data.instagram || [],
    github: data.github || [],
    twitter: data.twitter || [],
    linkedin: data.linkedin || [],
    telegram: data.telegram || [],
    discord: data.discord || [],
    source: data.source,
    sources: [data.source],
    quality: data.quality || 'medium',
    tags: data.tags || [],
    relevanceScore: data.relevanceScore,
    status: 'new',
    createdAt: now,
    updatedAt: now,
  };
  
  leads.push(lead);
  await writeLeads(leads);
  return lead;
}

export async function updateLead(
  id: string, 
  data: Partial<Lead>
): Promise<Lead | null> {
  const leads = await readLeads();
  const index = leads.findIndex(l => l.id === id);
  
  if (index === -1) return null;
  
  leads[index] = {
    ...leads[index],
    ...data,
    updatedAt: new Date().toISOString(),
  };
  
  await writeLeads(leads);
  return leads[index];
}

export async function deleteLead(id: string): Promise<boolean> {
  const leads = await readLeads();
  const filtered = leads.filter(l => l.id !== id);
  
  if (filtered.length === leads.length) return false;
  
  await writeLeads(filtered);
  return true;
}

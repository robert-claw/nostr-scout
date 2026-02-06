import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Lead } from './types';

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

export async function createLead(data: {
  queryId: string;
  projectId: string;
  url: string;
  title: string;
  description?: string;
  emails: string[];
  source: string;
}): Promise<Lead> {
  const leads = await readLeads();
  const now = new Date().toISOString();
  
  // Check for duplicate URL
  const existing = leads.find(l => l.url === data.url);
  if (existing) {
    // Update existing lead with new emails
    const newEmails = [...new Set([...existing.emails, ...data.emails])];
    existing.emails = newEmails;
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
    emails: data.emails,
    source: data.source,
    status: 'new',
    createdAt: now,
    updatedAt: now,
  };
  
  leads.push(lead);
  await writeLeads(leads);
  return lead;
}

export async function updateLead(id: string, data: Partial<Pick<Lead, 'status' | 'notes' | 'emails'>>): Promise<Lead | null> {
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

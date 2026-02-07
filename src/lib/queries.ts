import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Query, SearchTarget, SearchSource } from './types';

const DATA_PATH = path.join(process.cwd(), 'data', 'queries.json');

async function readQueries(): Promise<Query[]> {
  try {
    const data = await fs.readFile(DATA_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeQueries(queries: Query[]): Promise<void> {
  await fs.writeFile(DATA_PATH, JSON.stringify(queries, null, 2));
}

export async function getAllQueries(): Promise<Query[]> {
  return readQueries();
}

export async function getQueriesByProject(projectId: string): Promise<Query[]> {
  const queries = await readQueries();
  return queries.filter(q => q.projectId === projectId);
}

export async function getQueryById(id: string): Promise<Query | null> {
  const queries = await readQueries();
  return queries.find(q => q.id === id) || null;
}

export async function createQuery(data: { 
  projectId: string; 
  searchTerm: string; 
  improvedQuery?: string;
  targets?: SearchTarget[];
  sources?: SearchSource[];
}): Promise<Query> {
  const queries = await readQueries();
  const now = new Date().toISOString();
  
  const query: Query = {
    id: `query_${uuidv4().slice(0, 8)}`,
    projectId: data.projectId,
    searchTerm: data.searchTerm,
    improvedQuery: data.improvedQuery,
    targets: data.targets || ['emails'],
    sources: data.sources || ['all'],
    status: 'pending',
    resultCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  
  queries.push(query);
  await writeQueries(queries);
  return query;
}

export async function updateQuery(
  id: string, 
  data: Partial<Pick<Query, 'searchTerm' | 'status' | 'lastRun' | 'resultCount' | 'targets'>>
): Promise<Query | null> {
  const queries = await readQueries();
  const index = queries.findIndex(q => q.id === id);
  
  if (index === -1) return null;
  
  queries[index] = {
    ...queries[index],
    ...data,
    updatedAt: new Date().toISOString(),
  };
  
  await writeQueries(queries);
  return queries[index];
}

export async function deleteQuery(id: string): Promise<boolean> {
  const queries = await readQueries();
  const filtered = queries.filter(q => q.id !== id);
  
  if (filtered.length === queries.length) return false;
  
  await writeQueries(filtered);
  return true;
}

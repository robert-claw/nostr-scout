import { readFileSync, writeFileSync, existsSync } from 'fs';
import { DirectoryEntity, DirectoryQuery } from './types';

const ENTITIES_FILE = './data/directory-entities.json';
const QUERIES_FILE = './data/directory-queries.json';

function ensureDataDir() {
  const fs = require('fs');
  if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data', { recursive: true });
  }
}

// Entities
export function getDirectoryEntities(projectId?: string, queryId?: string, type?: string): DirectoryEntity[] {
  ensureDataDir();
  if (!existsSync(ENTITIES_FILE)) return [];
  
  try {
    const data = JSON.parse(readFileSync(ENTITIES_FILE, 'utf-8'));
    let entities = data.entities || [];
    
    if (projectId) {
      entities = entities.filter((e: DirectoryEntity) => e.projectId === projectId);
    }
    if (queryId) {
      entities = entities.filter((e: DirectoryEntity) => e.queryId === queryId);
    }
    if (type && type !== 'all') {
      entities = entities.filter((e: DirectoryEntity) => e.type === type);
    }
    
    return entities;
  } catch {
    return [];
  }
}

export function getDirectoryEntity(id: string): DirectoryEntity | null {
  const entities = getDirectoryEntities();
  return entities.find(e => e.id === id) || null;
}

export function saveDirectoryEntity(entity: DirectoryEntity): DirectoryEntity {
  ensureDataDir();
  const entities = getDirectoryEntities();
  const existingIndex = entities.findIndex(e => e.id === entity.id);
  
  if (existingIndex >= 0) {
    entities[existingIndex] = { ...entities[existingIndex], ...entity, updatedAt: new Date().toISOString() };
  } else {
    entities.push(entity);
  }
  
  writeFileSync(ENTITIES_FILE, JSON.stringify({ entities }, null, 2));
  return existingIndex >= 0 ? entities[existingIndex] : entity;
}

export function saveDirectoryEntities(newEntities: DirectoryEntity[]): void {
  ensureDataDir();
  const entities = getDirectoryEntities();
  
  for (const entity of newEntities) {
    const existingIndex = entities.findIndex(e => e.id === entity.id);
    if (existingIndex >= 0) {
      entities[existingIndex] = { ...entities[existingIndex], ...entity, updatedAt: new Date().toISOString() };
    } else {
      entities.push(entity);
    }
  }
  
  writeFileSync(ENTITIES_FILE, JSON.stringify({ entities }, null, 2));
}

export function deleteDirectoryEntity(id: string): boolean {
  const entities = getDirectoryEntities();
  const filtered = entities.filter(e => e.id !== id);
  
  if (filtered.length === entities.length) return false;
  
  writeFileSync(ENTITIES_FILE, JSON.stringify({ entities: filtered }, null, 2));
  return true;
}

// Directory Queries
export function getDirectoryQueries(projectId?: string): DirectoryQuery[] {
  ensureDataDir();
  if (!existsSync(QUERIES_FILE)) return [];
  
  try {
    const data = JSON.parse(readFileSync(QUERIES_FILE, 'utf-8'));
    let queries = data.queries || [];
    
    if (projectId) {
      queries = queries.filter((q: DirectoryQuery) => q.projectId === projectId);
    }
    
    return queries;
  } catch {
    return [];
  }
}

export function getDirectoryQuery(id: string): DirectoryQuery | null {
  const queries = getDirectoryQueries();
  return queries.find(q => q.id === id) || null;
}

export function saveDirectoryQuery(query: DirectoryQuery): DirectoryQuery {
  ensureDataDir();
  const queries = getDirectoryQueries();
  const existingIndex = queries.findIndex(q => q.id === query.id);
  
  if (existingIndex >= 0) {
    queries[existingIndex] = { ...queries[existingIndex], ...query, updatedAt: new Date().toISOString() };
  } else {
    queries.push(query);
  }
  
  writeFileSync(QUERIES_FILE, JSON.stringify({ queries }, null, 2));
  return existingIndex >= 0 ? queries[existingIndex] : query;
}

export function deleteDirectoryQuery(id: string): boolean {
  const queries = getDirectoryQueries();
  const filtered = queries.filter(q => q.id !== id);
  
  if (filtered.length === queries.length) return false;
  
  writeFileSync(QUERIES_FILE, JSON.stringify({ queries: filtered }, null, 2));
  return true;
}

import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Project } from './types';

const DATA_PATH = path.join(process.cwd(), 'data', 'projects.json');

async function readProjects(): Promise<Project[]> {
  try {
    const data = await fs.readFile(DATA_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeProjects(projects: Project[]): Promise<void> {
  await fs.writeFile(DATA_PATH, JSON.stringify(projects, null, 2));
}

export async function getAllProjects(): Promise<Project[]> {
  return readProjects();
}

export async function getProjectById(id: string): Promise<Project | null> {
  const projects = await readProjects();
  return projects.find(p => p.id === id) || null;
}

export async function createProject(data: { name: string; description?: string }): Promise<Project> {
  const projects = await readProjects();
  const now = new Date().toISOString();
  
  const project: Project = {
    id: `proj_${uuidv4().slice(0, 8)}`,
    name: data.name,
    description: data.description,
    createdAt: now,
    updatedAt: now,
  };
  
  projects.push(project);
  await writeProjects(projects);
  return project;
}

export async function updateProject(id: string, data: Partial<Pick<Project, 'name' | 'description'>>): Promise<Project | null> {
  const projects = await readProjects();
  const index = projects.findIndex(p => p.id === id);
  
  if (index === -1) return null;
  
  projects[index] = {
    ...projects[index],
    ...data,
    updatedAt: new Date().toISOString(),
  };
  
  await writeProjects(projects);
  return projects[index];
}

export async function deleteProject(id: string): Promise<boolean> {
  const projects = await readProjects();
  const filtered = projects.filter(p => p.id !== id);
  
  if (filtered.length === projects.length) return false;
  
  await writeProjects(filtered);
  return true;
}

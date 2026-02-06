export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Query {
  id: string;
  projectId: string;
  searchTerm: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  lastRun?: string;
  resultCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  id: string;
  queryId: string;
  projectId: string;
  url: string;
  title: string;
  description?: string;
  emails: string[];
  source: string;
  status: 'new' | 'contacted' | 'replied' | 'converted' | 'rejected';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CrawlResult {
  url: string;
  title: string;
  description?: string;
  emails: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

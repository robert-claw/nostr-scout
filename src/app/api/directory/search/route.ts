import { NextRequest, NextResponse } from 'next/server';
import { saveDirectoryQuery, saveDirectoryEntities, getDirectoryQuery } from '@/lib/directory';
import { DirectoryEntity, DirectoryQuery, EntityType } from '@/lib/types';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

interface PerplexityEntity {
  name: string;
  type: EntityType;
  description?: string;
  image?: string;
  title?: string;
  role?: string;
  company?: string;
  industry?: string;
  size?: string;
  founded?: string;
  headquarters?: string;
  author?: string;
  publisher?: string;
  year?: string;
  website?: string;
  email?: string;
  twitter?: string;
  linkedin?: string;
  tags?: string[];
}

async function searchEntitiesWithPerplexity(
  searchTerm: string,
  entityType: EntityType | 'all'
): Promise<PerplexityEntity[]> {
  if (!PERPLEXITY_API_KEY) {
    throw new Error('PERPLEXITY_API_KEY not configured');
  }

  const typePrompt = entityType === 'all' 
    ? 'people, organizations, books, products, events, or places'
    : entityType === 'person' ? 'people/individuals'
    : entityType === 'organization' ? 'companies/organizations'
    : entityType === 'book' ? 'books/publications'
    : entityType === 'product' ? 'products/services'
    : entityType === 'event' ? 'events/conferences'
    : 'places/locations';

  const prompt = `Search for ${typePrompt} related to: "${searchTerm}"

Return a JSON array of entities with this structure:
[
  {
    "name": "Entity Name",
    "type": "person|organization|book|product|event|place",
    "description": "Brief description (1-2 sentences)",
    "image": "URL to image/logo if known",
    "title": "Job title (for people)",
    "role": "Role or position",
    "company": "Company name (for people)",
    "industry": "Industry/sector",
    "size": "Company size (for orgs)",
    "founded": "Year founded",
    "headquarters": "Location",
    "author": "Author name (for books)",
    "publisher": "Publisher (for books)",
    "year": "Publication year",
    "website": "Official website URL",
    "email": "Contact email if public",
    "twitter": "Twitter handle without @",
    "linkedin": "LinkedIn profile slug",
    "tags": ["relevant", "tags"]
  }
]

Return 10-20 relevant entities. Only include fields that are applicable and known.
Focus on well-known, verifiable entities. Return ONLY the JSON array, no other text.`;

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        {
          role: 'system',
          content: 'You are a research assistant that finds and structures information about entities. Always return valid JSON arrays only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    throw new Error(`Perplexity API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '[]';

  // Extract JSON from response
  try {
    // Try to find JSON array in the response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(content);
  } catch {
    console.error('Failed to parse Perplexity response:', content);
    return [];
  }
}

// POST /api/directory/search - Run a directory search
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, searchTerm, entityType = 'all' } = body;

    if (!projectId || !searchTerm) {
      return NextResponse.json(
        { success: false, error: 'projectId and searchTerm are required' },
        { status: 400 }
      );
    }

    // Create query record
    const queryId = Date.now().toString();
    const query: DirectoryQuery = {
      id: queryId,
      projectId,
      searchTerm,
      entityType,
      status: 'running',
      resultCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveDirectoryQuery(query);

    try {
      // Search for entities
      const rawEntities = await searchEntitiesWithPerplexity(searchTerm, entityType);

      // Convert to DirectoryEntity format
      const entities: DirectoryEntity[] = rawEntities.map((e, i) => ({
        id: `${queryId}-${i}`,
        projectId,
        queryId,
        type: e.type || 'organization',
        name: e.name,
        image: e.image,
        description: e.description,
        title: e.title,
        role: e.role,
        company: e.company,
        industry: e.industry,
        size: e.size,
        founded: e.founded,
        headquarters: e.headquarters,
        author: e.author,
        publisher: e.publisher,
        year: e.year,
        website: e.website,
        email: e.email,
        twitter: e.twitter,
        linkedin: e.linkedin,
        source: 'perplexity',
        tags: e.tags || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      // Save entities
      saveDirectoryEntities(entities);

      // Update query status
      const updatedQuery = {
        ...query,
        status: 'completed' as const,
        resultCount: entities.length,
        lastRun: new Date().toISOString(),
      };
      saveDirectoryQuery(updatedQuery);

      return NextResponse.json({
        success: true,
        data: {
          query: updatedQuery,
          entities,
        },
      });
    } catch (error) {
      // Update query with error
      saveDirectoryQuery({ ...query, status: 'failed' });
      throw error;
    }
  } catch (error) {
    console.error('Directory search error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Search failed' },
      { status: 500 }
    );
  }
}

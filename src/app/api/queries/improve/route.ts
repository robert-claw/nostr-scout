import { NextRequest, NextResponse } from 'next/server';
import { improveQuery } from '@/lib/crawler';
import { getProjectById } from '@/lib/projects';
import { SearchTarget } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, projectId, targets } = body as {
      query: string;
      projectId?: string;
      targets?: SearchTarget[];
    };

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Query is required' },
        { status: 400 }
      );
    }

    // Get project context if projectId provided
    let projectContext: string | undefined;
    if (projectId) {
      const project = await getProjectById(projectId);
      projectContext = project?.context;
    }

    // Improve the query using Perplexity
    const improvedQuery = await improveQuery(query, projectContext, targets);

    return NextResponse.json({
      success: true,
      data: {
        original: query,
        improved: improvedQuery,
      },
    });
  } catch (error) {
    console.error('Query improvement error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

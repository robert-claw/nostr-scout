import { NextRequest, NextResponse } from 'next/server';
import { getAllQueries, getQueriesByProject, createQuery } from '@/lib/queries';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    
    const queries = projectId 
      ? await getQueriesByProject(projectId)
      : await getAllQueries();
    
    return NextResponse.json({ success: true, data: queries });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.projectId || !body.searchTerm) {
      return NextResponse.json(
        { success: false, error: 'projectId and searchTerm are required' },
        { status: 400 }
      );
    }
    
    const query = await createQuery({
      projectId: body.projectId,
      searchTerm: body.searchTerm,
      improvedQuery: body.improvedQuery,
      targets: body.targets,  // SearchTarget[]
      sources: body.sources,  // SearchSource[]
    });
    
    return NextResponse.json({ success: true, data: query }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

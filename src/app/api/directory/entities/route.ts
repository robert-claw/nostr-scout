import { NextRequest, NextResponse } from 'next/server';
import { getDirectoryEntities } from '@/lib/directory';

// GET /api/directory/entities - List entities
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || undefined;
    const queryId = searchParams.get('queryId') || undefined;
    const type = searchParams.get('type') || undefined;

    const entities = getDirectoryEntities(projectId, queryId, type);

    return NextResponse.json({
      success: true,
      data: entities,
    });
  } catch (error) {
    console.error('Failed to get entities:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get entities' },
      { status: 500 }
    );
  }
}

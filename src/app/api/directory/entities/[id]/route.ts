import { NextRequest, NextResponse } from 'next/server';
import { getDirectoryEntity, saveDirectoryEntity, deleteDirectoryEntity } from '@/lib/directory';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/directory/entities/[id] - Get single entity
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const entity = getDirectoryEntity(id);

    if (!entity) {
      return NextResponse.json(
        { success: false, error: 'Entity not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: entity });
  } catch (error) {
    console.error('Failed to get entity:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get entity' },
      { status: 500 }
    );
  }
}

// PATCH /api/directory/entities/[id] - Update entity
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const entity = getDirectoryEntity(id);
    if (!entity) {
      return NextResponse.json(
        { success: false, error: 'Entity not found' },
        { status: 404 }
      );
    }

    const updated = saveDirectoryEntity({ ...entity, ...body });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Failed to update entity:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update entity' },
      { status: 500 }
    );
  }
}

// DELETE /api/directory/entities/[id] - Delete entity
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const success = deleteDirectoryEntity(id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Entity not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete entity:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete entity' },
      { status: 500 }
    );
  }
}

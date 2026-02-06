import { NextRequest, NextResponse } from 'next/server';
import { getAllLeads, getLeadsByProject, getLeadsByQuery, createLead } from '@/lib/leads';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const queryId = searchParams.get('queryId');
    const status = searchParams.get('status');
    
    let leads;
    if (queryId) {
      leads = await getLeadsByQuery(queryId);
    } else if (projectId) {
      leads = await getLeadsByProject(projectId);
    } else {
      leads = await getAllLeads();
    }
    
    // Filter by status if provided
    if (status) {
      leads = leads.filter(l => l.status === status);
    }
    
    return NextResponse.json({ success: true, data: leads });
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
    
    if (!body.queryId || !body.projectId || !body.url || !body.title) {
      return NextResponse.json(
        { success: false, error: 'queryId, projectId, url, and title are required' },
        { status: 400 }
      );
    }
    
    const lead = await createLead({
      queryId: body.queryId,
      projectId: body.projectId,
      url: body.url,
      title: body.title,
      description: body.description,
      emails: body.emails || [],
      source: body.source || 'manual',
    });
    
    return NextResponse.json({ success: true, data: lead }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
